"""Claimed pickup coordination and aggregated restaurant feedback."""

import uuid
from collections import Counter
from typing import Annotated, Literal

from fastapi import APIRouter, Body, Depends, Request
from pydantic import BaseModel, Field, StringConstraints
from sqlalchemy import select

from app.api.deps import DbSession, require_roles
from app.api.responses import ok
from app.core.errors import AppError
from app.models.base_types import utcnow
from app.models.enums import UserRole
from app.models.handoff_workflow import LogisticsProvider, MealFeedback
from app.models.offer import MatchOffer
from app.models.organization import Organization
from app.models.rescue import Rescue
from app.models.user import User
from app.services.logistics_service import accepted_offer, available_providers, logistics_for, logistics_state, provider_data
from app.services.rescue_helpers import ensure_utc
from app.services.rescue_service import iso_utc
from app.services.status import lock_rescue

router = APIRouter(tags=["handoff workflows"])

Partner = Depends(require_roles(UserRole.DONOR, UserRole.RECEIVER))
Receiver = Depends(require_roles(UserRole.RECEIVER))
Donor = Depends(require_roles(UserRole.DONOR))
Admin = Depends(require_roles(UserRole.ADMIN))
Resource = Literal["containers", "transport"]


class Supplies(BaseModel):
    offer_id: uuid.UUID
    containers: bool
    transport: bool


class Provider(BaseModel):
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=120)]
    contact: Annotated[str, StringConstraints(strip_whitespace=True, min_length=3, max_length=160)]


class ProviderRegistration(Provider):
    resource: Resource
    service_area: Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=120)]
    max_servings: int = Field(ge=1, le=100000)
    refrigeration: bool = False
    available: bool = True


class ProviderAvailability(BaseModel):
    available: bool


class ProviderConfirmation(BaseModel):
    offer_id: uuid.UUID
    provider_id: uuid.UUID


class Feedback(BaseModel):
    consent: bool
    taste: int | None = Field(default=None, ge=1, le=5)
    packaging: int | None = Field(default=None, ge=1, le=5)
    dietary_fit: int | None = Field(default=None, ge=1, le=5)
    staple_portion: Literal["too_small", "about_right", "too_large", "not_applicable"] | None = None
    vegetable_portion: Literal["too_small", "about_right", "too_large", "not_applicable"] | None = None


def _pickup(db, rescue_id, user, *, write=False, require_active=False):
    rescue = lock_rescue(db, rescue_id) if write else db.get(Rescue, rescue_id)
    offer = accepted_offer(db, rescue_id)
    partner = rescue and offer and (
        (user.role == "DONOR" and rescue.donor_organization_id == user.organization_id)
        or (user.role == "RECEIVER" and offer.receiver_organization_id == user.organization_id)
        or user.role == "ADMIN"
    )
    if not partner:
        raise AppError("PICKUP_NOT_FOUND", "This pickup was not found.", 404)
    if require_active and (rescue.status != "CLAIMED" or ensure_utc(rescue.pickup_by) <= utcnow()):
        raise AppError("PICKUP_CLOSED", "Logistics can only be updated before an active pickup is collected.", 409)
    return rescue, offer


def _logistics_data(db, rescue, offer, record):
    resources = logistics_state(record)
    options = available_providers(db, rescue) if rescue.status == "CLAIMED" and ensure_utc(rescue.pickup_by) > utcnow() else []
    return {
        "offer_id": str(offer.id), "resources": resources,
        "providers": [provider_data(provider) for provider in options if resources[provider.resource]["needs_help"]],
    }


@router.get("/rescues/{rescue_id}/logistics")
def get_logistics(rescue_id: uuid.UUID, request: Request, db: DbSession, user: User = Partner):
    rescue, offer = _pickup(db, rescue_id, user)
    return ok(_logistics_data(db, rescue, offer, logistics_for(db, rescue, offer)), request.state.request_id)


@router.put("/rescues/{rescue_id}/logistics")
def update_logistics(rescue_id: uuid.UUID, body: Supplies, request: Request, db: DbSession, user: User = Partner):
    rescue, offer = _pickup(db, rescue_id, user, write=True, require_active=True)
    if body.offer_id != offer.id:
        raise AppError("PICKUP_CHANGED", "The receiver has changed. Refresh before updating logistics.", 409)
    record = logistics_for(db, rescue, offer)
    for resource, available in body.model_dump(exclude={"offer_id"}).items():
        setattr(record, f"{user.role.lower()}_{resource}", available)
    db.add(record)
    db.commit()
    return ok(_logistics_data(db, rescue, offer, record), request.state.request_id)


@router.put("/rescues/{rescue_id}/logistics/provider")
def confirm_provider(rescue_id: uuid.UUID, body: ProviderConfirmation, request: Request, db: DbSession, user: User = Partner):
    rescue, offer = _pickup(db, rescue_id, user, write=True, require_active=True)
    if body.offer_id != offer.id:
        raise AppError("PICKUP_CHANGED", "The receiver has changed. Refresh logistics.", 409)
    record = logistics_for(db, rescue, offer)
    provider = next((option for option in available_providers(db, rescue) if option.id == body.provider_id), None)
    if not provider:
        raise AppError("PROVIDER_UNAVAILABLE", "This provider is no longer available for this pickup.", 409)
    current = record.arrangements.get(provider.resource)
    if current and current.get("id") == str(provider.id):
        return ok(_logistics_data(db, rescue, offer, record), request.state.request_id)
    if not logistics_state(record)[provider.resource]["needs_help"]:
        raise AppError("SUPPLY_ALREADY_AVAILABLE", "This resource is already arranged.", 409)
    record.arrangements = {**record.arrangements, provider.resource: {
        "id": str(provider.id), "name": provider.name, "contact": provider.contact,
    }}
    db.add(record)
    db.commit()
    return ok(_logistics_data(db, rescue, offer, record), request.state.request_id)


@router.get("/admin/logistics/providers")
def providers(request: Request, db: DbSession, user: User = Admin):
    rows = db.scalars(select(LogisticsProvider).order_by(LogisticsProvider.name)).all()
    return ok([provider_data(row) for row in rows], request.state.request_id)


@router.post("/admin/logistics/providers")
def register_provider(body: ProviderRegistration, request: Request, db: DbSession, user: User = Admin):
    provider = LogisticsProvider(**body.model_dump())
    db.add(provider)
    db.commit()
    return ok(provider_data(provider), request.state.request_id)


@router.put("/admin/logistics/providers/{provider_id}/availability")
def set_provider_availability(provider_id: uuid.UUID, body: ProviderAvailability, request: Request, db: DbSession, user: User = Admin):
    provider = db.get(LogisticsProvider, provider_id)
    if provider is None:
        raise AppError("PROVIDER_NOT_FOUND", "Provider was not found.", 404)
    provider.available = body.available
    db.commit()
    return ok(provider_data(provider), request.state.request_id)


@router.get("/admin/logistics")
def logistics_queue(request: Request, db: DbSession, user: User = Admin):
    rows = db.execute(select(Rescue, MatchOffer).join(MatchOffer, MatchOffer.rescue_id == Rescue.id).where(
        Rescue.status == "CLAIMED", Rescue.pickup_by > utcnow(), MatchOffer.status == "ACCEPTED"
    ).order_by(Rescue.pickup_by)).all()
    items = []
    for rescue, offer in rows:
        resources = logistics_state(logistics_for(db, rescue, offer))
        if any(resource["needs_help"] or resource["provider"] for resource in resources.values()):
            items.append({
                "rescue_id": str(rescue.id), "offer_id": str(offer.id), "display_id": rescue.display_id,
                "donor": db.get(Organization, rescue.donor_organization_id).name,
                "receiver": db.get(Organization, offer.receiver_organization_id).name,
                "locality": rescue.locality, "servings": rescue.total_servings,
                "handling_type": rescue.handling_type, "pickup_by": iso_utc(rescue.pickup_by),
                "resources": resources,
            })
    return ok(items, request.state.request_id)


@router.put("/admin/logistics/{rescue_id}/{offer_id}/{resource}")
def arrange_logistics(
    rescue_id: uuid.UUID, offer_id: uuid.UUID, resource: Resource,
    request: Request, db: DbSession, body: Provider | None = Body(default=None), user: User = Admin,
):
    rescue, offer = _pickup(db, rescue_id, user, write=True, require_active=True)
    if offer.id != offer_id:
        raise AppError("PICKUP_CHANGED", "The receiver has changed. Refresh the logistics queue.", 409)
    record = logistics_for(db, rescue, offer)
    arrangements = dict(record.arrangements)
    if body is None:
        arrangements.pop(resource, None)
    else:
        if not arrangements.get(resource) and not logistics_state(record)[resource]["needs_help"]:
            raise AppError("SUPPLY_ALREADY_AVAILABLE", "A pickup partner already provides this resource.", 409)
        arrangements[resource] = body.model_dump()
    record.arrangements = arrangements
    db.add(record)
    db.commit()
    return ok(logistics_state(record), request.state.request_id)


def _feedback_rescue(db, rescue_id, user, *, write=False):
    rescue, _ = _pickup(db, rescue_id, user, write=write)
    if rescue.status != "DELIVERED" or rescue.impact is None or rescue.impact.delivered_servings == 0:
        raise AppError("FEEDBACK_UNAVAILABLE", "Meal feedback opens after a confirmed delivery with meals served.", 409)
    return rescue


@router.get("/rescues/{rescue_id}/meal-feedback")
def get_feedback(rescue_id: uuid.UUID, request: Request, db: DbSession, user: User = Receiver):
    _feedback_rescue(db, rescue_id, user)
    record = db.get(MealFeedback, rescue_id)
    return ok(record.answers if record else None, request.state.request_id)


@router.put("/rescues/{rescue_id}/meal-feedback")
def save_feedback(rescue_id: uuid.UUID, body: Feedback, request: Request, db: DbSession, user: User = Receiver):
    _feedback_rescue(db, rescue_id, user, write=True)
    record = db.get(MealFeedback, rescue_id)
    answers = body.model_dump(exclude={"consent"})
    if body.consent:
        if any(value is None for value in answers.values()):
            raise AppError("FEEDBACK_INCOMPLETE", "Complete each feedback field before sharing.", 422)
        if record is None:
            db.add(MealFeedback(rescue_id=rescue_id, answers=answers))
        else:
            record.answers = answers
    elif record is not None:
        db.delete(record)
    db.commit()
    return ok(answers if body.consent else None, request.state.request_id)


@router.get("/impact/meal-insights")
def meal_insights(request: Request, db: DbSession, user: User = Donor):
    answers = list(db.scalars(select(MealFeedback.answers).join(Rescue).where(
        Rescue.donor_organization_id == user.organization_id
    )))
    averages = {}
    portions = {}
    if len(answers) >= 3:
        for field in ("taste", "packaging", "dietary_fit"):
            averages[field] = round(sum(answer[field] for answer in answers) / len(answers), 1)
        for field in ("staple_portion", "vegetable_portion"):
            portions[field] = dict(Counter(answer[field] for answer in answers))
    return ok({"responses": len(answers), "minimum": 3, "averages": averages, "portions": portions}, request.state.request_id)
