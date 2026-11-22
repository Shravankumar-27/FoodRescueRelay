"""Receiver capacity routes: what a receiving organization can currently accept."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy import select, update

from app.api.deps import DbSession, require_roles
from app.api.responses import ok
from app.core.errors import AppError
from app.models.base_types import new_uuid, utcnow
from app.models.enums import NeedLevel, OrganizationType, UserRole, DietaryType, FoodCategory
from app.models.organization import Organization
from app.models.receiver_capacity import ReceiverCapacity
from app.models.user import User
from app.services import geo
from app.services.rescue_service import iso_utc
from app.services.capacity_service import reserved_servings, reserved_servings_by_org

router = APIRouter(prefix="/receivers", tags=["receivers"])


class CapacityUpdate(BaseModel):
    available: bool
    max_servings: int = Field(ge=0, le=100000)
    available_servings: int = Field(ge=0, le=100000)
    accepts_veg: bool
    accepts_non_veg: bool
    transport_available: bool
    containers_available: bool | None = None
    refrigeration_available: bool | None = None
    volunteer_servings: int | None = Field(default=None, ge=0, le=100000)
    need_level: NeedLevel
    accepted_dietary_types: list[DietaryType] | None = None
    accepted_food_categories: list[FoodCategory] | None = None
    excluded_allergens: list[str] | None = Field(default=None, max_length=20)
    description: str | None = Field(default=None, max_length=500)


def _request_id(request: Request) -> str:
    return getattr(request.state, "request_id", "unknown")


def _get_or_create(db: DbSession, user: User) -> ReceiverCapacity:
    capacity = db.scalar(
        select(ReceiverCapacity).where(ReceiverCapacity.organization_id == user.organization_id)
    )
    if capacity is None:
        capacity = ReceiverCapacity(
            id=new_uuid(),
            organization_id=user.organization_id,
            available=False,
            max_servings=0,
            available_servings=0,
            accepts_veg=True,
            accepts_non_veg=True,
            transport_available=False,
            need_level=NeedLevel.MEDIUM.value,
            updated_at=utcnow(),
        )
        db.add(capacity)
        db.flush()
    return capacity


def _serialize(capacity: ReceiverCapacity, db) -> dict[str, Any]:
    reserved = reserved_servings(db, capacity.organization_id)
    return {
        "available": capacity.available,
        "max_servings": capacity.max_servings,
        "available_servings": max(0, capacity.available_servings - reserved),
        "reserved_servings": reserved,
        "accepts_veg": capacity.accepts_veg,
        "accepts_non_veg": capacity.accepts_non_veg,
        "transport_available": capacity.transport_available,
        "containers_available": capacity.containers_available,
        "refrigeration_available": capacity.refrigeration_available,
        "volunteer_servings": capacity.volunteer_servings,
        "need_level": capacity.need_level,
        "accepted_dietary_types": capacity.accepted_dietary_types or [],
        "accepted_food_categories": capacity.accepted_food_categories or [],
        "excluded_allergens": capacity.excluded_allergens or [],
        "description": capacity.description or "",
        "updated_at": iso_utc(capacity.updated_at),
    }


@router.get("/capacity")
def get_capacity(
    request: Request,
    db: DbSession,
    user: User = Depends(require_roles(UserRole.RECEIVER)),
) -> dict[str, Any]:
    capacity = _get_or_create(db, user)
    db.commit()
    return ok(_serialize(capacity, db), _request_id(request))


@router.put("/capacity")
def update_capacity(
    body: CapacityUpdate,
    request: Request,
    db: DbSession,
    user: User = Depends(require_roles(UserRole.RECEIVER)),
) -> dict[str, Any]:
    if body.available_servings > body.max_servings:
        raise AppError(
            "CAPACITY_EXCEEDS_MAX",
            "Available servings cannot exceed your maximum capacity.",
            422,
        )
    if not (body.accepts_veg or body.accepts_non_veg):
        raise AppError("DIETARY_REQUIRED", "Select at least one food type you accept.", 422)

    capacity = _get_or_create(db, user)
    # Serialize capacity edits with claims before reading active reservations.
    db.execute(update(ReceiverCapacity).where(ReceiverCapacity.id == capacity.id).values(updated_at=utcnow()))
    reserved = reserved_servings(db, user.organization_id)
    if body.available_servings + reserved > body.max_servings:
        raise AppError("CAPACITY_EXCEEDS_MAX", f"{reserved} servings are reserved by active handoffs. Free plus reserved servings cannot exceed maximum capacity.", 422)
    capacity.available = body.available
    capacity.max_servings = body.max_servings
    capacity.available_servings = body.available_servings + reserved
    capacity.accepts_veg = body.accepts_veg
    capacity.accepts_non_veg = body.accepts_non_veg
    capacity.transport_available = body.transport_available
    if body.containers_available is not None:
        capacity.containers_available = body.containers_available
    if body.refrigeration_available is not None:
        capacity.refrigeration_available = body.refrigeration_available
    if "volunteer_servings" in body.model_fields_set:
        capacity.volunteer_servings = body.volunteer_servings
    capacity.need_level = body.need_level.value
    for name in ("accepted_dietary_types", "accepted_food_categories", "excluded_allergens", "description"):
        value = getattr(body, name)
        if value is not None:
            setattr(capacity, name, [getattr(v, "value", v).strip().lower() if name == "excluded_allergens" else getattr(v, "value", v) for v in value] if isinstance(value, list) else value.strip())
    capacity.updated_at = utcnow()
    db.commit()
    return ok(_serialize(capacity, db), _request_id(request))


@router.get("/nearby")
def list_nearby_receivers(
    request: Request,
    db: DbSession,
    user: User = Depends(require_roles(UserRole.DONOR)),
    dietary_type: DietaryType | None = None,
    food_category: FoodCategory | None = None,
) -> dict[str, Any]:
    """Return receivers within 15km of the donor's organization."""
    donor_org = user.organization
    org_caps = db.execute(
        select(Organization, ReceiverCapacity).join(ReceiverCapacity, ReceiverCapacity.organization_id == Organization.id).where(
            Organization.organization_type.notin_([OrganizationType.CATERER.value, OrganizationType.ADMIN.value])
            , Organization.verification_status == "VERIFIED"
        )
    ).all()
    from app.services.trust_service import trust_details_many
    org_caps = [(org, cap) for org, cap in org_caps if geo.haversine_km(donor_org.latitude, donor_org.longitude, org.latitude, org.longitude) <= 15.0]
    orgs = [org for org, _ in org_caps]
    trust = trust_details_many(db, orgs)
    reserved = reserved_servings_by_org(db, [org.id for org in orgs])
    nearby = []
    for org, cap in org_caps:
        dist = geo.haversine_km(donor_org.latitude, donor_org.longitude, org.latitude, org.longitude)
        if dist <= 15.0:
            if dietary_type:
                if cap.accepted_dietary_types and dietary_type.value not in cap.accepted_dietary_types:
                    continue
                veg = dietary_type.value in {"VEG", "VEGAN", "JAIN", "RAW_VEGAN"}
                if (veg and not cap.accepts_veg) or (not veg and not cap.accepts_non_veg):
                    continue
            if food_category and cap.accepted_food_categories and food_category.value not in cap.accepted_food_categories:
                continue
            nearby.append({
                **trust[org.id],
                "id": str(org.id),
                "name": org.name,
                "locality": org.locality,
                "latitude": round(org.latitude, 2),
                "longitude": round(org.longitude, 2),
                "accepted_dietary_types": cap.accepted_dietary_types or [],
                "accepted_food_categories": cap.accepted_food_categories or [],
                "description": cap.description or "",
                "organization_type": org.organization_type,
                "verification_status": org.verification_status,
                "id_checked": org.id_checked,
                "reliability": org.reliability,
                "distance_km": round(dist, 2),
                "available": cap.available if cap else False,
                "max_servings": cap.max_servings if cap else 0,
                "available_servings": max(0, cap.available_servings - reserved.get(org.id, 0)),
                "need_level": cap.need_level if cap else "MEDIUM",
                "transport_available": cap.transport_available if cap else False,
                "refrigeration_available": cap.refrigeration_available,
                "accepts_veg": cap.accepts_veg if cap else True,
                "accepts_non_veg": cap.accepts_non_veg if cap else True,
            })
    nearby.sort(key=lambda x: x["distance_km"])
    return ok(nearby, _request_id(request))
