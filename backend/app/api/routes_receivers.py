"""Receiver capacity routes: what a receiving organization can currently accept."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.api.deps import DbSession, require_roles
from app.api.responses import ok
from app.core.errors import AppError
from app.models.base_types import new_uuid, utcnow
from app.models.enums import NeedLevel, UserRole
from app.models.receiver_capacity import ReceiverCapacity
from app.models.user import User
from app.services.rescue_service import iso_utc

router = APIRouter(prefix="/receivers", tags=["receivers"])


class CapacityUpdate(BaseModel):
    available: bool
    max_servings: int = Field(ge=0, le=100000)
    available_servings: int = Field(ge=0, le=100000)
    accepts_veg: bool
    accepts_non_veg: bool
    transport_available: bool
    need_level: NeedLevel


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


def _serialize(capacity: ReceiverCapacity) -> dict[str, Any]:
    return {
        "available": capacity.available,
        "max_servings": capacity.max_servings,
        "available_servings": capacity.available_servings,
        "accepts_veg": capacity.accepts_veg,
        "accepts_non_veg": capacity.accepts_non_veg,
        "transport_available": capacity.transport_available,
        "need_level": capacity.need_level,
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
    return ok(_serialize(capacity), _request_id(request))


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
    capacity.available = body.available
    capacity.max_servings = body.max_servings
    capacity.available_servings = body.available_servings
    capacity.accepts_veg = body.accepts_veg
    capacity.accepts_non_veg = body.accepts_non_veg
    capacity.transport_available = body.transport_available
    capacity.need_level = body.need_level.value
    capacity.updated_at = utcnow()
    db.commit()
    return ok(_serialize(capacity), _request_id(request))
