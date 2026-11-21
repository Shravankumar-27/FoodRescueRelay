"""Impact routes: donor-scoped summary, and the platform-wide aggregate for admins."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Request
from sqlalchemy import func, select

from app.api.deps import DbSession, require_roles
from app.api.responses import ok
from app.models.base_types import utcnow
from app.models.enums import OrganizationType, RescueStatus, UserRole
from app.models.impact import ImpactRecord
from app.models.organization import Organization
from app.models.rescue import Rescue
from app.models.user import User
from app.services.impact_service import impact_summary
from app.services.rescue_service import is_admin

router = APIRouter(prefix="/impact", tags=["impact"])


def _request_id(request: Request) -> str:
    return getattr(request.state, "request_id", "unknown")


@router.get("/summary")
def get_impact_summary(
    request: Request,
    db: DbSession,
    user: User = Depends(require_roles(UserRole.DONOR, UserRole.RECEIVER, UserRole.ADMIN)),
) -> dict[str, Any]:
    donor_org_id = user.organization_id if user.role == "DONOR" else None
    receiver_org_id = user.organization_id if user.role == "RECEIVER" else None
    data = impact_summary(db, donor_org_id, receiver_org_id, utcnow())
    return ok(data, _request_id(request))


@router.get("/leaderboard")
def get_leaderboard(
    request: Request,
    db: DbSession,
    user: User = Depends(require_roles(UserRole.DONOR, UserRole.RECEIVER, UserRole.ADMIN)),
) -> dict[str, Any]:
    from app.services.trust_service import trust_details
    result = {"donors": [], "receivers": []}
    for org in db.scalars(select(Organization).where(Organization.organization_type != "ADMIN", Organization.verification_status == "VERIFIED")).all():
        donor = org.organization_type == "CATERER"
        field = ImpactRecord.donor_organization_id if donor else ImpactRecord.receiver_organization_id
        meals = int(db.scalar(select(func.sum(ImpactRecord.delivered_servings)).where(field == org.id)) or 0)
        details = trust_details(db, org)
        result["donors" if donor else "receivers"].append({"id": str(org.id), "name": org.name, "locality": org.locality,
            "meals": meals, "rescues": details["completed_rescues"], "reliability": org.reliability,
            "badge": details["rank_badge"], **details})
    for entries in result.values():
        entries.sort(key=lambda x: (-x["meals"], -x["trust_score"], x["name"]))
        for i, entry in enumerate(entries):
            entry["rank"] = i + 1
    return ok(result, _request_id(request))


@router.get("/community")
def community_impact(request: Request, db: DbSession):
    data = impact_summary(db, None, None, utcnow())
    data.pop("recent_completed", None)
    return ok(data, _request_id(request))


@router.get("/report/donor")
def donor_report(request: Request, db: DbSession, user: User = Depends(require_roles(UserRole.DONOR))):
    import csv
    import io
    from fastapi.responses import Response
    rows = db.execute(select(Rescue.display_id, ImpactRecord.created_at, ImpactRecord.delivered_servings).join(ImpactRecord, ImpactRecord.rescue_id == Rescue.id).where(Rescue.donor_organization_id == user.organization_id).order_by(ImpactRecord.created_at.desc())).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Rescue", "Confirmed at (UTC)", "Delivered meals", "Estimated food kg (0.4 kg/meal)", "Estimated CO2e kg (2.5 kg/kg)"])
    for code, at, meals in rows:
        writer.writerow([code, at.isoformat(), meals, round(meals * .4, 1), round(meals * .4 * 2.5, 1)])
    return Response(output.getvalue(), media_type="text/csv", headers={"Content-Disposition": 'attachment; filename="rescuerelay-impact.csv"'})
