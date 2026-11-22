"""Organization model: caterers, NGOs, community kitchens, shelters, admin."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, CheckConstraint, DateTime, Float, String, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.base_types import new_uuid, utcnow
from app.models.enums import OrganizationType, VerificationStatus

if TYPE_CHECKING:  # pragma: no cover - typing only
    from app.models.receiver_capacity import ReceiverCapacity
    from app.models.user import User


_ORG_TYPE_VALUES = ", ".join(f"'{m.value}'" for m in OrganizationType)
_VERIFICATION_VALUES = ", ".join(f"'{m.value}'" for m in VerificationStatus)


class Organization(Base):
    __tablename__ = "organizations"
    __table_args__ = (
        CheckConstraint(
            f"organization_type IN ({_ORG_TYPE_VALUES})",
            name="organization_type_allowed",
        ),
        CheckConstraint(
            f"verification_status IN ({_VERIFICATION_VALUES})",
            name="verification_status_allowed",
        ),
        CheckConstraint(
            "reliability >= 0 AND reliability <= 1",
            name="reliability_range",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=new_uuid)
    name: Mapped[str] = mapped_column(String(200))
    organization_type: Mapped[str] = mapped_column(String(32))
    verification_status: Mapped[str] = mapped_column(
        String(32), default=VerificationStatus.PENDING.value
    )
    id_checked: Mapped[bool] = mapped_column(Boolean, default=False, server_default=text("false"))
    locality: Mapped[str] = mapped_column(String(200))
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    private_address: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    private_phone: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    reliability: Mapped[float] = mapped_column(Float, default=0.5)
    trust_score: Mapped[float] = mapped_column(Float, default=0.5)
    rank_badge: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, default="NEW")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    users: Mapped[list["User"]] = relationship(
        back_populates="organization",
        cascade="all, delete-orphan",
    )
    receiver_capacity: Mapped[Optional["ReceiverCapacity"]] = relationship(
        back_populates="organization",
        uselist=False,
        cascade="all, delete-orphan",
    )
