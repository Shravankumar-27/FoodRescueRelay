"""ReceiverCapacity model: what a receiving organization can currently accept."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, String, Uuid, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.base_types import new_uuid, utcnow
from app.models.enums import NeedLevel

if TYPE_CHECKING:  # pragma: no cover - typing only
    from app.models.organization import Organization


_NEED_LEVEL_VALUES = ", ".join(f"'{m.value}'" for m in NeedLevel)


class ReceiverCapacity(Base):
    __tablename__ = "receiver_capacities"
    __table_args__ = (
        CheckConstraint("max_servings >= 0", name="max_servings_non_negative"),
        CheckConstraint(
            "available_servings >= 0 AND available_servings <= max_servings",
            name="available_servings_range",
        ),
        CheckConstraint(
            f"need_level IN ({_NEED_LEVEL_VALUES})",
            name="need_level_allowed",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=new_uuid)
    organization_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        unique=True,
    )
    available: Mapped[bool] = mapped_column(Boolean, default=False)
    max_servings: Mapped[int] = mapped_column(Integer)
    available_servings: Mapped[int] = mapped_column(Integer)
    accepts_veg: Mapped[bool] = mapped_column(Boolean, default=True)
    accepts_non_veg: Mapped[bool] = mapped_column(Boolean, default=True)
    transport_available: Mapped[bool] = mapped_column(Boolean, default=False)
    containers_available: Mapped[bool] = mapped_column(Boolean, default=True)
    refrigeration_available: Mapped[bool] = mapped_column(Boolean, default=False)
    volunteer_servings: Mapped[int | None] = mapped_column(Integer, nullable=True)
    need_level: Mapped[str] = mapped_column(String(16), default=NeedLevel.MEDIUM.value)
    accepted_dietary_types: Mapped[list] = mapped_column(JSON, default=list)
    accepted_food_categories: Mapped[list] = mapped_column(JSON, default=list)
    excluded_allergens: Mapped[list] = mapped_column(JSON, default=list)
    description: Mapped[str] = mapped_column(String(500), default="")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    organization: Mapped["Organization"] = relationship(
        back_populates="receiver_capacity"
    )
