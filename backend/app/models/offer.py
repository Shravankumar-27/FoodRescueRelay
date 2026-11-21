from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Uuid,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.base_types import new_uuid, utcnow

OFFER_STATUSES = ("PENDING", "ACCEPTED", "DECLINED", "TIMED_OUT", "CANCELLED")


class MatchOffer(Base):
    __tablename__ = "match_offers"
    __table_args__ = (
        CheckConstraint("rank >= 1", name="ck_match_offers_rank_positive"),
        CheckConstraint(
            "status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'TIMED_OUT', 'CANCELLED')",
            name="ck_match_offers_status",
        ),
        Index("ix_match_offers_receiver_status", "receiver_organization_id", "status"),
        Index(
            "uq_one_accepted_offer_per_rescue",
            "rescue_id",
            unique=True,
            sqlite_where=text("status = 'ACCEPTED'"),
            postgresql_where=text("status = 'ACCEPTED'"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=new_uuid)
    rescue_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("rescues.id", ondelete="CASCADE"),
        index=True,
    )
    receiver_organization_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("organizations.id", ondelete="CASCADE"),
    )
    rank: Mapped[int] = mapped_column(Integer)
    score: Mapped[float] = mapped_column(Float)
    proximity_score: Mapped[float] = mapped_column(Float)
    urgency_score: Mapped[float] = mapped_column(Float)
    need_score: Mapped[float] = mapped_column(Float)
    reliability_score: Mapped[float] = mapped_column(Float)
    fairness_score: Mapped[float] = mapped_column(Float)
    estimated_distance_km: Mapped[float] = mapped_column(Float)
    estimated_travel_minutes: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(16), default="PENDING")
    offered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    claimed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    rescue: Mapped["Rescue"] = relationship("Rescue", back_populates="offers")
    receiver_organization: Mapped["Organization"] = relationship("Organization")
