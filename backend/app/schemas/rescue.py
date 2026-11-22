"""Request schemas for posting surplus food (rescues)."""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Any

from pydantic import BaseModel, Field, StringConstraints, field_validator, model_validator

from app.models.enums import DietaryType, FoodCategory, HandlingType

ShortText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=160)]
AllergenName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=60)]


class FoodItemIn(BaseModel):
    name: ShortText
    quantity_servings: int = Field(ge=1, le=100000)
    dietary_type: DietaryType = DietaryType.UNKNOWN
    food_category: FoodCategory = FoodCategory.COOKED_MEAL
    allergens: list[AllergenName] = Field(default_factory=list, max_length=20)
    allergen_info_unknown: bool = False


class RescueCreate(BaseModel):
    # Presence/quantity rules are validated in rescue_service so they return
    # stable error codes (NO_FOOD_ITEMS, INVALID_QUANTITY, ...).
    food_items: list[FoodItemIn] = Field(default_factory=list)
    handling_type: HandlingType
    handling_notes: str | None = Field(default=None, max_length=500)
    untouched_confirmed: bool
    served_or_mixed_with_waste: bool = False
    packaging_available: bool = False
    donor_transport_available: bool = False
    safety_attestation: bool
    prepared_at: datetime
    pickup_by: datetime
    hold_hours: dict[FoodCategory, Annotated[float, Field(ge=0.5, le=3)]] = Field(default_factory=dict)
    idempotency_key: str = Field(min_length=8, max_length=64)
    latitude: float | None = None
    longitude: float | None = None
    locality: str | None = Field(default=None, max_length=200)
    private_address: str | None = Field(default=None, max_length=300)

    @model_validator(mode="before")
    @classmethod
    def _remap_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "handling_type" not in data and "holding_condition" in data:
                data["handling_type"] = data["holding_condition"]
            if "handling_notes" not in data and "notes" in data:
                data["handling_notes"] = data["notes"]
        return data

    @field_validator("latitude")
    @classmethod
    def _check_latitude(cls, value: float | None) -> float | None:
        if value is not None and not -90.0 <= value <= 90.0:
            raise ValueError("Latitude must be between -90 and 90.")
        return value

    @field_validator("longitude")
    @classmethod
    def _check_longitude(cls, value: float | None) -> float | None:
        if value is not None and not -180.0 <= value <= 180.0:
            raise ValueError("Longitude must be between -180 and 180.")
        return value
