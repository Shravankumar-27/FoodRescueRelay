"""Offer dispatch: send a rescue to one receiver at a time, best match first.

At most one PENDING offer exists per rescue. When an offer is declined or
times out, the next feasible receiver that has not yet been offered this
rescue gets it. Matching is re-run at each step; it is deterministic, so the
ordering stays consistent without storing a queue.

Helpers flush but never commit; callers own the transaction.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import AppError
from app.models.base_types import new_uuid, utcnow
from app.models.handoff import Handoff
from app.models.enums import OfferStatus, RescueStatus
from app.models.offer import MatchOffer
from app.models.rescue import Rescue
from app.models.status_event import StatusEvent
from app.services.matching_service import CandidateResult, feasible_ranked, match_rescue
from app.services.rescue_helpers import ensure_utc
from app.services.status import lock_rescue, transition_rescue

MATCHING_STARTED_REASON = "matching_started"
OFFER_SENT_REASON = "offer_sent"
NO_FEASIBLE_REASON = "no_feasible_candidates"
NO_CANDIDATES_REASON = "no_candidates_remaining"
PICKUP_WINDOW_ENDED_REASON = "pickup_window_ended"


def _now(now: datetime | None) -> datetime:
    return ensure_utc(now) if now is not None else utcnow()


def _pending_offers(db: Session, rescue_id: uuid.UUID) -> list[MatchOffer]:
    return list(
        db.scalars(
            select(MatchOffer).where(
                MatchOffer.rescue_id == rescue_id,
                MatchOffer.status == OfferStatus.PENDING.value,
            )
        ).all()
    )


def _has_pending(db: Session, rescue_id: uuid.UUID) -> bool:
    return bool(_pending_offers(db, rescue_id))


def _offered_org_ids(db: Session, rescue_id: uuid.UUID) -> set[uuid.UUID]:
    return set(
        db.scalars(
            select(MatchOffer.receiver_organization_id).where(MatchOffer.rescue_id == rescue_id)
        ).all()
    )


def _last_event_reason(db: Session, rescue_id: uuid.UUID) -> str | None:
    return db.scalar(
        select(StatusEvent.reason)
        .where(StatusEvent.rescue_id == rescue_id)
        .order_by(StatusEvent.created_at.desc())
        .limit(1)
    )


def add_dispatch_event(db: Session, rescue: Rescue, status: RescueStatus, reason: str, now: datetime | None = None) -> None:
    db.add(
        StatusEvent(
            rescue_id=rescue.id,
            actor_user_id=None,
            from_status=status.value,
            to_status=status.value,
            reason=reason,
            created_at=_now(now),
        )
    )


def _create_offer(
    db: Session,
    rescue: Rescue,
    result: CandidateResult,
    rank: int,
    now: datetime,
) -> MatchOffer:
    if _has_pending(db, rescue.id):
        raise AppError("OFFER_ALREADY_PENDING", "This rescue already has an open offer.", 409)
    timeout = get_settings().DISPATCH_OFFER_TIMEOUT_SECONDS
    offer = MatchOffer(
        id=new_uuid(),
        rescue_id=rescue.id,
        receiver_organization_id=result.receiver_organization_id,
        rank=rank,
        score=result.score,
        proximity_score=result.factors["proximity"],
        urgency_score=result.factors["urgency"],
        need_score=result.factors["need"],
        reliability_score=result.factors["reliability"],
        fairness_score=result.factors["fairness"],
        estimated_distance_km=result.distance_km,
        estimated_travel_minutes=result.travel_minutes,
        status=OfferStatus.PENDING.value,
        offered_at=now,
        expires_at=min(now + timedelta(seconds=timeout), ensure_utc(rescue.pickup_by)),
        created_at=now,
    )
    db.add(offer)
    db.flush()
    return offer


def _next_candidate(db: Session, rescue: Rescue, now: datetime) -> tuple[int, CandidateResult] | None:
    """Return (1-based rank in the current feasible list, result) for the best
    feasible receiver that has never been offered this rescue, or None."""
    ranked = feasible_ranked(match_rescue(db, rescue.id, now))
    offered = _offered_org_ids(db, rescue.id)
    for position, result in enumerate(ranked, start=1):
        if result.receiver_organization_id not in offered:
            return position, result
    return None


def start_dispatch(db: Session, rescue: Rescue, now: datetime | None = None) -> int:
    """Begin dispatch for a POSTED or MATCHING rescue. Returns 1 if an offer was created."""
    current = _now(now)
    status = RescueStatus(rescue.status)
    if status not in (RescueStatus.POSTED, RescueStatus.MATCHING):
        return 0
    if ensure_utc(rescue.pickup_by) <= current:
        transition_rescue(db, rescue, RescueStatus.EXPIRED, None, reason=PICKUP_WINDOW_ENDED_REASON, now=current)
        return 0
    if _has_pending(db, rescue.id):
        return 0

    candidate = _next_candidate(db, rescue, current)
    if status is RescueStatus.POSTED:
        transition_rescue(db, rescue, RescueStatus.MATCHING, None, reason=MATCHING_STARTED_REASON, now=current)

    if candidate is None:
        if _last_event_reason(db, rescue.id) not in (NO_FEASIBLE_REASON, NO_CANDIDATES_REASON):
            add_dispatch_event(db, rescue, RescueStatus.MATCHING, NO_FEASIBLE_REASON, current)
        return 0

    rank, result = candidate
    _create_offer(db, rescue, result, rank, current)
    transition_rescue(db, rescue, RescueStatus.OFFERED, None, reason=OFFER_SENT_REASON, now=current)
    return 1


def offer_replacement(db: Session, rescue: Rescue, receiver_id: uuid.UUID, now: datetime) -> None:
    if rescue.status not in ("MATCHING", "OFFERED") or ensure_utc(rescue.pickup_by) <= now:
        raise AppError("REPLACEMENT_UNAVAILABLE", "This rescue is no longer open for reassignment.", 409)
    declined = db.scalar(select(MatchOffer.id).where(
        MatchOffer.rescue_id == rescue.id, MatchOffer.receiver_organization_id == receiver_id,
        MatchOffer.status == OfferStatus.DECLINED.value,
    ).limit(1))
    ranked = feasible_ranked(match_rescue(db, rescue.id, now))
    chosen = next(((rank, candidate) for rank, candidate in enumerate(ranked, 1)
                   if candidate.receiver_organization_id == receiver_id), None)
    if declined or chosen is None:
        raise AppError("RECEIVER_UNAVAILABLE", "That receiver can no longer take this donation. Choose another partner.", 409)
    if any(offer.receiver_organization_id == receiver_id and ensure_utc(offer.expires_at) > now
           for offer in _pending_offers(db, rescue.id)):
        return
    cancel_pending_offers(db, rescue.id)
    rank, candidate = chosen
    _create_offer(db, rescue, candidate, rank, now)
    if rescue.status == "MATCHING":
        transition_rescue(db, rescue, RescueStatus.OFFERED, None, reason=OFFER_SENT_REASON)
    else:
        add_dispatch_event(db, rescue, RescueStatus.OFFERED, OFFER_SENT_REASON)


def dispatch_next(db: Session, rescue: Rescue, now: datetime | None = None) -> None:
    """Offer the rescue to the next receiver, or leave it MATCHING / EXPIRED."""
    current = _now(now)
    if RescueStatus(rescue.status) is not RescueStatus.OFFERED:
        return
    if _has_pending(db, rescue.id):
        return

    if ensure_utc(rescue.pickup_by) <= current:
        transition_rescue(db, rescue, RescueStatus.EXPIRED, None, reason=PICKUP_WINDOW_ENDED_REASON, now=current)
        return

    found = _next_candidate(db, rescue, current)
    if found is not None:
        rank, result = found
        _create_offer(db, rescue, result, rank, current)
        return

    # Dispatch finishes after any escalation events recorded in the same tick.
    transition_rescue(
        db, rescue, RescueStatus.MATCHING, None, reason=NO_CANDIDATES_REASON,
        now=current + timedelta(microseconds=1),
    )


def check_in_due(rescue, offer):
    claimed = ensure_utc(offer.claimed_at)
    pickup = ensure_utc(rescue.pickup_by)
    return min(claimed + timedelta(minutes=10), claimed + (pickup - claimed) / 2)


def _release_late_claim(db, rescue, current):
    if rescue.on_the_way_at is not None:
        return
    offer = db.scalar(select(MatchOffer).where(
        MatchOffer.rescue_id == rescue.id, MatchOffer.status == OfferStatus.ACCEPTED.value,
    ))
    if offer is None or offer.claimed_at is None or current < check_in_due(rescue, offer):
        return
    offer.status = OfferStatus.DECLINED.value
    handoff = db.scalar(select(Handoff).where(Handoff.rescue_id == rescue.id))
    if handoff:
        handoff.pickup_code_hash = None
        handoff.pickup_code_display = None
        handoff.pickup_code_expires_at = current
    transition_rescue(db, rescue, RescueStatus.MATCHING, None, reason="claim_auto_released", now=current)
    db.flush()


def _escalate(db, rescue, current):
    posted = ensure_utc(rescue.created_at)
    window = ensure_utc(rescue.pickup_by) - posted
    progress = (current - posted) / window
    stage = rescue.escalation_stage or 0
    if stage < 1 and progress >= 0.40:
        rescue.escalation_stage = 1
        add_dispatch_event(db, rescue, RescueStatus(rescue.status), "radius_widened_volunteer_alert", current)
        # Preserve the sequential offer invariant and give the next ranked partner a turn.
        next_candidate = _next_candidate(db, rescue, current)
        if next_candidate:
            cancel_pending_offers(db, rescue.id)
            rank, result = next_candidate
            _create_offer(db, rescue, result, rank, current)
            if rescue.status == RescueStatus.POSTED.value:
                transition_rescue(db, rescue, RescueStatus.MATCHING, None, reason=MATCHING_STARTED_REASON, now=current)
            if rescue.status == RescueStatus.MATCHING.value:
                transition_rescue(db, rescue, RescueStatus.OFFERED, None, reason=OFFER_SENT_REASON, now=current)
            add_dispatch_event(db, rescue, RescueStatus.OFFERED, "next_receiver_notified", current)
    if stage < 2 and progress >= 0.70:
        rescue.escalation_stage = 2
        add_dispatch_event(db, rescue, RescueStatus(rescue.status), "urgent_window", current)


def advance_expired_offers(db: Session, now: datetime | None = None, *, rescue_id=None, donor_org_id=None, receiver_org_id=None) -> int:
    """Time out PENDING offers whose expiry has passed and dispatch onward.

    Returns the number of offers processed.
    """
    current = _now(now)
    expired_offers = select(MatchOffer.rescue_id).where(
        MatchOffer.status == OfferStatus.PENDING.value, MatchOffer.expires_at <= current
    )
    active_statuses = ("POSTED", "MATCHING", "OFFERED", "CLAIMED")
    query = select(Rescue.id).where(
        Rescue.status.in_(active_statuses),
        or_(Rescue.status.in_(("POSTED", "MATCHING")), Rescue.pickup_by <= current, Rescue.id.in_(expired_offers), Rescue.consume_by.is_not(None)),
    )
    # A detail/history read need not dispatch unrelated organizations' rescues.
    # The worker and discovery endpoints still sweep the entire active queue.
    if rescue_id is not None:
        query = query.where(Rescue.id == rescue_id)
    if donor_org_id is not None:
        query = query.where(Rescue.donor_organization_id == donor_org_id)
    if receiver_org_id is not None:
        query = query.where(Rescue.id.in_(select(MatchOffer.rescue_id).where(MatchOffer.receiver_organization_id == receiver_org_id)))
    rescue_ids = db.scalars(query.order_by(Rescue.id)).all()
    processed = 0
    for rescue_id in rescue_ids:
        rescue = lock_rescue(db, rescue_id)
        if rescue is None or rescue.status not in active_statuses:
            continue
        expired = [offer for offer in _pending_offers(db, rescue.id) if ensure_utc(offer.expires_at) <= current]
        for offer in expired:
            offer.status = OfferStatus.TIMED_OUT.value
        if expired:
            processed += len(expired)
            db.flush()
        if rescue.consume_by is not None and rescue.status == "CLAIMED":
            _release_late_claim(db, rescue, current)
        if rescue.consume_by is not None and rescue.status != "CLAIMED" and current < ensure_utc(rescue.pickup_by):
            _escalate(db, rescue, current)
        if ensure_utc(rescue.pickup_by) <= current:
            cancel_pending_offers(db, rescue.id)
            transition_rescue(db, rescue, RescueStatus.EXPIRED, None, reason=PICKUP_WINDOW_ENDED_REASON, now=current)
        elif rescue.status == RescueStatus.OFFERED.value and expired:
            dispatch_next(db, rescue, current)
        elif rescue.status in ("POSTED", "MATCHING"):
            start_dispatch(db, rescue, current)
        db.flush()
    return processed


def decline_offer(
    db: Session,
    offer: MatchOffer,
    actor_user_id: uuid.UUID | None,
    now: datetime | None = None,
) -> None:
    """Mark a PENDING offer DECLINED and dispatch to the next receiver.

    ``actor_user_id`` is accepted for the caller's audit trail; offers have no
    actor column, so it is not stored here. Authorisation is the caller's job.
    """
    if offer.status != OfferStatus.PENDING.value:
        raise AppError("OFFER_NOT_PENDING", "This offer is no longer open.", 409)
    rescue = db.get(Rescue, offer.rescue_id)
    if rescue is None:
        raise AppError("RESCUE_NOT_FOUND", "Rescue was not found.", 404)

    offer.status = OfferStatus.DECLINED.value
    db.flush()
    dispatch_next(db, rescue, _now(now))


def cancel_pending_offers(db: Session, rescue_id: uuid.UUID) -> int:
    """Set every PENDING offer for the rescue to CANCELLED. Returns the count."""
    offers = _pending_offers(db, rescue_id)
    for offer in offers:
        offer.status = OfferStatus.CANCELLED.value
    db.flush()
    return len(offers)
