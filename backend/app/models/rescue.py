from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.base_types import new_uuid, utcnow

RESCUE_STATUSES = ("POSTED", "MATCHING", "OFFERED", "CLAIMED", "COLLECTED", "DELIVERED", "EXPIRED", "CANCELLED")
HANDLING_TYPES = ("HOT_HELD", "REFRIGERATED", "ROOM_TEMPERATURE", "OTHER", "UNKNOWN")
DIETARY_TYPES = ("VEG", "NON_VEG", "VEGAN", "OTHER", "UNKNOWN")


def _in_check(column: str, values: tuple[str, ...]) -> str:
    quoted = ", ".join(f"'{v}'" for v in values)
    return f"{column} IN ({quoted})"


class Rescue(Base):
    __tablename__ = "rescues"
    __table_args__ = (
        UniqueConstraint("donor_organization_id", "idempotency_key", name="uq_rescue_donor_idempotency"),
        CheckConstraint("total_servings > 0", name="ck_rescues_total_servings_positive"),
        CheckConstraint("pickup_by > created_at", name="ck_rescues_pickup_after_created"),
        CheckConstraint(_in_check("status", RESCUE_STATUSES), name="ck_rescues_status"),
        CheckConstraint(_in_check("handling_type", HANDLING_TYPES), name="ck_rescues_handling_type"),
        CheckConstraint(_in_check("dietary_type", DIETARY_TYPES), name="ck_rescues_dietary_type"),
        Index("ix_rescues_status", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=new_uuid)
    display_id: Mapped[str] = mapped_column(String(12), unique=True, index=True)
    donor_organization_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("organizations.id", ondelete="RESTRICT"),
        index=True,
    )
    status: Mapped[str] = mapped_column(String(20), default="POSTED")
    prepared_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    pickup_by: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    handling_type: Mapped[str] = mapped_column(String(24), default="UNKNOWN")
    handling_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    untouched_confirmed: Mapped[bool] = mapped_column(Boolean)
    packaging_available: Mapped[bool] = mapped_column(Boolean)
    safety_attestation: Mapped[bool] = mapped_column(Boolean)
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    private_address: Mapped[str] = mapped_column(String(300))
    locality: Mapped[str] = mapped_column(String(200))
    total_servings: Mapped[int] = mapped_column(Integer)
    dietary_type: Mapped[str] = mapped_column(String(16))
    idempotency_key: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    food_items: Mapped[list["FoodItem"]] = relationship(
        "FoodItem",
        back_populates="rescue",
        cascade="all, delete-orphan",
        order_by="FoodItem.id",
    )
    offers: Mapped[list["MatchOffer"]] = relationship(
        "MatchOffer",
        back_populates="rescue",
    )
    handoff: Mapped[Optional["Handoff"]] = relationship(
        "Handoff",
        back_populates="rescue",
        uselist=False,
    )
    status_events: Mapped[list["StatusEvent"]] = relationship(
        "StatusEvent",
        back_populates="rescue",
        order_by="StatusEvent.created_at",
    )
    impact: Mapped[Optional["ImpactRecord"]] = relationship(
        "ImpactRecord",
        back_populates="rescue",
        uselist=False,
    )


class FoodItem(Base):
    __tablename__ = "food_items"
    __table_args__ = (
        CheckConstraint("quantity_servings > 0", name="ck_food_items_quantity_positive"),
        CheckConstraint(_in_check("dietary_type", DIETARY_TYPES), name="ck_food_items_dietary_type"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=new_uuid)
    rescue_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("rescues.id", ondelete="CASCADE"),
        index=True,
    )
    name: Mapped[str] = mapped_column(String(160))
    quantity_servings: Mapped[int] = mapped_column(Integer)
    dietary_type: Mapped[str] = mapped_column(String(16))
    allergens: Mapped[list] = mapped_column(JSON, default=list)
    allergen_info_unknown: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    rescue: Mapped["Rescue"] = relationship("Rescue", back_populates="food_items")
