"""Rescue routes: post surplus, donor listings, detail, matches, dispatch, cancel."""

from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy import select, update
from pydantic import BaseModel, Field, field_validator

from app.api.deps import DbSession, require_roles
from app.api.responses import ok
from app.core.errors import AppError
from app.models.base_types import utcnow
from app.models.enums import RescueStatus, UserRole
from app.models.offer import MatchOffer
from app.models.receiver_capacity import ReceiverCapacity
from app.models.rescue import Rescue
from app.models.status_event import StatusEvent
from app.models.user import User
from app.schemas.rescue import RescueCreate
from app.services.allocation_notices import latest_notices, notice_summary, puzzle_data, send_notices
from app.services.dispatch_service import advance_expired_offers, cancel_pending_offers, offer_replacement, start_dispatch
from app.services.matching_service import match_rescue
from app.services.rescue_helpers import ensure_utc
from app.services.rescue_service import (
    can_view_rescue,
    create_rescue,
    delivered_servings_for,
    is_admin,
    is_donor_owner,
    iso_utc,
    rescue_detail,
)
from app.services.status import lock_rescue, transition_rescue

router = APIRouter(prefix="/rescues", tags=["rescues"])

MINE_LIMIT = 50
CANCELLABLE_STATUSES = (RescueStatus.POSTED, RescueStatus.MATCHING, RescueStatus.OFFERED, RescueStatus.CLAIMED)


class CancellationReason(BaseModel):
    reason: str = Field(min_length=3, max_length=300)

    @field_validator("reason")
    @classmethod
    def meaningful_reason(cls, value):
        if len(value.strip()) < 3:
            raise ValueError("Explain why this pickup cannot continue.")
        return value.strip()


class AllocationLine(BaseModel):
    item_id: uuid.UUID
    servings: int = Field(gt=0, le=100000, strict=True)


class AllocationProposal(BaseModel):
    receiver_id: uuid.UUID
    items: list[AllocationLine] = Field(min_length=1)


class AllocationProposals(BaseModel):
    proposals: list[AllocationProposal] = Field(min_length=1)


def _request_id(request: Request) -> str:
    return getattr(request.state, "request_id", "unknown")


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


def _release_data(event: StatusEvent) -> dict[str, str]:
    return {"id": str(event.id), "reason": event.reason.removeprefix("receiver_released: "), "created_at": iso_utc(event.created_at)}


def _release_events_for(rescue_id):
    return select(StatusEvent).where(
        StatusEvent.rescue_id == rescue_id, StatusEvent.reason.startswith("receiver_released: ", autoescape=True)
    )


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
    if created and ensure_utc(body.pickup_by) > ensure_utc(rescue.pickup_by):
        data["pickup_was_capped"] = True
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
    advance_expired_offers(db, now, donor_org_id=donor.organization_id)
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
    released = {}
    for event in db.scalars(select(StatusEvent).where(
        StatusEvent.rescue_id.in_([r.id for r in rescues]),
        StatusEvent.reason.startswith("receiver_released: ", autoescape=True),
    ).order_by(StatusEvent.created_at.desc(), StatusEvent.id)).all():
        released.setdefault(event.rescue_id, _release_data(event))
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
            "receiver_release": released.get(r.id),
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
    advance_expired_offers(db, now, rescue_id=rescue_id)
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
    declined = set(db.scalars(select(MatchOffer.receiver_organization_id).where(
        MatchOffer.rescue_id == rescue.id, MatchOffer.status == "DECLINED"
    )))
    released = db.scalar(_release_events_for(rescue_id).limit(1)) is not None
    items = [
        {
            "receiver_id": str(r.receiver_organization_id),
            "receiver_name": r.receiver_name,
            "locality": r.locality,
            "feasible": r.feasible and r.receiver_organization_id not in declined,
            "rejection_reasons": ["Receiver declined this donation"] if r.receiver_organization_id in declined else list(r.rejection_reasons),
            "replacement_available": released and r.feasible and r.receiver_organization_id not in declined,
            "distance_km": round(r.distance_km, 2),
            "travel_minutes": round(r.travel_minutes, 1),
            "score": r.score,
            "factors": dict(r.factors),
            "why": list(r.why),
        }
        for r in results
    ]
    return ok(items, _request_id(request))


@router.post("/{rescue_id}/replacement/{receiver_id}")
def choose_replacement(
    rescue_id: uuid.UUID, receiver_id: uuid.UUID, request: Request, db: DbSession,
    donor: User = Depends(require_roles(UserRole.DONOR)),
) -> dict[str, Any]:
    rescue = lock_rescue(db, rescue_id)
    if rescue is None or not is_donor_owner(donor, rescue):
        raise AppError("RESCUE_NOT_FOUND", "Rescue was not found.", 404)
    if db.scalar(_release_events_for(rescue_id).limit(1)) is None:
        raise AppError("REPLACEMENT_UNAVAILABLE", "This donation has no previous pickup release.", 409)
    now = utcnow()
    offer_replacement(db, rescue, receiver_id, now)
    db.commit()
    return ok(rescue_detail(db, rescue, donor, now), _request_id(request))


@router.get("/{rescue_id}/allocation-puzzle")
def allocation_puzzle(
    rescue_id: uuid.UUID, request: Request, db: DbSession,
    donor: User = Depends(require_roles(UserRole.DONOR)),
) -> dict[str, Any]:
    rescue = _load_owned_or_admin(db, rescue_id, donor)
    data = puzzle_data(db, rescue, utcnow())
    data["notices"] = [notice_summary(*row) for row in latest_notices(db, rescue.id).values()]
    return ok(data, _request_id(request))


@router.post("/{rescue_id}/allocation-puzzle/notify")
def notify_allocation(
    rescue_id: uuid.UUID, body: AllocationProposals, request: Request, db: DbSession,
    donor: User = Depends(require_roles(UserRole.DONOR)),
) -> dict[str, Any]:
    rescue = lock_rescue(db, rescue_id)
    if rescue is None or not is_donor_owner(donor, rescue):
        raise AppError("RESCUE_NOT_FOUND", "Rescue was not found.", 404)
    if donor.organization.verification_status != "VERIFIED":
        raise AppError("DONOR_NOT_VERIFIED", "Your organization must be verified before sending proposals.", 403)
    result = send_notices(db, rescue, body.proposals, utcnow())
    db.commit()
    return ok(result, _request_id(request))


@router.post("/{rescue_id}/dispatch")
def dispatch_rescue(
    rescue_id: uuid.UUID,
    request: Request,
    db: DbSession,
    user: User = Depends(require_roles(UserRole.DONOR, UserRole.ADMIN)),
) -> dict[str, Any]:
    rescue = _load_owned_or_admin(db, rescue_id, user)
    rescue = lock_rescue(db, rescue.id)
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
            "reason": e.reason if user.role != "RECEIVER" or not (e.reason or "").startswith("receiver_released: ") else None,
            "created_at": iso_utc(e.created_at),
        }
        for e in events
    ]
    return ok(items, _request_id(request))


@router.post("/{rescue_id}/cancel")
def cancel_rescue(
    rescue_id: uuid.UUID,
    body: CancellationReason,
    request: Request,
    db: DbSession,
    donor: User = Depends(require_roles(UserRole.DONOR)),
) -> dict[str, Any]:
    rescue = lock_rescue(db, rescue_id)
    if rescue is None or not is_donor_owner(donor, rescue):
        raise AppError("RESCUE_NOT_FOUND", "Rescue was not found.", 404)
    if rescue.status == RescueStatus.CANCELLED.value:
        return ok(rescue_detail(db, rescue, donor), _request_id(request))
    if rescue.status not in [s.value for s in CANCELLABLE_STATUSES]:
        raise AppError(
            "CANCEL_NOT_ALLOWED",
            "Collected or completed food cannot be cancelled. Coordinate delivery with the receiver.",
            409,
        )
    now = utcnow()
    cancel_pending_offers(db, rescue.id)
    transition_rescue(db, rescue, RescueStatus.CANCELLED, donor.id, reason=f"cancelled_by_donor: {body.reason}")
    db.commit()
    return ok(rescue_detail(db, rescue, donor, now), _request_id(request))


@router.post("/{rescue_id}/release")
def release_pickup(rescue_id: uuid.UUID, body: CancellationReason, request: Request, db: DbSession, user: User = Depends(require_roles(UserRole.RECEIVER))):
    from app.models.handoff import Handoff
    db.execute(update(ReceiverCapacity).where(ReceiverCapacity.organization_id == user.organization_id).values(updated_at=utcnow()))
    rescue = lock_rescue(db, rescue_id)
    offer = db.scalar(select(MatchOffer).where(MatchOffer.rescue_id == rescue_id, MatchOffer.receiver_organization_id == user.organization_id, MatchOffer.status == "ACCEPTED"))
    if rescue is None or not offer:
        released = db.scalar(select(MatchOffer.id).where(
            MatchOffer.rescue_id == rescue_id, MatchOffer.receiver_organization_id == user.organization_id,
            MatchOffer.status == "DECLINED", MatchOffer.claimed_at.is_not(None),
        ).limit(1))
        if rescue is not None and released is not None:
            return ok({"status": rescue.status, "message": "Your pickup was already released."}, _request_id(request))
        raise AppError("RESCUE_NOT_FOUND", "This pickup is not assigned to your organization.", 404)
    if rescue.status != "CLAIMED":
        raise AppError("RELEASE_NOT_ALLOWED", "Only a pickup that has not been collected can be released.", 409)
    offer.status = "DECLINED"
    handoff = db.scalar(select(Handoff).where(Handoff.rescue_id == rescue_id))
    if handoff:
        handoff.pickup_code_hash = None
        handoff.pickup_code_display = None
        handoff.pickup_code_expires_at = utcnow()
    now = utcnow()
    state = RescueStatus.EXPIRED if ensure_utc(rescue.pickup_by) <= now else RescueStatus.MATCHING
    transition_rescue(db, rescue, state, user.id, reason=f"receiver_released: {body.reason}")
    db.flush()
    if state == RescueStatus.MATCHING:
        start_dispatch(db, rescue, now)
    db.commit()
    return ok({"status": rescue.status, "message": "Your pickup is released. Matching continues while time remains."}, _request_id(request))
