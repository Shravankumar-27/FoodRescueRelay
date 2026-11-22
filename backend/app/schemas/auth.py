"""Authentication request and response schemas."""

from typing import Annotated, Literal

from pydantic import BaseModel, EmailStr, Field, StringConstraints, field_validator

from app.models.enums import OrganizationType


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=200)


class SignupRequest(BaseModel):
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=72)
    organization_name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
    organization_type: Literal[
        OrganizationType.CATERER,
        OrganizationType.NGO,
        OrganizationType.COMMUNITY_KITCHEN,
        OrganizationType.SHELTER,
    ]
    locality: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
    street_address: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=250)]

    @field_validator("password")
    @classmethod
    def check_password_bytes(cls, password: str) -> str:
        if len(password.encode("utf-8")) > 72:
            raise ValueError("Password must be at most 72 bytes.")
        return password


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    role: str


class OrganizationOut(BaseModel):
    id: str
    name: str
    organization_type: str
    verification_status: str


class LoginResponse(BaseModel):
    token: str
    token_type: str = "bearer"
    user: UserOut
    organization: OrganizationOut


class MeResponse(BaseModel):
    user: UserOut
    organization: OrganizationOut
