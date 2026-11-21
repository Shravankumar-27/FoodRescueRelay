"""ChatMessage model: simple in-app messaging between donor and receiver on a rescue."""
from __future__ import annotations
import uuid
from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, String, Text, Uuid, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base
from app.models.base_types import new_uuid, utcnow


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=new_uuid)
    rescue_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("rescues.id", ondelete="CASCADE"), index=True)
    sender_org_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("organizations.id", ondelete="CASCADE"))
    sender_name: Mapped[str] = mapped_column(String(200))
    sender_role: Mapped[str] = mapped_column(String(16))
    message: Mapped[str] = mapped_column(Text)
    is_suggested: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
