"""Matching rules, checked directly against the seeded database via match_rescue."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.enums import VerificationStatus
from app.models.organization import Organization
from app.models.receiver_capacity import ReceiverCapacity
from app.services.matching_service import feasible_ranked, match_rescue

HOPE = "Hope Community Kitchen"
SHELTER = "ShelterServe"
CITYFOOD = "City Food Relief"


def _match(db: Session, rescue_id: uuid.UUID):
    return match_rescue(db, rescue_id, datetime.now(timezone.utc))


def _by_name(results):
    return {r.receiver_name: r for r in results}


def _org(db: Session, name: str) -> Organization:
    org = db.scalar(select(Organization).where(Organization.name == name))
    assert org is not None
    return org


def test_closest_feasible_receiver_ranked_first(create_rescue, db_session: Session) -> None:
    data = create_rescue(uuid.uuid4().hex)
    results = _match(db_session, uuid.UUID(data["id"]))
    ranked = feasible_ranked(results)
    assert ranked[0].receiver_name == HOPE
    assert CITYFOOD in [r.receiver_name for r in ranked]

    shelter = _by_name(results)[SHELTER]
    assert shelter.feasible is False
    assert any(reason.startswith("Capacity") for reason in shelter.rejection_reasons)


def test_unverified_receiver_is_excluded(create_rescue, db_session: Session) -> None:
    data = create_rescue(uuid.uuid4().hex)
    rescue_id = uuid.UUID(data["id"])
    hope = _org(db_session, HOPE)
    try:
        hope.verification_status = VerificationStatus.PENDING.value
        db_session.flush()
        hope_result = _by_name(_match(db_session, rescue_id))[HOPE]
        assert hope_result.feasible is False
        assert "Receiver is not verified" in hope_result.rejection_reasons
    finally:
        db_session.rollback()


def test_unavailable_receiver_is_excluded(create_rescue, db_session: Session) -> None:
    data = create_rescue(uuid.uuid4().hex)
    rescue_id = uuid.UUID(data["id"])
    capacity = db_session.scalar(
        select(ReceiverCapacity).where(ReceiverCapacity.organization_id == _org(db_session, HOPE).id)
    )
    assert capacity is not None
    try:
        capacity.available = False
        db_session.flush()
        hope_result = _by_name(_match(db_session, rescue_id))[HOPE]
        assert hope_result.feasible is False
        assert "Receiver is currently unavailable" in hope_result.rejection_reasons
    finally:
        db_session.rollback()


def test_insufficient_capacity_is_excluded(create_rescue, db_session: Session) -> None:
    data = create_rescue(uuid.uuid4().hex)
    results = _by_name(_match(db_session, uuid.UUID(data["id"])))
    assert results[SHELTER].feasible is False
    assert any("Capacity" in reason for reason in results[SHELTER].rejection_reasons)


def test_impossible_travel_rejects_every_receiver(create_rescue, db_session: Session) -> None:
    data = create_rescue(uuid.uuid4().hex, pickup_minutes=5)
    results = _match(db_session, uuid.UUID(data["id"]))
    assert results, "expected candidate results"
    for result in results:
        assert result.feasible is False, result.receiver_name
        assert any("Cannot reach" in reason for reason in result.rejection_reasons), result.receiver_name
