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

# FK-safe order: children before parents.
_TRANSACTIONAL_TABLES = (
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

    for name, (max_servings, _need_level) in _CAPACITIES.items():
        org = session.execute(select(Organization).where(Organization.name == name)).scalar_one_or_none()
        if org is None:
            continue
        capacity = session.execute(
            select(ReceiverCapacity).where(ReceiverCapacity.organization_id == org.id)
        ).scalar_one_or_none()
        if capacity is not None:
            capacity.available_servings = max_servings

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
