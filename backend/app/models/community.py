"""Private partner messages and ratings from completed handoffs."""
import uuid
from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Uuid, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base
from app.models.base_types import new_uuid, utcnow


class PartnerMessage(Base):
    __tablename__ = "partner_messages"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=new_uuid)
    sender_org_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("organizations.id"), index=True)
    recipient_org_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("organizations.id"), index=True)
    message: Mapped[str] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class AllocationNotice(Base):
    __tablename__ = "allocation_notices"

    message_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("partner_messages.id", ondelete="CASCADE"), primary_key=True
    )
    rescue_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("rescues.id", ondelete="CASCADE"), index=True
    )
    items: Mapped[list[dict]] = mapped_column(JSON)


class FavoritePartner(Base):
    __tablename__ = "favorite_partners"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("organizations.id", ondelete="CASCADE"), primary_key=True
    )


class PartnerRating(Base):
    __tablename__ = "partner_ratings"
    __table_args__ = (UniqueConstraint("rescue_id", "author_org_id"), CheckConstraint("stars >= 1 AND stars <= 5", name="rating_stars_range"))
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=new_uuid)
    rescue_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("rescues.id"))
    author_org_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("organizations.id"))
    target_org_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("organizations.id"), index=True)
    stars: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class OrganizationAudit(Base):
    __tablename__ = "organization_audits"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=new_uuid)
    organization_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("organizations.id"))
    previous_status: Mapped[str] = mapped_column(String(32))
    new_status: Mapped[str] = mapped_column(String(32))
    reason: Mapped[str] = mapped_column(String(300))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
