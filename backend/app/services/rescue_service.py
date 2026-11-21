"""Rescue creation, safety-gate validation and donor/receiver read models."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.models.base_types import new_uuid, utcnow
from app.models.enums import DietaryType, HandlingType, OfferStatus, RescueStatus, UserRole
from app.models.impact import ImpactRecord
from app.models.offer import MatchOffer
from app.models.organization import Organization
from app.models.rescue import FoodItem, Rescue
from app.models.status_event import StatusEvent
from app.models.user import User
from app.schemas.rescue import FoodItemIn, RescueCreate
from app.services.dispatch_service import start_dispatch
from app.services.rescue_helpers import ensure_utc, new_display_id, seconds_remaining
from app.services.status import transition_rescue

logger = logging.getLogger(__name__)

SAFETY_NOTICE = (
    "Handling information provided by donor. Receiver must independently verify "
    "suitability before accepting or distributing the food."
)
ALLERGEN_NOTICE = (
    "Allergen information unavailable. Receiver must independently assess suitability."
)
DISPLAY_ID_ATTEMPTS = 5
MATCHING_ERROR_REASON = "matching_error"
_VEG_TYPES = frozenset({DietaryType.VEG.value, DietaryType.VEGAN.value, DietaryType.JAIN.value, DietaryType.RAW_VEGAN.value})


def iso_utc(dt: datetime | None) -> str | None:
    return ensure_utc(dt).isoformat() if dt is not None else None


def derive_dietary_type(types: list[str]) -> str:
    """Summarise item dietary types for the whole rescue."""
    if DietaryType.NON_VEG.value in types:
        return DietaryType.NON_VEG.value
    if types and all(t in _VEG_TYPES for t in types):
        return DietaryType.VEG.value
    if not types or all(t == DietaryType.UNKNOWN.value for t in types):
        return DietaryType.UNKNOWN.value
    return DietaryType.OTHER.value


def food_item_out(item: FoodItem) -> dict[str, Any]:
    return {
        "name": item.name,
        "quantity_servings": item.quantity_servings,
        "dietary_type": item.dietary_type,
        "food_category": getattr(item, "food_category", "COOKED_MEAL"),
        "allergens": list(item.allergens or []),
        "allergen_info_unknown": item.allergen_info_unknown,
    }


def _validate(payload: RescueCreate, now: datetime, prepared_at: datetime, pickup_by: datetime) -> int:
    if not payload.food_items:
        raise AppError("NO_FOOD_ITEMS", "Add at least one food item.", 422)
    if any(item.quantity_servings <= 0 for item in payload.food_items):
        raise AppError("INVALID_QUANTITY", "Quantities must be greater than zero.", 422)
    if payload.served_or_mixed_with_waste or not payload.untouched_confirmed:
        raise AppError(
            "FOOD_NOT_ELIGIBLE",
            "This listing cannot be posted because the surplus was served to guests or "
            "mixed with waste. RescueRelay only redistributes untouched food.",
            422,
        )
    if not payload.safety_attestation:
        raise AppError(
            "SAFETY_ATTESTATION_REQUIRED",
            "Please confirm the handling attestation before posting.",
            422,
        )
    if payload.handling_type is HandlingType.UNKNOWN:
        raise AppError("HANDLING_INFO_REQUIRED", "Select the current holding condition.", 422)
    if pickup_by <= now:
        raise AppError("PICKUP_IN_PAST", "The pickup deadline must be in the future.", 422)
    if prepared_at > now:
        raise AppError("PREPARED_IN_FUTURE", "Preparation time cannot be in the future.", 422)
    if pickup_by <= prepared_at:
        raise AppError(
            "PICKUP_BEFORE_PREPARED",
            "Pickup deadline must be after the food was prepared.",
            422,
        )
    total = sum(item.quantity_servings for item in payload.food_items)
    if total <= 0:
        raise AppError("INVALID_QUANTITY", "Quantities must be greater than zero.", 422)
    return total


def _unique_display_id(db: Session) -> str:
    for _ in range(DISPLAY_ID_ATTEMPTS):
        candidate = new_display_id()
        exists = db.scalar(select(Rescue.id).where(Rescue.display_id == candidate))
        if exists is None:
            return candidate
    raise AppError("DISPLAY_ID_FAILED", "Could not create a rescue code. Please try again.", 500)


def _build_food_items(payload: RescueCreate, current: datetime) -> list[FoodItem]:
    items: list[FoodItem] = []
    for raw in payload.food_items:
        item: FoodItemIn = raw
        items.append(
            FoodItem(
                id=new_uuid(),
                name=item.name,
                quantity_servings=item.quantity_servings,
                dietary_type=item.dietary_type.value,
                food_category=item.food_category.value if hasattr(item, "food_category") else "COOKED_MEAL",
                allergens=list(item.allergens),
                allergen_info_unknown=item.allergen_info_unknown,
                created_at=current,
            )
        )
    return items


def create_rescue(
    db: Session,
    donor_user: User,
    payload: RescueCreate,
    now: datetime | None = None,
) -> tuple[Rescue, bool, bool]:
    """Create a rescue and start matching.

    Returns (rescue, created, matching_error). When an existing rescue has the
    same idempotency key for this donor, it is returned unchanged with
    created=False and the payload is not re-validated.
    Caller commits.
    """
    existing = db.scalar(
        select(Rescue).where(
            Rescue.donor_organization_id == donor_user.organization_id,
            Rescue.idempotency_key == payload.idempotency_key,
        )
    )
    if existing is not None:
        return existing, False, False

    current = ensure_utc(now) if now is not None else utcnow()
    prepared_at = ensure_utc(payload.prepared_at)
    pickup_by = ensure_utc(payload.pickup_by)
    total = _validate(payload, current, prepared_at, pickup_by)

    org: Organization = donor_user.organization
    if org.verification_status != "VERIFIED":
        raise AppError("DONOR_NOT_VERIFIED", "Your organization must be verified before posting surplus.", 403)
    food_items = _build_food_items(payload, current)
    notes = payload.handling_notes.strip() if payload.handling_notes else None
    dietary = derive_dietary_type([item.dietary_type for item in food_items])

    rescue = Rescue(
        id=new_uuid(),
        display_id=_unique_display_id(db),
        donor_organization_id=org.id,
        status=RescueStatus.POSTED.value,
        prepared_at=prepared_at,
        pickup_by=pickup_by,
        handling_type=payload.handling_type.value,
        handling_notes=notes or None,
        untouched_confirmed=payload.untouched_confirmed,
        packaging_available=payload.packaging_available,
        safety_attestation=payload.safety_attestation,
        latitude=payload.latitude if payload.latitude is not None else org.latitude,
        longitude=payload.longitude if payload.longitude is not None else org.longitude,
        private_address=payload.private_address or org.private_address or "",
        locality=payload.locality or org.locality,
        total_servings=total,
        dietary_type=dietary,
        idempotency_key=payload.idempotency_key,
        created_at=current,
        updated_at=current,
    )
    rescue.food_items = food_items
    db.add(rescue)
    db.flush()

    db.add(
        StatusEvent(
            rescue_id=rescue.id,
            actor_user_id=donor_user.id,
            from_status=None,
            to_status=RescueStatus.POSTED.value,
            reason=None,
            created_at=current,
        )
    )
    db.flush()

    transition_rescue(db, rescue, RescueStatus.MATCHING, donor_user.id)

    matching_error = False
    try:
        with db.begin_nested():
            start_dispatch(db, rescue, current)
    except Exception as exc:  # noqa: BLE001 - recorded, not propagated to donor
        matching_error = True
        logger.error("Dispatch failed during rescue creation: %s", type(exc).__name__)
        db.add(
            StatusEvent(
                rescue_id=rescue.id,
                actor_user_id=None,
                from_status=RescueStatus.MATCHING.value,
                to_status=RescueStatus.MATCHING.value,
                reason=MATCHING_ERROR_REASON,
                created_at=utcnow(),
            )
        )
        db.flush()

    return rescue, True, matching_error


def _role(user: User) -> str:
    return str(user.role.value if hasattr(user.role, "value") else user.role)


def is_donor_owner(viewer: User, rescue: Rescue) -> bool:
    return _role(viewer) == UserRole.DONOR.value and viewer.organization_id == rescue.donor_organization_id


def is_admin(viewer: User) -> bool:
    return _role(viewer) == UserRole.ADMIN.value


def _accepted_offer(db: Session, rescue: Rescue) -> MatchOffer | None:
    return db.scalar(
        select(MatchOffer).where(
            MatchOffer.rescue_id == rescue.id,
            MatchOffer.status == OfferStatus.ACCEPTED.value,
        )
    )


def has_offer_for_org(db: Session, rescue_id: uuid.UUID, org_id: uuid.UUID) -> bool:
    return (
        db.scalar(
            select(MatchOffer.id).where(
                MatchOffer.rescue_id == rescue_id,
                MatchOffer.receiver_organization_id == org_id,
            ).limit(1)
        )
        is not None
    )


def can_view_rescue(db: Session, viewer: User, rescue: Rescue) -> bool:
    if is_admin(viewer):
        return True
    if viewer.organization_id == rescue.donor_organization_id:
        return True
    if _role(viewer) == UserRole.RECEIVER.value:
        if has_offer_for_org(db, rescue.id, viewer.organization_id):
            return True
        if rescue.status in (RescueStatus.POSTED.value, RescueStatus.MATCHING.value, RescueStatus.OFFERED.value):
            from app.services.matching_service import match_rescue
            return any(c.feasible and c.receiver_organization_id == viewer.organization_id for c in match_rescue(db, rescue.id))
        claimed = _accepted_offer(db, rescue)
        if claimed and claimed.receiver_organization_id == viewer.organization_id:
            return True
    return False


def rescue_detail(db: Session, rescue: Rescue, viewer: User, now: datetime | None = None) -> dict[str, Any]:
    current = ensure_utc(now) if now is not None else utcnow()
    donor_org = db.get(Organization, rescue.donor_organization_id)
    owner_view = is_donor_owner(viewer, rescue) or is_admin(viewer)
    claimed_offer = _accepted_offer(db, rescue)
    receiver_claimed = (
        _role(viewer) == UserRole.RECEIVER.value
        and claimed_offer is not None
        and claimed_offer.receiver_organization_id == viewer.organization_id
    )

    food_items = list(rescue.food_items)
    data: dict[str, Any] = {
        "id": str(rescue.id),
        "display_id": rescue.display_id,
        "status": rescue.status,
        "prepared_at": iso_utc(rescue.prepared_at),
        "pickup_by": iso_utc(rescue.pickup_by),
        "seconds_remaining": seconds_remaining(rescue.pickup_by, current),
        "handling_type": rescue.handling_type,
        "handling_notes": rescue.handling_notes,
        "packaging_available": rescue.packaging_available,
        "untouched_confirmed": rescue.untouched_confirmed,
        "total_servings": rescue.total_servings,
        "dietary_type": rescue.dietary_type,
        "locality": rescue.locality,
        "food_items": [food_item_out(item) for item in food_items],
        "allergen_notice": (
            ALLERGEN_NOTICE if any(item.allergen_info_unknown for item in food_items) else None
        ),
        "safety_notice": SAFETY_NOTICE,
        "created_at": iso_utc(rescue.created_at),
        "collected_servings": rescue.handoff.collected_servings if (owner_view or receiver_claimed) and rescue.handoff else None,
    }

    if owner_view or receiver_claimed:
        data["donor_organization_name"] = donor_org.name if donor_org else None

    if receiver_claimed:
        data["private_address"] = rescue.private_address
        data["latitude"] = rescue.latitude
        data["longitude"] = rescue.longitude
        data["donor_phone"] = donor_org.private_phone if donor_org else None

    if owner_view:
        data["private_address"] = rescue.private_address
        data["latitude"] = rescue.latitude
        data["longitude"] = rescue.longitude
        data["status_events"] = _status_events(rescue)
        if claimed_offer is not None:
            receiver_org = db.get(Organization, claimed_offer.receiver_organization_id)
            data["claimed_receiver"] = {
                "name": receiver_org.name if receiver_org else None,
                "locality": receiver_org.locality if receiver_org else None,
            }
        else:
            data["claimed_receiver"] = None
        # Lazy import: the pickup-code helper depends on the handoff table.
        from app.services.handoff_service import get_pickup_code_for_donor

        # Only the owning donor sees the pickup code (admins never do). The helper
        # itself only returns a code while CLAIMED or COLLECTED.
        if is_donor_owner(viewer, rescue):
            data["pickup_code"] = get_pickup_code_for_donor(db, rescue)
    elif receiver_claimed:
        data["status_events"] = _status_events(rescue)

    if (owner_view or receiver_claimed) and rescue.status == RescueStatus.DELIVERED.value and rescue.impact is not None:
        handoff = rescue.handoff
        minutes_to_delivery = None
        if handoff is not None and handoff.delivered_at is not None:
            elapsed = ensure_utc(handoff.delivered_at) - ensure_utc(rescue.created_at)
            minutes_to_delivery = round(elapsed.total_seconds() / 60, 1)
        data["impact"] = {
            "delivered_servings": rescue.impact.delivered_servings,
            "rejected_servings": handoff.rejected_servings if handoff is not None else None,
            "collected_servings": handoff.collected_servings if handoff is not None else None,
            "confirmed_kg": rescue.impact.confirmed_kg,
            "minutes_to_delivery": minutes_to_delivery,
        }
    elif "impact" not in data:
        data["impact"] = None
    return data


def _status_events(rescue: Rescue) -> list[dict[str, Any]]:
    return [
        {
            "from_status": event.from_status,
            "to_status": event.to_status,
            "reason": event.reason,
            "created_at": iso_utc(event.created_at),
        }
        for event in rescue.status_events
    ]


def delivered_servings_for(db: Session, rescue_ids: list[uuid.UUID]) -> dict[uuid.UUID, int]:
    if not rescue_ids:
        return {}
    rows = db.execute(
        select(ImpactRecord.rescue_id, ImpactRecord.delivered_servings).where(
            ImpactRecord.rescue_id.in_(rescue_ids)
        )
    ).all()
    return {rescue_id: servings for rescue_id, servings in rows}
