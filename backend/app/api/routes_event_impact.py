"""Explicitly shared, address-free reports for synthetic event deliveries."""

from secrets import token_urlsafe
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select

from app.api.deps import DbSession, require_roles
from app.api.responses import ok
from app.core.config import get_settings
from app.core.errors import AppError
from app.models.enums import UserRole
from app.models.impact import ImpactRecord
from app.models.organization import Organization
from app.models.rescue import Rescue
from app.services.impact_service import CO2E_PER_KG, KG_PER_MEAL
from app.services.status import lock_rescue

router = APIRouter(tags=["event impact"])


def unavailable():
    return AppError("EVENT_IMPACT_UNAVAILABLE", "This event report is unavailable.", 404)


@router.post("/rescues/{rescue_id}/event-share")
def share_event(rescue_id: UUID, request: Request, db: DbSession,
                user=Depends(require_roles(UserRole.DONOR))):
    if not get_settings().DEMO_MODE:
        raise unavailable()
    rescue = lock_rescue(db, rescue_id)
    if rescue is None or rescue.donor_organization_id != user.organization_id or rescue.status != "DELIVERED":
        raise unavailable()
    if rescue.impact is None:
        raise unavailable()
    if rescue.event_share_token is None:
        rescue.event_share_token = token_urlsafe(24)
        db.commit()
    return ok({"token": rescue.event_share_token}, request.state.request_id)


@router.get("/event-impact/{token}")
def event_impact(token: str, request: Request, db: DbSession):
    if not get_settings().DEMO_MODE or len(token) != 32:
        raise unavailable()
    row = db.execute(
        select(ImpactRecord.delivered_servings, Organization.name)
        .select_from(ImpactRecord)
        .join(Rescue, Rescue.id == ImpactRecord.rescue_id)
        .join(Organization, Organization.id == ImpactRecord.receiver_organization_id)
        .where(Rescue.event_share_token == token, Rescue.status == "DELIVERED")
    ).one_or_none()
    if row is None:
        raise unavailable()
    meals, receiver = row
    weight = meals * KG_PER_MEAL
    return ok({
        "meals": meals,
        "estimated_kg": round(weight, 1),
        "estimated_co2e_kg": round(weight * CO2E_PER_KG, 1),
        "kg_per_meal": KG_PER_MEAL,
        "co2e_per_kg": CO2E_PER_KG,
        "receiver_names": [receiver],
        "data_notice": "Synthetic demo data",
        "safety_notice": "Not a food-safety certification.",
    }, request.state.request_id)
