"""Authentication routes: login and current-user lookup."""

from enum import Enum
from typing import Any

from fastapi import APIRouter, Request
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.api.responses import ok
from app.core.errors import AppError
from app.core.security import create_access_token, verify_password
from app.models import User
from app.schemas.auth import LoginRequest, LoginResponse, MeResponse, OrganizationOut, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


def _value(raw: Any) -> str:
    if isinstance(raw, Enum):
        return str(raw.value)
    return str(raw)


def _to_user_org(user: User) -> tuple[UserOut, OrganizationOut]:
    organization = user.organization
    user_out = UserOut(
        id=str(user.id),
        name=user.name,
        email=user.email,
        role=_value(user.role),
    )
    organization_out = OrganizationOut(
        id=str(organization.id),
        name=organization.name,
        organization_type=_value(organization.organization_type),
        verification_status=_value(organization.verification_status),
    )
    return user_out, organization_out


@router.post("/login")
def login(body: LoginRequest, request: Request, db: DbSession) -> dict[str, Any]:
    request_id = getattr(request.state, "request_id", "unknown")

    email = body.email.lower()
    user = db.scalar(select(User).where(User.email == email))
    if user is None or not verify_password(body.password, user.password_hash):
        raise AppError("INVALID_CREDENTIALS", "Email or password is incorrect.", 401)
    if not user.is_active:
        raise AppError("USER_INACTIVE", "This account is inactive.", 403)

    token = create_access_token(str(user.id), _value(user.role))
    user_out, organization_out = _to_user_org(user)
    response = LoginResponse(token=token, user=user_out, organization=organization_out)
    return ok(response.model_dump(), request_id)


@router.get("/me")
def me(request: Request, current_user: CurrentUser) -> dict[str, Any]:
    request_id = getattr(request.state, "request_id", "unknown")

    user_out, organization_out = _to_user_org(current_user)
    response = MeResponse(user=user_out, organization=organization_out)
    return ok(response.model_dump(), request_id)
