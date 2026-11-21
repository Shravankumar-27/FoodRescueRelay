"""Create tables and seed synthetic demo data.

Run from the backend folder:
    python -m app.seed.init_db            # create tables + seed (idempotent)
    python -m app.seed.init_db --reset    # drop all tables, then create + seed

All names, emails and contact details below are fictional.
"""

import sys
from datetime import datetime, timedelta, timezone

from sqlalchemy import or_, select

import app.models  # noqa: F401  - registers every model on Base.metadata
from app.core.security import hash_password
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models import FoodItem, Organization, ReceiverCapacity, Rescue, StatusEvent, User
from app.models.base_types import new_uuid
from app.models.enums import (
    DietaryType,
    HandlingType,
    NeedLevel,
    OrganizationType,
    RescueStatus,
    UserRole,
    VerificationStatus,
)
from app.services.rescue_service import derive_dietary_type

DEMO_PASSWORD = "demo123"

# Marker for the demo rescue: a fixed display id and a fixed idempotency key.
DEMO_RESCUE_DISPLAY_ID = "RR-DEMO0001"
DEMO_RESCUE_IDEMPOTENCY_KEY = "demo-seed-madhapur-v1"
DEMO_RESCUE_DONOR = "Madhapur Grand Events"

# (name, organization_type, locality, lat, lon, reliability, private_address, private_phone)
_ORGANIZATIONS = [
    (
        "Madhapur Grand Events",
        OrganizationType.CATERER.value,
        "Madhapur, Hyderabad",
        17.4483,
        78.3915,
        0.95,
        "Demo venue address (synthetic)",
        "+910000000000",
    ),
    (
        "Hope Community Kitchen",
        OrganizationType.COMMUNITY_KITCHEN.value,
        "Madhapur, Hyderabad",
        17.4467,
        78.3852,
        0.96,
        None,
        None,
    ),
    (
        "ShelterServe",
        OrganizationType.SHELTER.value,
        "Kondapur, Hyderabad",
        17.4619,
        78.3564,
        0.98,
        None,
        None,
    ),
    (
        "City Food Relief",
        OrganizationType.NGO.value,
        "Hitech City, Hyderabad",
        17.4435,
        78.3772,
        0.91,
        None,
        None,
    ),
    (
        "RescueRelay Admin",
        OrganizationType.ADMIN.value,
        "Hyderabad",
        17.385,
        78.4867,
        0.5,
        None,
        None,
    ),
]

# organization name -> capacity fields (only receiving organizations have capacity)
_CAPACITIES = {
    "Hope Community Kitchen": (180, NeedLevel.HIGH.value),
    "ShelterServe": (80, NeedLevel.HIGH.value),
    "City Food Relief": (250, NeedLevel.MEDIUM.value),
}

# (email, organization name, role, display name)
_USERS = [
    ("donor@rescuerelay.demo", "Madhapur Grand Events", UserRole.DONOR.value, "Demo Donor"),
    ("hope@rescuerelay.demo", "Hope Community Kitchen", UserRole.RECEIVER.value, "Hope Demo"),
    ("shelter@rescuerelay.demo", "ShelterServe", UserRole.RECEIVER.value, "Shelter Demo"),
    ("cityfood@rescuerelay.demo", "City Food Relief", UserRole.RECEIVER.value, "City Food Demo"),
    ("admin@rescuerelay.demo", "RescueRelay Admin", UserRole.ADMIN.value, "Demo Admin"),
]


def _seed(session) -> None:
    orgs_by_name: dict[str, Organization] = {}

    for name, org_type, locality, lat, lon, reliability, address, phone in _ORGANIZATIONS:
        org = session.execute(
            select(Organization).where(Organization.name == name)
        ).scalar_one_or_none()
        if org is None:
            org = Organization(
                name=name,
                organization_type=org_type,
                verification_status=VerificationStatus.VERIFIED.value,
                locality=locality,
                latitude=lat,
                longitude=lon,
                private_address=address,
                private_phone=phone,
                reliability=reliability,
            )
            session.add(org)
            session.flush()
        orgs_by_name[name] = org

    for name, (max_servings, need_level) in _CAPACITIES.items():
        org = orgs_by_name[name]
        existing = session.execute(
            select(ReceiverCapacity).where(ReceiverCapacity.organization_id == org.id)
        ).scalar_one_or_none()
        if existing is None:
            session.add(
                ReceiverCapacity(
                    organization_id=org.id,
                    available=True,
                    max_servings=max_servings,
                    available_servings=max_servings,
                    accepts_veg=True,
                    accepts_non_veg=True,
                    transport_available=True,
                    need_level=need_level,
                )
            )

    password_hash = hash_password(DEMO_PASSWORD)
    for email, org_name, role, display_name in _USERS:
        email = email.lower()
        user = session.execute(select(User).where(User.email == email)).scalar_one_or_none()
        if user is None:
            session.add(
                User(
                    organization_id=orgs_by_name[org_name].id,
                    name=display_name,
                    email=email,
                    password_hash=password_hash,
                    role=role,
                    is_active=True,
                )
            )


def _seed_demo_rescue(session) -> None:
    """Create one POSTED demo rescue with relative times, if it does not exist yet."""
    existing = session.execute(
        select(Rescue.id).where(
            or_(
                Rescue.display_id == DEMO_RESCUE_DISPLAY_ID,
                Rescue.idempotency_key == DEMO_RESCUE_IDEMPOTENCY_KEY,
            )
        ).limit(1)
    ).scalar_one_or_none()
    if existing is not None:
        return

    donor = session.execute(
        select(Organization).where(Organization.name == DEMO_RESCUE_DONOR)
    ).scalar_one()

    now = datetime.now(timezone.utc)
    food_items = [
        FoodItem(
            id=new_uuid(),
            name="Veg Biryani",
            quantity_servings=100,
            dietary_type=DietaryType.VEG.value,
            allergens=["dairy"],
            allergen_info_unknown=False,
            created_at=now,
        ),
        FoodItem(
            id=new_uuid(),
            name="Dal",
            quantity_servings=40,
            dietary_type=DietaryType.VEG.value,
            allergens=[],
            allergen_info_unknown=False,
            created_at=now,
        ),
    ]

    rescue = Rescue(
        id=new_uuid(),
        display_id=DEMO_RESCUE_DISPLAY_ID,
        donor_organization_id=donor.id,
        status=RescueStatus.POSTED.value,
        prepared_at=now - timedelta(minutes=30),
        pickup_by=now + timedelta(minutes=50),
        handling_type=HandlingType.HOT_HELD.value,
        handling_notes=None,
        untouched_confirmed=True,
        packaging_available=True,
        safety_attestation=True,
        latitude=donor.latitude,
        longitude=donor.longitude,
        private_address=donor.private_address or "",
        locality=donor.locality,
        total_servings=sum(item.quantity_servings for item in food_items),
        dietary_type=derive_dietary_type([item.dietary_type for item in food_items]),
        idempotency_key=DEMO_RESCUE_IDEMPOTENCY_KEY,
        created_at=now,
        updated_at=now,
    )
    rescue.food_items = food_items
    session.add(rescue)
    session.flush()
    session.add(
        StatusEvent(
            rescue_id=rescue.id,
            actor_user_id=None,
            from_status=None,
            to_status=RescueStatus.POSTED.value,
            reason=None,
            created_at=now,
        )
    )
    session.flush()


def seed_demo(session) -> None:
    """Idempotently create demo orgs, capacities, users and the demo rescue."""
    _seed(session)
    _seed_demo_rescue(session)


def init_database() -> None:
    """Create all tables and seed demo data. Safe to run repeatedly."""
    Base.metadata.create_all(engine)
    session = SessionLocal()
    try:
        seed_demo(session)
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def reset_database() -> None:
    """Drop all tables, then create and seed again."""
    Base.metadata.drop_all(engine)
    init_database()


def _summary() -> str:
    session = SessionLocal()
    try:
        orgs = len(session.execute(select(Organization)).scalars().all())
        users = len(session.execute(select(User)).scalars().all())
        capacities = len(session.execute(select(ReceiverCapacity)).scalars().all())
    finally:
        session.close()
    return f"organizations={orgs} users={users} receiver_capacities={capacities}"


if __name__ == "__main__":
    if len(sys.argv) > 2 or (len(sys.argv) == 2 and sys.argv[1] != "--reset"):
        print("Usage: python -m app.seed.init_db [--reset]")
        sys.exit(2)
    if len(sys.argv) == 2 and sys.argv[1] == "--reset":
        reset_database()
    else:
        init_database()
    print(f"Database ready: {_summary()}")
