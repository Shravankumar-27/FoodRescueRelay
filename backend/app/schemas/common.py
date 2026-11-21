"""Shared response schemas."""

from typing import Literal

from pydantic import BaseModel


class ErrorBody(BaseModel):
    code: str
    message: str


class ApiError(BaseModel):
    success: Literal[False] = False
    error: ErrorBody
    request_id: str
