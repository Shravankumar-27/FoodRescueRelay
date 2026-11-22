import uuid
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select, update
from app.api.deps import DbSession, require_roles
from app.api.responses import ok
from app.core.errors import AppError
from app.models.allocation import FoodAllocationPlan
from app.models.base_types import utcnow
from app.models.enums import UserRole
from app.models.handoff import Handoff
from app.models.offer import MatchOffer
from app.models.organization import Organization
from app.models.rescue import Rescue
from app.models.user import User
from app.services.rewards_service import reward_summary

router = APIRouter(tags=["contribution"])


@router.get("/contribution")
def contribution(request: Request, db: DbSession, user: User = Depends(require_roles(UserRole.DONOR, UserRole.RECEIVER))):
    return ok(reward_summary(db, user, db.get(Organization, user.organization_id)), request.state.request_id)


class AllocationGroup(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    people: int = Field(ge=1, le=100000, strict=True)
    servings: int = Field(ge=0, le=100000, strict=True)
    dietary_notes: str = Field(default="", max_length=160)

    @field_validator("name", "dietary_notes")
    @classmethod
    def strip_text(cls, value):
        return value.strip()


class AllocationIn(BaseModel):
    revision: int = Field(ge=0, strict=True)
    groups: list[AllocationGroup] = Field(max_length=20)
    handling_reviewed: bool = False


def _batch(db, rescue_id, user):
    rescue = db.scalar(select(Rescue).join(MatchOffer).where(
        Rescue.id == rescue_id, MatchOffer.receiver_organization_id == user.organization_id,
        MatchOffer.status == "ACCEPTED", Rescue.status.in_(["COLLECTED", "DELIVERED"])))
    if not rescue:
        raise AppError("PLAN_NOT_FOUND", "Only your collected or delivered food can be planned.", 404)
    handoff = db.scalar(select(Handoff).where(Handoff.rescue_id == rescue_id))
    limit = (handoff.delivered_servings if rescue.status == "DELIVERED" else handoff.collected_servings) or 0
    return rescue, limit


def _plan_data(db, rescue, limit):
    plan = db.scalar(select(FoodAllocationPlan).where(FoodAllocationPlan.rescue_id == rescue.id))
    groups = plan.groups if plan else []
    return {"rescue_id": str(rescue.id), "display_id": rescue.display_id, "status": rescue.status,
            "available_servings": limit, "groups": groups, "revision": plan.revision if plan else 0,
            "updated_at": plan.updated_at if plan else None,
            "needs_revision": sum(g["servings"] for g in groups) > limit,
            "handling_type": rescue.handling_type, "handling_notes": rescue.handling_notes,
            "food_items": [{"name": f.name, "dietary_type": f.dietary_type, "allergens": f.allergens,
                            "allergen_info_unknown": f.allergen_info_unknown} for f in rescue.food_items]}


@router.get("/receiver/planner")
def planner_batches(request: Request, db: DbSession, user: User = Depends(require_roles(UserRole.RECEIVER))):
    rescues = db.scalars(select(Rescue).join(MatchOffer).where(
        MatchOffer.receiver_organization_id == user.organization_id, MatchOffer.status == "ACCEPTED",
        Rescue.status.in_(["COLLECTED", "DELIVERED"])).order_by(Rescue.updated_at.desc()).limit(100)).all()
    return ok([{"rescue_id": str(r.id), "display_id": r.display_id, "status": r.status} for r in rescues], request.state.request_id)


@router.get("/receiver/planner/{rescue_id}")
def get_plan(rescue_id: uuid.UUID, request: Request, db: DbSession, user: User = Depends(require_roles(UserRole.RECEIVER))):
    return ok(_plan_data(db, *_batch(db, rescue_id, user)), request.state.request_id)


@router.put("/receiver/planner/{rescue_id}")
def save_plan(rescue_id: uuid.UUID, body: AllocationIn, request: Request, db: DbSession, user: User = Depends(require_roles(UserRole.RECEIVER))):
    # Serialize with delivery and other planners, then re-read the actual quantity.
    db.execute(update(Rescue).where(Rescue.id == rescue_id).values(updated_at=Rescue.updated_at))
    rescue, limit = _batch(db, rescue_id, user)
    if not body.handling_reviewed:
        raise AppError("REVIEW_REQUIRED", "Review food, allergens and group needs before saving.", 422)
    names = [g.name.casefold() for g in body.groups]
    if any(not n for n in names) or len(set(names)) != len(names):
        raise AppError("INVALID_GROUPS", "Use a different, non-empty name for each group.", 422)
    if sum(g.servings for g in body.groups) > limit:
        raise AppError("OVER_ALLOCATED", "The plan exceeds the confirmed available servings. Refresh and adjust it.", 422)
    plan = db.scalar(select(FoodAllocationPlan).where(FoodAllocationPlan.rescue_id == rescue_id))
    if body.revision != (plan.revision if plan else 0):
        raise AppError("PLAN_CHANGED", "A newer plan was saved. Reload it before making changes.", 409)
    if not plan:
        plan = FoodAllocationPlan(rescue_id=rescue.id, receiver_organization_id=user.organization_id, revision=0)
        db.add(plan)
    plan.groups = [g.model_dump() for g in body.groups]
    plan.revision += 1
    plan.updated_at = utcnow()
    db.commit()
    return ok(_plan_data(db, rescue, limit), request.state.request_id)
