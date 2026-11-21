"""Impact routes: donor-scoped summary, and the platform-wide aggregate for admins."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Request

from app.api.deps import DbSession, require_roles
from app.api.responses import ok
from app.models.base_types import utcnow
from app.models.enums import UserRole
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
    user: User = Depends(require_roles(UserRole.DONOR, UserRole.ADMIN)),
) -> dict[str, Any]:
    donor_org_id = None if is_admin(user) else user.organization_id
    data = impact_summary(db, donor_org_id, None, utcnow())
    return ok(data, _request_id(request))
