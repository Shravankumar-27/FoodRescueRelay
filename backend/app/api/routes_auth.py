"""Authentication routes for signup, login, and current-user lookup."""

from enum import Enum
from typing import Any

from fastapi import APIRouter, Request
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.api.deps import CurrentUser, DbSession
from app.api.responses import ok
from app.core.errors import AppError
from app.core.security import create_access_token, hash_password, verify_password
from app.models import Organization, User
from app.models.enums import OrganizationType, UserRole
from app.schemas.auth import LoginRequest, LoginResponse, MeResponse, OrganizationOut, SignupRequest, UserOut
from app.services.geo import SIGNUP_LOCALITIES

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


def _session_response(user: User, request_id: str) -> dict[str, Any]:
    token = create_access_token(str(user.id), _value(user.role))
    user_out, organization_out = _to_user_org(user)
    response = LoginResponse(token=token, user=user_out, organization=organization_out)
    return ok(response.model_dump(), request_id)


@router.get("/signup/localities")
def signup_localities(request: Request) -> dict[str, Any]:
    return ok(list(SIGNUP_LOCALITIES), getattr(request.state, "request_id", "unknown"))


@router.post("/signup", status_code=201)
def signup(body: SignupRequest, request: Request, db: DbSession) -> dict[str, Any]:
    coordinates = SIGNUP_LOCALITIES.get(body.locality)
    if coordinates is None:
        raise AppError("UNSUPPORTED_LOCALITY", "Choose a neighborhood from the signup list.", 422)
    email = body.email.lower()
    existing_account = select(User.id).where(User.email == email)
    if db.scalar(existing_account) is not None:
        raise AppError("EMAIL_IN_USE", "An account already uses this email. Sign in or use a different email.", 409)

    latitude, longitude = coordinates
    locality = f"{body.locality}, Hyderabad"
    organization = Organization(
        name=body.organization_name,
        organization_type=body.organization_type.value,
        locality=locality,
        latitude=latitude,
        longitude=longitude,
        private_address=f"{body.street_address}, {locality}",
    )
    role = UserRole.DONOR if body.organization_type == OrganizationType.CATERER else UserRole.RECEIVER
    user = User(
        name=body.name,
        email=email,
        password_hash=hash_password(body.password),
        role=role.value,
        organization=organization,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        if db.scalar(existing_account) is not None:
            raise AppError("EMAIL_IN_USE", "An account already uses this email. Sign in or use a different email.", 409) from exc
        raise

    return _session_response(user, getattr(request.state, "request_id", "unknown"))


@router.post("/login")
def login(body: LoginRequest, request: Request, db: DbSession) -> dict[str, Any]:
    request_id = getattr(request.state, "request_id", "unknown")

    email = body.email.lower()
    user = db.scalar(select(User).where(User.email == email))
    if user is None or not verify_password(body.password, user.password_hash):
        raise AppError("INVALID_CREDENTIALS", "Email or password is incorrect.", 401)
    if not user.is_active:
        raise AppError("USER_INACTIVE", "This account is inactive.", 403)

    return _session_response(user, request_id)


@router.get("/me")
def me(request: Request, current_user: CurrentUser) -> dict[str, Any]:
    request_id = getattr(request.state, "request_id", "unknown")

    user_out, organization_out = _to_user_org(current_user)
    response = MeResponse(user=user_out, organization=organization_out)
    return ok(response.model_dump(), request_id)
