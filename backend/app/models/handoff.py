from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.base_types import new_uuid, utcnow


class Handoff(Base):
    __tablename__ = "handoffs"
    __table_args__ = (
        CheckConstraint(
            "pickup_code_attempts >= 0",
            name="ck_handoffs_pickup_code_attempts_nonnegative",
        ),
        CheckConstraint(
            "delivered_servings IS NULL OR delivered_servings >= 0",
            name="ck_handoffs_delivered_servings_nonnegative",
        ),
        CheckConstraint(
            "rejected_servings IS NULL OR rejected_servings >= 0",
            name="ck_handoffs_rejected_servings_nonnegative",
        ),
        CheckConstraint(
            "collected_servings IS NULL OR delivered_servings IS NULL OR collected_servings >= delivered_servings",
            name="ck_handoffs_collected_gte_delivered",
        ),
        CheckConstraint(
            "collected_servings IS NULL OR delivered_servings IS NULL OR rejected_servings IS NULL "
            "OR delivered_servings + rejected_servings <= collected_servings",
            name="ck_handoffs_delivered_rejected_lte_collected",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=new_uuid)
    rescue_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("rescues.id", ondelete="CASCADE"),
        unique=True,
    )
    pickup_code_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    # Fernet-encrypted copy of the pickup code, shown back to the donor only.
    pickup_code_display: Mapped[str | None] = mapped_column(String(255), nullable=True)
    pickup_code_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    pickup_code_attempts: Mapped[int] = mapped_column(Integer, default=0)
    collected_servings: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    delivered_servings: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    rejected_servings: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    collected_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    delivered_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    rescue: Mapped["Rescue"] = relationship("Rescue", back_populates="handoff")
