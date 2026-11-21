"""Receiver pickup and delivery: code-verified collection and delivery recording."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.models.base_types import new_uuid
from app.models.enums import OfferStatus, RescueStatus
from app.models.handoff import Handoff
from app.models.impact import ImpactRecord
from app.models.offer import MatchOffer
from app.models.rescue import Rescue
from app.models.user import User
from app.services.handoff_service import verify_pickup_code
from app.services.status import transition_rescue
from app.services.rescue_helpers import ensure_utc

IMPACT_CALCULATION_VERSION = "v1"


def _require_accepted_receiver(db: Session, rescue: Rescue, receiver_user: User) -> None:
    """Only the receiver organization holding the ACCEPTED offer may act on the rescue."""
    accepted = db.scalar(
        select(MatchOffer.id).where(
            MatchOffer.rescue_id == rescue.id,
            MatchOffer.receiver_organization_id == receiver_user.organization_id,
            MatchOffer.status == OfferStatus.ACCEPTED.value,
        ).limit(1)
    )
    if accepted is None:
        raise AppError("RESCUE_NOT_FOUND", "Rescue was not found.", 404)


def _load_handoff(db: Session, rescue: Rescue) -> Handoff:
    handoff = db.scalar(select(Handoff).where(Handoff.rescue_id == rescue.id))
    if handoff is None:
        raise AppError("HANDOFF_NOT_FOUND", "This rescue has no pickup record.", 409)
    return handoff


def _impact_for(db: Session, rescue: Rescue) -> ImpactRecord | None:
    return db.scalar(select(ImpactRecord).where(ImpactRecord.rescue_id == rescue.id))


def collect_rescue(
    db: Session,
    rescue: Rescue,
    receiver_user: User,
    collected_servings: int,
    pickup_code: str,
    now: datetime,
) -> Handoff:
    """Verify the pickup code and mark the rescue COLLECTED. Commits.

    On a wrong code the failed attempt is committed before AppError is raised.
    """
    _require_accepted_receiver(db, rescue, receiver_user)
    if rescue.status == RescueStatus.CLAIMED.value and ensure_utc(rescue.pickup_by) <= ensure_utc(now):
        transition_rescue(db, rescue, RescueStatus.EXPIRED, None, reason="pickup_window_ended")
        db.commit()
        raise AppError("PICKUP_WINDOW_ENDED", "The pickup deadline has passed. Do not collect this food.", 409)
    if rescue.status != RescueStatus.CLAIMED.value:
        raise AppError("INVALID_STATUS_TRANSITION", "This rescue is not ready for pickup.", 409)
    if not 1 <= collected_servings <= rescue.total_servings:
        raise AppError("INVALID_QUANTITY", "Collected servings cannot exceed the posted total.", 422)

    handoff = _load_handoff(db, rescue)
    if not verify_pickup_code(handoff, pickup_code, now):
        db.commit()
        raise AppError("PICKUP_CODE_INVALID", "That pickup code is incorrect.", 400)

    handoff.collected_servings = collected_servings
    handoff.collected_at = now
    transition_rescue(db, rescue, RescueStatus.COLLECTED, receiver_user.id)
    db.commit()
    return handoff


def deliver_rescue(
    db: Session,
    rescue: Rescue,
    receiver_user: User,
    delivered_servings: int,
    rejected_servings: int,
    now: datetime,
) -> ImpactRecord:
    """Record delivered and rejected servings and create the impact record. Commits.

    Idempotent: a rescue that is already DELIVERED returns its existing impact
    record without changing anything.
    """
    _require_accepted_receiver(db, rescue, receiver_user)
    if rescue.status == RescueStatus.DELIVERED.value:
        existing = _impact_for(db, rescue)
        if existing is None:
            raise AppError("INVALID_STATUS_TRANSITION", "This rescue cannot move to that status.", 409)
        return existing
    if rescue.status != RescueStatus.COLLECTED.value:
        raise AppError("INVALID_STATUS_TRANSITION", "This rescue is not ready for delivery.", 409)
    if delivered_servings < 0 or rejected_servings < 0:
        raise AppError("INVALID_QUANTITY", "Servings cannot be negative.", 422)

    handoff = _load_handoff(db, rescue)
    if delivered_servings + rejected_servings > (handoff.collected_servings or 0):
        raise AppError(
            "INVALID_QUANTITY",
            "Delivered and rejected servings cannot exceed the collected total.",
            422,
        )

    handoff.delivered_servings = delivered_servings
    handoff.rejected_servings = rejected_servings
    handoff.delivered_at = now
    transition_rescue(db, rescue, RescueStatus.DELIVERED, receiver_user.id)

    impact = ImpactRecord(
        id=new_uuid(),
        rescue_id=rescue.id,
        donor_organization_id=rescue.donor_organization_id,
        receiver_organization_id=receiver_user.organization_id,
        delivered_servings=delivered_servings,
        confirmed_kg=None,
        calculation_version=IMPACT_CALCULATION_VERSION,
        created_at=now,
    )
    try:
        # The unique rescue_id constraint prevents a second impact record.
        with db.begin_nested():
            db.add(impact)
    except IntegrityError:
        # A concurrent delivery already wrote the record: discard this attempt.
        db.rollback()
        existing = _impact_for(db, rescue)
        if existing is None:
            raise
        return existing
    from app.services.trust_service import compute_trust_scores
    compute_trust_scores(db)
    db.commit()
    return impact
