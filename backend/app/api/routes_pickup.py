"""Receiver pickup and delivery routes: collect with the pickup code, then deliver."""

from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, Request

from app.api.deps import DbSession, require_roles
from app.api.responses import ok
from app.core.errors import AppError
from app.models.base_types import utcnow
from app.models.enums import RescueStatus, UserRole
from app.models.rescue import Rescue
from app.models.user import User
from app.schemas.pickup import CollectRequest, DeliverRequest
from app.services.pickup_service import collect_rescue, deliver_rescue

router = APIRouter(prefix="/rescues", tags=["pickup"])


def _request_id(request: Request) -> str:
    return getattr(request.state, "request_id", "unknown")


def _load_rescue(db: DbSession, rescue_id: uuid.UUID) -> Rescue:
    rescue = db.get(Rescue, rescue_id)
    if rescue is None:
        raise AppError("RESCUE_NOT_FOUND", "Rescue was not found.", 404)
    return rescue


@router.post("/{rescue_id}/collect")
def collect(
    rescue_id: uuid.UUID,
    body: CollectRequest,
    request: Request,
    db: DbSession,
    user: User = Depends(require_roles(UserRole.RECEIVER)),
) -> dict[str, Any]:
    rescue = _load_rescue(db, rescue_id)
    handoff = collect_rescue(
        db,
        rescue,
        user,
        collected_servings=body.collected_servings,
        pickup_code=body.pickup_code,
        now=utcnow(),
    )
    return ok(
        {
            "rescue_id": str(rescue.id),
            "status": RescueStatus.COLLECTED.value,
            "collected_servings": handoff.collected_servings,
        },
        _request_id(request),
    )


@router.post("/{rescue_id}/deliver")
def deliver(
    rescue_id: uuid.UUID,
    body: DeliverRequest,
    request: Request,
    db: DbSession,
    user: User = Depends(require_roles(UserRole.RECEIVER)),
) -> dict[str, Any]:
    rescue = _load_rescue(db, rescue_id)
    impact = deliver_rescue(
        db,
        rescue,
        user,
        delivered_servings=body.delivered_servings,
        rejected_servings=body.rejected_servings,
        now=utcnow(),
    )
    return ok(
        {
            "rescue_id": str(rescue.id),
            "status": RescueStatus.DELIVERED.value,
            "delivered_servings": impact.delivered_servings,
            "rejected_servings": body.rejected_servings,
            "impact_meals": impact.delivered_servings,
        },
        _request_id(request),
    )
