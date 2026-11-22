"""ORM models package.

Importing this package registers the enums and every model module on
``app.db.base.Base.metadata`` so Alembic autogenerate can see them.
"""

from app.db.base import Base
from app.models.chat_message import ChatMessage
from app.models.enums import (
    DietaryType,
    FoodCategory,
    HandlingType,
    NeedLevel,
    OfferStatus,
    OrganizationType,
    RescueStatus,
    UserRole,
    VerificationStatus,
)
from app.models.handoff import Handoff
from app.models.impact import ImpactRecord
from app.models.offer import MatchOffer
from app.models.organization import Organization
from app.models.receiver_capacity import ReceiverCapacity
from app.models.rescue import FoodItem, Rescue
from app.models.status_event import StatusEvent
from app.models.user import User

__all__ = [
    "Base",
    "ChatMessage",
    "FoodItem",
    "Handoff",
    "ImpactRecord",
    "MatchOffer",
    "Organization",
    "ReceiverCapacity",
    "Rescue",
    "StatusEvent",
    "User",
]

from app.models.community import AllocationNotice, FavoritePartner, PartnerMessage, PartnerRating
from app.models.recognition import DonationRecognition
from app.models.allocation import FoodAllocationPlan
from app.models.handoff_workflow import LogisticsProvider, MealFeedback, PickupLogistics
