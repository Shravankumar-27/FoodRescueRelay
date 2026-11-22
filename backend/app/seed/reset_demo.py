"""Clear transactional demo data, restore demo capacities, then re-seed.

Run from the backend folder:
    python -m app.seed.reset_demo

Users and organizations are kept. They are re-created idempotently by the seed.
"""

from sqlalchemy import delete, select

import app.models  # noqa: F401  - registers every model on Base.metadata
from app.db.session import SessionLocal
from app.models import FoodItem, Handoff, ImpactRecord, MatchOffer, Organization, ReceiverCapacity, Rescue, StatusEvent
from app.seed.init_db import _CAPACITIES, seed_demo
from app.models.chat_message import ChatMessage
from app.models.community import PartnerMessage, PartnerRating, OrganizationAudit
from app.models.recognition import DonationRecognition
from app.models.allocation import FoodAllocationPlan

# FK-safe order: children before parents.
_TRANSACTIONAL_TABLES = (
    FoodAllocationPlan,
    DonationRecognition,
    ChatMessage,
    PartnerMessage,
    PartnerRating,
    OrganizationAudit,
    ImpactRecord,
    StatusEvent,
    Handoff,
    MatchOffer,
    FoodItem,
    Rescue,
)


def reset_demo(session) -> None:
    """Delete transactional rows, restore capacities, and re-seed the demo data."""
    for model in _TRANSACTIONAL_TABLES:
        session.execute(delete(model))

    for name, (max_servings, need_level) in _CAPACITIES.items():
        org = session.execute(select(Organization).where(Organization.name == name)).scalar_one_or_none()
        if org is None:
            continue
        org.verification_status = "VERIFIED"
        capacity = session.execute(
            select(ReceiverCapacity).where(ReceiverCapacity.organization_id == org.id)
        ).scalar_one_or_none()
        if capacity is not None:
            capacity.available = True
            capacity.max_servings = max_servings
            capacity.available_servings = max_servings
            capacity.accepts_veg = True
            capacity.accepts_non_veg = True
            capacity.transport_available = True
            capacity.need_level = need_level
            capacity.accepted_dietary_types = []
            capacity.accepted_food_categories = []
            capacity.excluded_allergens = []
            capacity.description = ""

    seed_demo(session)


def main() -> None:
    session = SessionLocal()
    try:
        reset_demo(session)
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
    print("Demo data reset.")


if __name__ == "__main__":
    main()
