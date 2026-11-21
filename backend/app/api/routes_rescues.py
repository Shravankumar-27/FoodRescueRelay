"""Rescue routes: post surplus, donor listings, detail, matches, dispatch, cancel."""

from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy import select

from app.api.deps import DbSession, require_roles
from app.api.responses import ok
from app.core.errors import AppError
from app.models.base_types import utcnow
from app.models.enums import RescueStatus, UserRole
from app.models.rescue import Rescue
from app.models.status_event import StatusEvent
from app.models.user import User
from app.schemas.rescue import RescueCreate
from app.services.dispatch_service import advance_expired_offers, cancel_pending_offers, start_dispatch, sweep_expired_matching
from app.services.matching_service import match_rescue
from app.services.rescue_service import (
    can_view_rescue,
    create_rescue,
    delivered_servings_for,
    is_admin,
    is_donor_owner,
    iso_utc,
    rescue_detail,
)
from app.services.status import transition_rescue

router = APIRouter(prefix="/rescues", tags=["rescues"])

MINE_LIMIT = 50
CANCELLABLE_STATUSES = (RescueStatus.POSTED, RescueStatus.MATCHING, RescueStatus.OFFERED)


def _request_id(request: Request) -> str:
    return getattr(request.state, "request_id", "unknown")


def _load_rescue(db: DbSession, rescue_id: uuid.UUID) -> Rescue:
    rescue = db.get(Rescue, rescue_id)
    if rescue is None:
        raise AppError("RESCUE_NOT_FOUND", "Rescue was not found.", 404)
    return rescue


def _load_owned_or_admin(db: DbSession, rescue_id: uuid.UUID, user: User) -> Rescue:
    rescue = db.get(Rescue, rescue_id)
    if rescue is None or not (is_admin(user) or is_donor_owner(user, rescue)):
        raise AppError("RESCUE_NOT_FOUND", "Rescue was not found.", 404)
    return rescue


def _load_visible(db: DbSession, rescue_id: uuid.UUID, user: User) -> Rescue:
    rescue = db.get(Rescue, rescue_id)
    if rescue is None or not can_view_rescue(db, user, rescue):
        raise AppError("RESCUE_NOT_FOUND", "Rescue was not found.", 404)
    return rescue


@router.post("")
def post_rescue(
    body: RescueCreate,
    request: Request,
    response: Response,
    db: DbSession,
    donor: User = Depends(require_roles(UserRole.DONOR)),
) -> dict[str, Any]:
    rescue, created, matching_error = create_rescue(db, donor, body)
    db.commit()
    data = rescue_detail(db, rescue, donor, utcnow())
    if matching_error:
        data["matching_error"] = True
    response.status_code = 201 if created else 200
    return ok(data, _request_id(request))


@router.get("/mine")
def list_my_rescues(
    request: Request,
    db: DbSession,
    donor: User = Depends(require_roles(UserRole.DONOR)),
) -> dict[str, Any]:
    now = utcnow()
    advance_expired_offers(db, now)
    sweep_expired_matching(db, now)
    db.commit()
    rescues = list(
        db.scalars(
            select(Rescue)
            .where(Rescue.donor_organization_id == donor.organization_id)
            .order_by(Rescue.created_at.desc())
            .limit(MINE_LIMIT)
        ).all()
    )
    impact = delivered_servings_for(db, [r.id for r in rescues])
    items = [
        {
            "id": str(r.id),
            "display_id": r.display_id,
            "status": r.status,
            "pickup_by": iso_utc(r.pickup_by),
            "total_servings": r.total_servings,
            "created_at": iso_utc(r.created_at),
            "locality": r.locality,
            "delivered_servings": impact.get(r.id),
        }
        for r in rescues
    ]
    return ok(items, _request_id(request))


@router.get("/{rescue_id}")
def get_rescue(
    rescue_id: uuid.UUID,
    request: Request,
    db: DbSession,
    user: User = Depends(require_roles(UserRole.DONOR, UserRole.RECEIVER, UserRole.ADMIN)),
) -> dict[str, Any]:
    now = utcnow()
    advance_expired_offers(db, now)
    db.commit()
    rescue = _load_visible(db, rescue_id, user)
    return ok(rescue_detail(db, rescue, user, now), _request_id(request))


@router.get("/{rescue_id}/matches")
def get_matches(
    rescue_id: uuid.UUID,
    request: Request,
    db: DbSession,
    user: User = Depends(require_roles(UserRole.DONOR, UserRole.ADMIN)),
) -> dict[str, Any]:
    rescue = _load_owned_or_admin(db, rescue_id, user)
    results = match_rescue(db, rescue.id, utcnow())
    items = [
        {
            "receiver_name": r.receiver_name,
            "locality": r.locality,
            "feasible": r.feasible,
            "rejection_reasons": list(r.rejection_reasons),
            "distance_km": round(r.distance_km, 2),
            "travel_minutes": round(r.travel_minutes, 1),
            "score": r.score,
            "factors": dict(r.factors),
            "why": list(r.why),
        }
        for r in results
    ]
    return ok(items, _request_id(request))


@router.post("/{rescue_id}/dispatch")
def dispatch_rescue(
    rescue_id: uuid.UUID,
    request: Request,
    db: DbSession,
    user: User = Depends(require_roles(UserRole.DONOR, UserRole.ADMIN)),
) -> dict[str, Any]:
    rescue = _load_owned_or_admin(db, rescue_id, user)
    if rescue.status != RescueStatus.MATCHING.value:
        raise AppError("INVALID_STATUS_TRANSITION", "This rescue cannot move to that status.", 409)
    now = utcnow()
    start_dispatch(db, rescue, now)
    db.commit()
    return ok(rescue_detail(db, rescue, user, now), _request_id(request))


@router.get("/{rescue_id}/events")
def list_events(
    rescue_id: uuid.UUID,
    request: Request,
    db: DbSession,
    user: User = Depends(require_roles(UserRole.DONOR, UserRole.RECEIVER, UserRole.ADMIN)),
) -> dict[str, Any]:
    rescue = _load_visible(db, rescue_id, user)
    events = db.scalars(
        select(StatusEvent)
        .where(StatusEvent.rescue_id == rescue.id)
        .order_by(StatusEvent.created_at)
    ).all()
    items = [
        {
            "from_status": e.from_status,
            "to_status": e.to_status,
            "reason": e.reason,
            "created_at": iso_utc(e.created_at),
        }
        for e in events
    ]
    return ok(items, _request_id(request))


@router.post("/{rescue_id}/cancel")
def cancel_rescue(
    rescue_id: uuid.UUID,
    request: Request,
    db: DbSession,
    donor: User = Depends(require_roles(UserRole.DONOR)),
) -> dict[str, Any]:
    rescue = _load_rescue(db, rescue_id)
    if not is_donor_owner(donor, rescue):
        raise AppError("RESCUE_NOT_FOUND", "Rescue was not found.", 404)
    if rescue.status not in [s.value for s in CANCELLABLE_STATUSES]:
        raise AppError(
            "CANCEL_NOT_ALLOWED",
            "This rescue has already been claimed and can no longer be cancelled.",
            409,
        )
    now = utcnow()
    cancel_pending_offers(db, rescue.id)
    transition_rescue(db, rescue, RescueStatus.CANCELLED, donor.id, reason="cancelled_by_donor")
    db.commit()
    return ok(rescue_detail(db, rescue, donor, now), _request_id(request))
