"""Create tables and seed synthetic demo data.

Run from the backend folder:
    python -m app.seed.init_db            # create tables + seed (idempotent)
    python -m app.seed.init_db --reset    # drop all tables, then create + seed

All names, emails and contact details below are fictional.
"""

import sys
import re
from datetime import datetime, timedelta, timezone

from sqlalchemy import or_, select, text

import app.models  # noqa: F401  - registers every model on Base.metadata
from app.core.security import hash_password
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models import AllocationNotice, PartnerMessage, FoodItem, Organization, ReceiverCapacity, Rescue, StatusEvent, User
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
DEMO_RESCUE_DISPLAY_ID = "FRR-10000001"
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
        "12-3 Silicon Valley, Madhapur",
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
        "Food Rescue Relay Admin",
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
_LEGACY_NAMES = {
    "donor@rescuerelay.demo": "Demo Donor",
    "hope@rescuerelay.demo": "Hope Demo",
    "shelter@rescuerelay.demo": "Shelter Demo",
    "cityfood@rescuerelay.demo": "City Food Demo",
    "admin@rescuerelay.demo": "Demo Admin",
}

_USERS = [
    ("donor@rescuerelay.demo", "Madhapur Grand Events", UserRole.DONOR.value, "Arjun Reddy"),
    ("hope@rescuerelay.demo", "Hope Community Kitchen", UserRole.RECEIVER.value, "Kavya Sharma"),
    ("shelter@rescuerelay.demo", "ShelterServe", UserRole.RECEIVER.value, "Anjali Rao"),
    ("cityfood@rescuerelay.demo", "City Food Relief", UserRole.RECEIVER.value, "Nikhil Varma"),
    ("admin@rescuerelay.demo", "Food Rescue Relay Admin", UserRole.ADMIN.value, "Aditi Mehta"),
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
        if org.private_address == "Demo venue address (synthetic)":
            org.private_address = address

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
        elif user.organization_id == orgs_by_name[org_name].id and user.name == _LEGACY_NAMES[email]:
            user.name = display_name


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
    # Keep existing UUID links intact while upgrading old unreadable display codes.
    from app.services.rescue_helpers import new_display_id
    used = set(session.scalars(select(Rescue.display_id)))
    for rescue in session.scalars(select(Rescue)):
        if rescue.handling_notes and rescue.handling_notes.startswith("Synthetic QA listing."):
            rescue.handling_notes = rescue.handling_notes.removeprefix("Synthetic QA listing.").strip() or None
        if rescue.display_id.startswith("RR-") and rescue.display_id[3:].isdigit():
            rescue.display_id = f"FRR-{rescue.display_id[3:]}"
        elif not rescue.display_id.removeprefix("FRR-").isdigit():
            candidate = new_display_id()
            while candidate in used:
                candidate = new_display_id()
            rescue.display_id = candidate
            used.add(candidate)
    for message, rescue in session.execute(
        select(PartnerMessage, Rescue).join(AllocationNotice, AllocationNotice.message_id == PartnerMessage.id)
        .join(Rescue, Rescue.id == AllocationNotice.rescue_id)
    ):
        if message.message.startswith(("Split proposal for RR-", "Updated split proposal for RR-", "Split proposal for FRR-", "Updated split proposal for FRR-")):
            message.message = re.sub(r"\b(?:RR|FRR)-[A-Z0-9]+\b", rescue.display_id, message.message, count=1)
    from app.services.trust_service import compute_trust_scores
    compute_trust_scores(session)


def init_database(*, include_history: bool = True) -> None:
    """Create all tables and seed demo data. Safe to run repeatedly."""
    Base.metadata.create_all(engine)
    from app.db.upgrade import upgrade_handoff_workflows, upgrade_schema, upgrade_spoilage
    with engine.begin() as connection:
        upgrade_schema(connection)
        upgrade_handoff_workflows(connection)
        upgrade_spoilage(connection)
    session = SessionLocal()
    try:
        from app.core.config import get_settings
        if get_settings().DEMO_MODE:
            seed_demo(session)
            if include_history:
                from app.seed.seed_extended import seed_extended
                seed_extended(session)
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
