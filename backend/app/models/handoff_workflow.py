"""Logistics coordination per accepted offer and opt-in feedback per delivery."""

import uuid

from sqlalchemy import ForeignKey, JSON, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.base_types import new_uuid


class PickupLogistics(Base):
    __tablename__ = "pickup_logistics"

    offer_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("match_offers.id", ondelete="CASCADE"), primary_key=True
    )
    donor_containers: Mapped[bool]
    donor_transport: Mapped[bool]
    receiver_containers: Mapped[bool]
    receiver_transport: Mapped[bool]
    arrangements: Mapped[dict] = mapped_column(JSON, default=dict)


class MealFeedback(Base):
    __tablename__ = "meal_feedback"

    rescue_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("rescues.id", ondelete="CASCADE"), primary_key=True
    )
    answers: Mapped[dict] = mapped_column(JSON)


class LogisticsProvider(Base):
    __tablename__ = "logistics_providers"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=new_uuid)
    name: Mapped[str] = mapped_column(String(120))
    contact: Mapped[str] = mapped_column(String(160))
    resource: Mapped[str] = mapped_column(String(16))
    service_area: Mapped[str] = mapped_column(String(120))
    max_servings: Mapped[int]
    refrigeration: Mapped[bool] = mapped_column(default=False)
    available: Mapped[bool] = mapped_column(default=True)
