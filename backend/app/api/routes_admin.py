"""Admin routes: read-only operational views. No private contact or address fields."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import select

from app.api.deps import DbSession, require_roles
from app.api.responses import ok
from app.models.enums import UserRole
from app.models.organization import Organization
from app.models.rescue import Rescue
from app.services.rescue_service import iso_utc

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
    items = [
        {
            "id": str(org.id),
            "name": org.name,
            "organization_type": org.organization_type,
            "verification_status": org.verification_status,
            "locality": org.locality,
            "reliability": org.reliability,
            "created_at": iso_utc(org.created_at),
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
