"""Authentication request and response schemas."""

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=200)


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
