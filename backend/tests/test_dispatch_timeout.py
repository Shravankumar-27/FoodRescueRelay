"""Dispatch timeout driven through the real worker tick (run_once), no sleeping.

Time is controlled by passing ``now`` into ``run_once``; offers are created by
the real rescue-creation endpoint, so the matching and dispatch path is real.
"""

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.enums import OfferStatus, RescueStatus
from app.models.offer import MatchOffer
from app.models.organization import Organization
from app.models.rescue import Rescue
from app.models.status_event import StatusEvent
from app.workers.dispatch_worker import run_once

HOPE = "Hope Community Kitchen"
CITYFOOD = "City Food Relief"
NO_CANDIDATES_REASON = "no_candidates_remaining"


def _org_id(db: Session, name: str) -> uuid.UUID:
    return db.scalar(select(Organization.id).where(Organization.name == name))


def _pending(db: Session, rescue_id: uuid.UUID) -> list[MatchOffer]:
    return list(
        db.scalars(
            select(MatchOffer)
            .where(MatchOffer.rescue_id == rescue_id, MatchOffer.status == OfferStatus.PENDING.value)
            .execution_options(populate_existing=True)
        ).all()
    )


def _all_offers(db: Session, rescue_id: uuid.UUID) -> list[MatchOffer]:
    return list(
        db.scalars(
            select(MatchOffer)
            .where(MatchOffer.rescue_id == rescue_id)
            .order_by(MatchOffer.rank)
            .execution_options(populate_existing=True)
        ).all()
    )


def _offer_by_id(db: Session, offer_id: uuid.UUID) -> MatchOffer:
    return db.scalar(
        select(MatchOffer).where(MatchOffer.id == offer_id).execution_options(populate_existing=True)
    )


def _rescue(db: Session, rescue_id: uuid.UUID) -> Rescue:
    return db.scalar(
        select(Rescue).where(Rescue.id == rescue_id).execution_options(populate_existing=True)
    )


def _last_event_reason(db: Session, rescue_id: uuid.UUID) -> str | None:
    return db.scalar(
        select(StatusEvent.reason)
        .where(StatusEvent.rescue_id == rescue_id)
        .order_by(StatusEvent.created_at.desc())
        .limit(1)
    )


def test_expired_offer_is_timed_out_and_next_candidate_gets_rank_2(
    create_rescue, db_session: Session
) -> None:
    data = create_rescue(uuid.uuid4().hex)
    rescue_id = uuid.UUID(data["id"])
    first = _pending(db_session, rescue_id)[0]
    first_id = first.id
    assert first.receiver_organization_id == _org_id(db_session, HOPE)

    # Tick well past the 120s offer timeout configured in conftest.
    db_session.rollback()
    processed = run_once(now=datetime.now(timezone.utc) + timedelta(minutes=10))
    assert processed >= 1

    timed_out = _offer_by_id(db_session, first_id)
    assert timed_out.status == OfferStatus.TIMED_OUT.value

    pending = _pending(db_session, rescue_id)
    assert len(pending) == 1
    assert pending[0].receiver_organization_id == _org_id(db_session, CITYFOOD)
    assert pending[0].rank == 2
    assert _rescue(db_session, rescue_id).status == RescueStatus.OFFERED.value


def test_timeout_with_no_next_candidate_does_not_leave_rescue_offered(
    create_rescue, db_session: Session
) -> None:
    data = create_rescue(uuid.uuid4().hex)
    rescue_id = uuid.UUID(data["id"])
    # Pickup window is ~50 minutes from creation, so both ticks below stay before it.
    first_tick = datetime.now(timezone.utc) + timedelta(minutes=10)
    second_tick = datetime.now(timezone.utc) + timedelta(minutes=20)

    # Tick 1: Hope times out, Cityfood (rank 2) receives the offer.
    db_session.rollback()
    run_once(now=first_tick)
    assert _rescue(db_session, rescue_id).status == RescueStatus.OFFERED.value

    # Tick 2: Cityfood times out too. Both receivers have now been offered.
    db_session.rollback()
    run_once(now=second_tick)

    offers = _all_offers(db_session, rescue_id)
    assert [o.receiver_organization_id for o in offers] == [
        _org_id(db_session, HOPE),
        _org_id(db_session, CITYFOOD),
    ]
    assert all(o.status == OfferStatus.TIMED_OUT.value for o in offers)
    assert _pending(db_session, rescue_id) == []

    # Actual behaviour: with no candidates left and the pickup window still open,
    # the rescue goes back to MATCHING (not stuck in OFFERED, not EXPIRED).
    rescue = _rescue(db_session, rescue_id)
    assert rescue.status == RescueStatus.MATCHING.value
    assert rescue.status != RescueStatus.OFFERED.value
    assert _last_event_reason(db_session, rescue_id) == NO_CANDIDATES_REASON


def test_non_expired_pending_offer_is_left_untouched_by_tick(
    create_rescue, db_session: Session
) -> None:
    data = create_rescue(uuid.uuid4().hex)
    rescue_id = uuid.UUID(data["id"])
    offer = _pending(db_session, rescue_id)[0]
    offer_id = offer.id
    receiver_id = offer.receiver_organization_id
    expires_at = offer.expires_at

    # Tick "now": the offer was just created with a 120s timeout, so it is not expired.
    db_session.rollback()
    run_once(now=datetime.now(timezone.utc))

    untouched = _offer_by_id(db_session, offer_id)
    assert untouched.status == OfferStatus.PENDING.value
    assert untouched.receiver_organization_id == receiver_id
    assert untouched.rank == 1
    assert untouched.expires_at == expires_at

    offers = _all_offers(db_session, rescue_id)
    assert len(offers) == 1
    assert _rescue(db_session, rescue_id).status == RescueStatus.OFFERED.value
