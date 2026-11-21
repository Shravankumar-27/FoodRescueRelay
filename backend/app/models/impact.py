from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.base_types import new_uuid, utcnow


class ImpactRecord(Base):
    __tablename__ = "impact_records"
    __table_args__ = (
        CheckConstraint("delivered_servings >= 0", name="ck_impact_records_delivered_servings_nonnegative"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=new_uuid)
    rescue_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("rescues.id", ondelete="CASCADE"),
        unique=True,
    )
    donor_organization_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("organizations.id", ondelete="RESTRICT"),
        index=True,
    )
    receiver_organization_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("organizations.id", ondelete="RESTRICT"),
        index=True,
    )
    delivered_servings: Mapped[int] = mapped_column(Integer)
    confirmed_kg: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    calculation_version: Mapped[str] = mapped_column(String(16), default="v1")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    rescue: Mapped["Rescue"] = relationship("Rescue", back_populates="impact")
