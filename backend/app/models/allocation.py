"""Private receiver planning drafts; these never create delivery impact."""
import uuid
from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Integer, JSON, Uuid
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base
from app.models.base_types import new_uuid, utcnow


class FoodAllocationPlan(Base):
    __tablename__ = "food_allocation_plans"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=new_uuid)
    rescue_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("rescues.id"), unique=True)
    receiver_organization_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("organizations.id"))
    groups: Mapped[list] = mapped_column(JSON, default=list)
    revision: Mapped[int] = mapped_column(Integer, default=1)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
