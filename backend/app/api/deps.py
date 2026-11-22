"""Authentication and role-based access dependencies."""

from collections.abc import Callable
from typing import Annotated
from uuid import UUID

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.errors import AppError
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models import User
from app.models.enums import UserRole

bearer = HTTPBearer(auto_error=False)


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise AppError("UNAUTHENTICATED", "Please sign in to continue.", 401)

    payload = decode_access_token(credentials.credentials)
    try:
        user_id = UUID(str(payload["sub"]))
    except (KeyError, ValueError, TypeError) as exc:
        raise AppError(
            "INVALID_TOKEN",
            "Your session is invalid or has expired. Please sign in again.",
            401,
        ) from exc

    user = db.scalar(select(User).options(joinedload(User.organization)).where(User.id == user_id))
    if user is None:
        raise AppError(
            "INVALID_TOKEN",
            "Your session is invalid or has expired. Please sign in again.",
            401,
        )
    if not user.is_active:
        raise AppError("USER_INACTIVE", "This account is inactive.", 403)
    if user.organization.verification_status == "SUSPENDED":
        raise AppError("ORGANIZATION_SUSPENDED", "This organization is suspended. Contact the administrator.", 403)
    return user


def require_roles(*roles: UserRole) -> Callable[..., User]:
    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise AppError(
                "FORBIDDEN",
                "You do not have permission to perform this action.",
                403,
            )
        return current_user

    return dependency


CurrentUser = Annotated[User, Depends(get_current_user)]
DbSession = Annotated[Session, Depends(get_db)]
