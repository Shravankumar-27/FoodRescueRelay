"""Request bodies for receiver pickup and delivery."""

from __future__ import annotations

from pydantic import BaseModel, Field


class CollectRequest(BaseModel):
    pickup_code: str = Field(pattern=r"^\d{4}$")
    collected_servings: int = Field(ge=1, le=100000)


class DeliverRequest(BaseModel):
    delivered_servings: int = Field(ge=0, le=100000)
    rejected_servings: int = Field(ge=0, le=100000)
