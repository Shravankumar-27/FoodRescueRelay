from datetime import timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field

from app.api.deps import DbSession, require_roles
from app.api.responses import ok
from app.core.config import get_settings
from app.core.errors import AppError
from app.core.demo_clock import advance, enabled, offset, use_demo_clock
from app.models.base_types import utcnow
from app.models.enums import RescueStatus, UserRole
from app.services.dispatch_service import advance_expired_offers, check_in_due, add_dispatch_event
from app.services.logistics_service import accepted_offer
from app.services.rescue_service import iso_utc
from app.services.spoilage import DELIVERY_MINUTES, GUIDANCE, hold_time_table
from app.services.status import lock_rescue

router = APIRouter(tags=["spoilage"])


@router.get("/hold-times")
def hold_times(request: Request):
    return ok({
        "categories": hold_time_table(), "delivery_minutes": DELIVERY_MINUTES,
        "guidance": GUIDANCE,
        "demo_clock_enabled": enabled(get_settings()),
        "clock_offset_ms": int(offset.get().total_seconds() * 1000),
    }, request.state.request_id)


@router.post("/rescues/{rescue_id}/on-the-way")
def on_the_way(rescue_id: UUID, request: Request, db: DbSession,
               user=Depends(require_roles(UserRole.RECEIVER))):
    rescue = lock_rescue(db, rescue_id)
    offer = accepted_offer(db, rescue_id)
    if rescue is None or offer is None or offer.receiver_organization_id != user.organization_id:
        raise AppError("CLAIM_REQUIRED", "A confirmed claim is required.", 404)
    if rescue.status != "CLAIMED" or rescue.consume_by is None:
        raise AppError("CHECK_IN_UNAVAILABLE", "This pickup cannot be checked in.", 409)
    if rescue.on_the_way_at is None:
        current = utcnow()
        if current >= check_in_due(rescue, offer):
            advance_expired_offers(db, current, rescue_id=rescue_id)
            db.commit()
            raise AppError("CHECK_IN_LATE", "This claim was released after the check-in deadline.", 409)
        rescue.on_the_way_at = current
        add_dispatch_event(db, rescue, RescueStatus.CLAIMED, "receiver_on_the_way")
        db.commit()
    return ok({"on_the_way_at": iso_utc(rescue.on_the_way_at)}, request.state.request_id)


class ClockAdvance(BaseModel):
    minutes: int = Field(ge=1, le=1440)


@router.post("/demo/clock")
def advance_demo_clock(body: ClockAdvance, request: Request, db: DbSession,
                       user=Depends(require_roles(UserRole.ADMIN))):
    if not enabled(get_settings()):
        raise AppError("DEMO_CLOCK_DISABLED", "Enable the demo clock on a synthetic database.", 404)
    advance(db, body.minutes)
    with use_demo_clock(db):
        current = utcnow()
        advance_expired_offers(db, current)
    db.commit()
    return ok({"now": iso_utc(current)}, request.state.request_id)
