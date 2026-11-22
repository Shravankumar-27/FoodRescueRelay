"""Receiver-authored acknowledgement of a completed donation."""
import uuid
from datetime import datetime
from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base
from app.models.base_types import new_uuid, utcnow


class DonationRecognition(Base):
    __tablename__ = "donation_recognitions"
    __table_args__ = (
        CheckConstraint("people_served IS NULL OR people_served >= 0", name="recognition_people_nonnegative"),
        CheckConstraint("food_rating IS NULL OR food_rating BETWEEN 1 AND 5", name="recognition_rating_range"),
    )
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=new_uuid)
    rescue_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("rescues.id"), unique=True)
    receiver_organization_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("organizations.id"), index=True)
    issued_by_user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"))
    public_token: Mapped[uuid.UUID] = mapped_column(Uuid, default=new_uuid, unique=True)
    people_served: Mapped[int | None] = mapped_column(Integer, nullable=True)
    food_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    message: Mapped[str] = mapped_column(String(280), default="")
    donor_name: Mapped[str] = mapped_column(String(200))
    receiver_name: Mapped[str] = mapped_column(String(200))
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    withdrawn_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
