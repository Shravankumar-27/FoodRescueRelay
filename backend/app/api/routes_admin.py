"""Admin routes: read-only operational views. No private contact or address fields."""

from __future__ import annotations

from typing import Any
import uuid
from pydantic import BaseModel, Field

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import func, select

from app.api.deps import DbSession, require_roles
from app.api.responses import ok
from app.models.enums import RescueStatus as RS, UserRole
from app.models.impact import ImpactRecord
from app.models.organization import Organization
from app.models.rescue import Rescue
from app.services.rescue_service import iso_utc
from app.services.dispatch_service import advance_expired_offers
from app.services.trust_service import compute_trust_scores, trust_details_many
from app.core.errors import AppError
from app.models.enums import VerificationStatus
from app.models.offer import MatchOffer
from app.models.base_types import utcnow

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(require_roles(UserRole.ADMIN))],
)


def _request_id(request: Request) -> str:
    return getattr(request.state, "request_id", "unknown")


@router.get("/organizations")
def list_organizations(
    request: Request,
    db: DbSession,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> dict[str, Any]:
    orgs = db.scalars(
        select(Organization)
        .order_by(Organization.created_at, Organization.id)
        .limit(limit)
        .offset(offset)
    ).all()
    trust = trust_details_many(db, orgs)
    items = [
        {
            "id": str(org.id),
            "name": org.name,
            "organization_type": org.organization_type,
            "verification_status": org.verification_status,
            "id_checked": org.id_checked,
            "locality": org.locality,
            "reliability": org.reliability,
            "created_at": iso_utc(org.created_at),
            **trust[org.id],
        }
        for org in orgs
    ]
    return ok(items, _request_id(request))


@router.get("/rescues")
def list_rescues(
    request: Request,
    db: DbSession,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> dict[str, Any]:
    advance_expired_offers(db)
    db.commit()
    rows = db.execute(
        select(
            Rescue.id,
            Rescue.display_id,
            Rescue.status,
            Organization.name,
            Rescue.total_servings,
            Rescue.pickup_by,
            Rescue.created_at,
        )
        .join(Organization, Organization.id == Rescue.donor_organization_id)
        .order_by(Rescue.created_at.desc(), Rescue.id)
        .limit(limit)
        .offset(offset)
    ).all()
    items = [
        {
            "id": str(rescue_id),
            "display_id": display_id,
            "status": status,
            "donor_organization_name": donor_name,
            "total_servings": total_servings,
            "pickup_by": iso_utc(pickup_by),
            "created_at": iso_utc(created_at),
        }
        for rescue_id, display_id, status, donor_name, total_servings, pickup_by, created_at in rows
    ]
    return ok(items, _request_id(request))


@router.get("/stats")
def platform_stats(request: Request, db: DbSession) -> dict[str, Any]:
    advance_expired_offers(db)
    db.commit()
    total_rescues = db.scalar(select(func.count(Rescue.id))) or 0
    delivered = db.scalar(select(func.count(Rescue.id)).where(Rescue.status == RS.DELIVERED.value)) or 0
    active = db.scalar(select(func.count(Rescue.id)).where(Rescue.status.in_(["POSTED", "MATCHING", "OFFERED", "CLAIMED", "COLLECTED"]))) or 0
    total_meals = db.scalar(select(func.sum(ImpactRecord.delivered_servings))) or 0
    total_orgs = db.scalar(select(func.count(Organization.id))) or 0
    # CO2e: 0.4 kg/meal * 2.5 kg CO2e/kg
    co2e = round(total_meals * 0.4 * 2.5, 1)
    from app.services.impact_service import impact_summary
    summary = impact_summary(db, None, None, utcnow())
    pipeline = {status: count for status, count in db.execute(select(Rescue.status, func.count(Rescue.id)).group_by(Rescue.status)).all()}
    return ok({
        "total_rescues": total_rescues,
        "delivered": delivered,
        "active": active,
        "total_meals": int(total_meals),
        "total_orgs": total_orgs,
        "co2e_kg": co2e,
        "pipeline": pipeline,
        "weekly": summary["weekly"],
        "meals_month": summary["meals_rescued_month"],
        "pending_organizations": db.scalar(select(func.count(Organization.id)).where(Organization.verification_status == "PENDING")) or 0,
        "expired": pipeline.get("EXPIRED", 0),
    }, _request_id(request))


class VerificationUpdate(BaseModel):
    status: VerificationStatus
    reason: str = Field(min_length=3, max_length=300)
    id_checked: bool = False


@router.post("/organizations/{org_id}/verification")
def verify_organization(org_id: uuid.UUID, body: VerificationUpdate, request: Request, db: DbSession):
    org = db.get(Organization, org_id)
    if org is None or org.organization_type == "ADMIN":
        raise AppError("ORGANIZATION_NOT_FOUND", "Organization not found.", 404)
    if not body.reason.strip():
        raise AppError("REASON_REQUIRED", "Explain this verification change.", 422)
    if body.status == VerificationStatus.SUSPENDED:
        active = db.scalar(select(Rescue.id).outerjoin(MatchOffer, MatchOffer.rescue_id == Rescue.id).where(
            Rescue.status.in_(["CLAIMED", "COLLECTED"]),
            (Rescue.donor_organization_id == org.id) | ((MatchOffer.receiver_organization_id == org.id) & (MatchOffer.status == "ACCEPTED"))
        ).limit(1))
        if active:
            raise AppError("ACTIVE_HANDOFF", "Complete active handoffs before suspending this organization.", 409)
    from app.models.community import OrganizationAudit
    db.add(OrganizationAudit(organization_id=org.id, previous_status=org.verification_status, new_status=body.status.value, reason=body.reason.strip()))
    org.verification_status = body.status.value
    org.id_checked = body.status == VerificationStatus.VERIFIED and body.id_checked
    db.commit()
    return ok({"id": str(org.id), "verification_status": org.verification_status}, _request_id(request))


@router.post("/trust/recompute")
def recompute(request: Request, db: DbSession):
    count = compute_trust_scores(db)
    db.commit()
    return ok({"updated": count}, _request_id(request))
