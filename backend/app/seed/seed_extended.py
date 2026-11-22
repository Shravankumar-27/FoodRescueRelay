"""Extended seed: 15+ receiver orgs, 5+ donor orgs, 30+ historical rescues spanning 4 weeks.

Run from the backend folder:
    python -m app.seed.seed_extended        # adds extended data (idempotent)
    python -m app.seed.seed_extended --reset  # resets everything then seeds

All names, addresses, phone numbers are synthetic/fictional.
City: Hyderabad, Telangana.
"""

import sys
from datetime import datetime, timedelta, timezone
from random import Random

from sqlalchemy import select

import app.models  # noqa: F401
from app.core.security import hash_password
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models import AllocationNotice, DonationRecognition, FoodAllocationPlan, FoodItem, Handoff, ImpactRecord, LogisticsProvider, MatchOffer, MealFeedback, Organization, PartnerMessage, PartnerRating, PickupLogistics, ReceiverCapacity, Rescue, StatusEvent, User
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

# ── Extended organisations ──────────────────────────────────────────────────
# Donors: caterers / event venues across Hyderabad
_DONOR_ORGS = [
    ("Madhapur Grand Events",    "Madhapur, Hyderabad",         17.4483, 78.3915, 0.95, "12-3 Silicon Valley, Madhapur", "+919000000001"),
    ("Jubilee Hills Caterers",   "Jubilee Hills, Hyderabad",    17.4229, 78.4079, 0.92, "Road No 36, Jubilee Hills",    "+919000000002"),
    ("Hitech Banquets & Events", "Hitech City, Hyderabad",      17.4442, 78.3772, 0.88, "CyberPearl, Hitech City",      "+919000000003"),
    ("Banjara Feasts",           "Banjara Hills, Hyderabad",    17.4126, 78.4499, 0.90, "Road No 12, Banjara Hills",    "+919000000004"),
    ("Kondapur Catering Co.",    "Kondapur, Hyderabad",         17.4619, 78.3564, 0.85, "Plot 7, Kondapur",             "+919000000005"),
    ("Gachibowli Events Hub",    "Gachibowli, Hyderabad",       17.4400, 78.3489, 0.87, "Financial District, Gachibowli", "+919000000006"),
    ("Kukatpally Wedding Hall",  "Kukatpally, Hyderabad",       17.4949, 78.3996, 0.82, "KPHB Phase 1, Kukatpally",    "+919000000007"),
    ("Secunderabad Palace Catr.","Secunderabad, Hyderabad",     17.4474, 78.4985, 0.91, "MG Road, Secunderabad",       "+919000000008"),
    ("Lakeview Kitchen", "Madhapur, Hyderabad", 17.4502, 78.389, 0.88, None, None),
    ("Hillcrest Cafe", "Jubilee Hills, Hyderabad", 17.4301, 78.4102, 0.87, None, None),
    ("Silicon Square Kitchen", "Hitech City, Hyderabad", 17.448, 78.3774, 0.9, None, None),
    ("Banjara Table", "Banjara Hills, Hyderabad", 17.4171, 78.4387, 0.91, None, None),
    ("Botanical Kitchen", "Kondapur, Hyderabad", 17.467, 78.3618, 0.86, None, None),
    ("Greenwood Banquets", "Gachibowli, Hyderabad", 17.4372, 78.3559, 0.87, None, None),
    ("Westline Bakers", "Kukatpally, Hyderabad", 17.5, 78.4015, 0.84, None, None),
    ("Clocktower Kitchen", "Secunderabad, Hyderabad", 17.4438, 78.4939, 0.89, None, None),
]

# Receivers: NGOs, shelters, community kitchens
_RECEIVER_ORGS = [
    ("Hope Community Kitchen",   OrganizationType.COMMUNITY_KITCHEN.value, "Madhapur, Hyderabad",      17.4467, 78.3852, 0.96, 180, NeedLevel.HIGH.value,   True,  True, True),
    ("ShelterServe",             OrganizationType.SHELTER.value,           "Kondapur, Hyderabad",      17.4619, 78.3564, 0.98,  80, NeedLevel.HIGH.value,   True,  True, True),
    ("City Food Relief",         OrganizationType.NGO.value,               "Hitech City, Hyderabad",   17.4435, 78.3772, 0.91, 250, NeedLevel.MEDIUM.value, True,  True, True),
    ("Sunrise NGO",              OrganizationType.NGO.value,               "Jubilee Hills, Hyderabad", 17.4229, 78.4079, 0.89, 120, NeedLevel.HIGH.value,   True,  True, False),
    ("Helping Hands",            OrganizationType.NGO.value,               "Banjara Hills, Hyderabad", 17.4126, 78.4499, 0.93, 160, NeedLevel.HIGH.value,   True,  True, True),
    ("Green Table Kitchen",      OrganizationType.COMMUNITY_KITCHEN.value, "Gachibowli, Hyderabad",    17.4400, 78.3489, 0.87, 100, NeedLevel.MEDIUM.value, True,  False,True),
    ("Asha Kiran Shelter",       OrganizationType.SHELTER.value,           "Kukatpally, Hyderabad",    17.4949, 78.3996, 0.94,  60, NeedLevel.HIGH.value,   True,  True, False),
    ("Roti Bank Hyderabad",      OrganizationType.NGO.value,               "Secunderabad, Hyderabad",  17.4474, 78.4985, 0.90, 300, NeedLevel.HIGH.value,   True,  True, True),
    ("Annapurna Trust",          OrganizationType.NGO.value,               "Madhapur, Hyderabad",      17.4502, 78.3900, 0.88, 200, NeedLevel.MEDIUM.value, True,  True, True),
    ("Meals on Wheels HYD",      OrganizationType.COMMUNITY_KITCHEN.value, "Hitech City, Hyderabad",   17.4455, 78.3800, 0.95, 150, NeedLevel.HIGH.value,   True,  True, True),
    ("Nanakram Nagar Kitchen",   OrganizationType.COMMUNITY_KITCHEN.value, "Nanakramguda, Hyderabad",  17.4320, 78.3610, 0.85,  90, NeedLevel.MEDIUM.value, True,  False,False),
    ("Miyapur Food Bank",        OrganizationType.NGO.value,               "Miyapur, Hyderabad",       17.5003, 78.3515, 0.83, 120, NeedLevel.HIGH.value,   True,  True, False),
    ("Uppal Community Centre",   OrganizationType.COMMUNITY_KITCHEN.value, "Uppal, Hyderabad",         17.4051, 78.5590, 0.80,  70, NeedLevel.MEDIUM.value, True,  True, True),
    ("LB Nagar Shelter",         OrganizationType.SHELTER.value,           "LB Nagar, Hyderabad",      17.3523, 78.5476, 0.86,  50, NeedLevel.HIGH.value,   True,  True, False),
    ("Medchal Food Drive",       OrganizationType.NGO.value,               "Medchal, Hyderabad",       17.5929, 78.5121, 0.79, 110, NeedLevel.MEDIUM.value, True,  True, True),
]

_ADMIN_ORG = ("RescueRelay Admin", "Hyderabad", 17.385, 78.4867)

# (email, org_name, role, display_name)
_DONOR_USERS = [
    ("donor@rescuerelay.demo",       "Madhapur Grand Events",    UserRole.DONOR.value,  "Arjun Reddy"),
    ("jubilee@rescuerelay.demo",     "Jubilee Hills Caterers",   UserRole.DONOR.value,  "Priya Reddy"),
    ("hitech@rescuerelay.demo",      "Hitech Banquets & Events", UserRole.DONOR.value,  "Suresh Kumar"),
    ("banjara@rescuerelay.demo",     "Banjara Feasts",           UserRole.DONOR.value,  "Ravi Sharma"),
    ("kondapur@rescuerelay.demo",    "Kondapur Catering Co.",    UserRole.DONOR.value,  "Anita Patel"),
]

_RECEIVER_USERS = [
    ("hope@rescuerelay.demo",       "Hope Community Kitchen",   UserRole.RECEIVER.value, "Kavya Sharma"),
    ("shelter@rescuerelay.demo",    "ShelterServe",             UserRole.RECEIVER.value, "Anjali Rao"),
    ("cityfood@rescuerelay.demo",   "City Food Relief",         UserRole.RECEIVER.value, "Nikhil Varma"),
    ("sunrise@rescuerelay.demo",    "Sunrise NGO",              UserRole.RECEIVER.value, "Meena Krishnan"),
    ("helping@rescuerelay.demo",    "Helping Hands",            UserRole.RECEIVER.value, "Ramesh Nair"),
    ("green@rescuerelay.demo",      "Green Table Kitchen",      UserRole.RECEIVER.value, "Deepa Rao"),
    ("asha@rescuerelay.demo",       "Asha Kiran Shelter",       UserRole.RECEIVER.value, "Fatima Begum"),
    ("roti@rescuerelay.demo",       "Roti Bank Hyderabad",      UserRole.RECEIVER.value, "Vinod Mehta"),
]

_ADMIN_USER = ("admin@rescuerelay.demo", "RescueRelay Admin", UserRole.ADMIN.value, "Aditi Mehta")

# Food templates (name, dietary, allergens)
_FOOD_TEMPLATES = [
    ("Veg Biryani",           DietaryType.VEG.value,     ["dairy"]),
    ("Chicken Biryani",       DietaryType.NON_VEG.value, []),
    ("Dal Tadka",             DietaryType.VEG.value,     []),
    ("Paneer Butter Masala",  DietaryType.VEG.value,     ["dairy", "nuts"]),
    ("Chapati with Sabzi",    DietaryType.VEG.value,     ["gluten"]),
    ("Plain Rice",            DietaryType.VEG.value,     []),
    ("Mixed Veg Curry",       DietaryType.VEG.value,     []),
    ("Sambar",                DietaryType.VEG.value,     []),
    ("Haleem",                DietaryType.NON_VEG.value, ["gluten"]),
    ("Pulao",                 DietaryType.VEG.value,     []),
    ("Chicken Curry",         DietaryType.NON_VEG.value, []),
    ("Fried Rice",            DietaryType.VEG.value,     ["egg"]),
    ("Kesari / Halwa",        DietaryType.VEG.value,     ["dairy", "nuts"]),
    ("Idli Sambar",           DietaryType.VEG.value,     []),
    ("Poha",                  DietaryType.VEG.value,     []),
]

_HANDLING = [
    HandlingType.HOT_HELD.value,
    HandlingType.ROOM_TEMPERATURE.value,
    HandlingType.REFRIGERATED.value,
]


def _make_food_item(food_name: str, dietary: str, allergens: list, qty: int, now: datetime) -> FoodItem:
    return FoodItem(
        id=new_uuid(),
        name=food_name,
        quantity_servings=qty,
        dietary_type=dietary,
        allergens=allergens,
        allergen_info_unknown=False,
        created_at=now,
    )


def _ensure_org(session, name: str, org_type: str, locality: str,
                lat: float, lon: float, reliability: float,
                address: str | None, phone: str | None) -> Organization:
    org = session.execute(select(Organization).where(Organization.name == name)).scalar_one_or_none()
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
    return org


def _ensure_user(session, email: str, org_id: str, name: str,
                 role: str, password_hash: str) -> None:
    email = email.lower()
    if not session.execute(select(User).where(User.email == email)).scalar_one_or_none():
        session.add(User(
            organization_id=org_id,
            name=name,
            email=email,
            password_hash=password_hash,
            role=role,
            is_active=True,
        ))


def _ensure_capacity(session, org_id: str, max_servings: int, need_level: str,
                     accepts_veg: bool, accepts_non_veg: bool, transport: bool, index: int) -> None:
    if not session.execute(
        select(ReceiverCapacity).where(ReceiverCapacity.organization_id == org_id)
    ).scalar_one_or_none():
        session.add(ReceiverCapacity(
            organization_id=org_id,
            available=True,
            max_servings=max_servings,
            available_servings=max_servings,
            accepts_veg=accepts_veg,
            accepts_non_veg=accepts_non_veg,
            transport_available=transport,
            containers_available=index % 4 != 3,
            refrigeration_available=index % 3 == 1,
            volunteer_servings=max_servings // 2 if index % 4 == 2 else None,
            accepted_food_categories=["COOKED_MEAL", "BAKERY", "PACKAGED"] if index % 3 == 1 else [],
            accepted_dietary_types=["VEG", "VEGAN", "JAIN", "RAW_VEGAN"] if not accepts_non_veg else [],
            need_level=need_level,
        ))


def _make_historical_rescue(
    session,
    donor_org: Organization,
    days_ago: float,
    final_status: str,
    food_name: str,
    dietary: str,
    allergens: list,
    qty: int,
    handling: str,
    rng: Random,
    delivered_to: Organization | None = None,
) -> None:
    """Create a completed/expired/cancelled rescue for history."""
    now = datetime.now(timezone.utc)
    created_at = now - timedelta(days=days_ago)
    pickup_by = created_at + timedelta(hours=rng.randint(1, 3))
    display_id = f"RR-{rng.randint(10000, 99999):05d}"

    food_items = [_make_food_item(food_name, dietary, allergens, qty, created_at)]
    rescue = Rescue(
        id=new_uuid(),
        display_id=display_id,
        donor_organization_id=donor_org.id,
        status=final_status,
        prepared_at=created_at - timedelta(minutes=30),
        pickup_by=pickup_by,
        handling_type=handling,
        handling_notes=None,
        untouched_confirmed=True,
        packaging_available=True,
        safety_attestation=True,
        latitude=donor_org.latitude,
        longitude=donor_org.longitude,
        private_address=donor_org.private_address or "",
        locality=donor_org.locality,
        total_servings=qty,
        dietary_type=dietary,
        idempotency_key=f"demo-history-v1-{display_id}",
        created_at=created_at,
        updated_at=created_at,
    )
    rescue.food_items = food_items

    # Retain the legacy generator's sequence to recognize its existing demo rows.
    if final_status == RescueStatus.DELIVERED.value:
        rng.randint(1000, 9999)
        rng.randint(25, 90)
    events = [
        (RescueStatus.POSTED.value,    created_at),
        (RescueStatus.MATCHING.value,  created_at + timedelta(minutes=1)),
    ]
    if final_status == RescueStatus.DELIVERED.value:
        claim_at = created_at + timedelta(minutes=5)
        collect_at = claim_at + timedelta(minutes=rng.randint(15, 40))
        deliver_at = collect_at + timedelta(minutes=rng.randint(10, 30))
        events += [
            (RescueStatus.OFFERED.value,    claim_at - timedelta(minutes=1)),
            (RescueStatus.CLAIMED.value,    claim_at),
            (RescueStatus.COLLECTED.value,  collect_at),
            (RescueStatus.DELIVERED.value,  deliver_at),
        ]
        rescue.updated_at = deliver_at
    elif final_status == RescueStatus.EXPIRED.value:
        events.append((RescueStatus.EXPIRED.value, pickup_by + timedelta(minutes=1)))
        rescue.updated_at = pickup_by + timedelta(minutes=1)
    elif final_status == RescueStatus.CANCELLED.value:
        cancel_at = created_at + timedelta(minutes=rng.randint(2, 20))
        events.append((RescueStatus.CANCELLED.value, cancel_at))
        rescue.updated_at = cancel_at

    existing = session.scalar(select(Rescue).where(Rescue.display_id == display_id))
    if existing:
        if (existing.donor_organization_id != donor_org.id or existing.status != final_status
                or existing.total_servings != qty or not any(item.name == food_name for item in existing.food_items)
                or any(event.actor_user_id is not None for event in existing.status_events)):
            return
        if existing.idempotency_key == rescue.idempotency_key and existing.impact and existing.handoff:
            return
        rescue = existing
        times = {event.to_status: event.created_at for event in rescue.status_events}
    else:
        session.add(rescue)
        session.flush()
        previous = None
        for to_status, evt_at in events:
            session.add(StatusEvent(rescue_id=rescue.id, from_status=previous, to_status=to_status, created_at=evt_at))
            previous = to_status
        times = dict(events)
    if final_status == RescueStatus.DELIVERED.value and delivered_to and all(
        status in times for status in ("OFFERED", "CLAIMED", "COLLECTED", "DELIVERED")
    ):
        _seed_delivery(session, rescue, donor_org, delivered_to, qty, times)


def _seed_delivery(session, rescue, donor, receiver, quantity, times):
    offer = session.scalar(select(MatchOffer).where(MatchOffer.rescue_id == rescue.id, MatchOffer.status == "ACCEPTED"))
    if offer is None:
        session.add(MatchOffer(
            rescue_id=rescue.id, receiver_organization_id=receiver.id, status="ACCEPTED", rank=1,
            score=.85, proximity_score=.9, urgency_score=.8, need_score=.8, reliability_score=receiver.reliability,
            fairness_score=.7, estimated_distance_km=3, estimated_travel_minutes=15,
            offered_at=times["OFFERED"], claimed_at=times["CLAIMED"], created_at=times["OFFERED"],
            expires_at=times["COLLECTED"],
        ))
    elif offer.receiver_organization_id != receiver.id:
        return
    delivered = int(quantity * .95)
    if rescue.handoff is None:
        rescue.handoff = Handoff(
            collected_servings=quantity, delivered_servings=delivered, rejected_servings=quantity - delivered,
            created_at=times["CLAIMED"], collected_at=times["COLLECTED"], delivered_at=times["DELIVERED"],
        )
    if rescue.impact is None:
        rescue.impact = ImpactRecord(
            donor_organization_id=donor.id, receiver_organization_id=receiver.id,
            delivered_servings=delivered, created_at=times["DELIVERED"],
        )
    else:
        delivered = rescue.impact.delivered_servings
    rescue.idempotency_key = f"demo-history-v1-{rescue.display_id}"
    user = session.scalar(select(User).where(User.organization_id == receiver.id, User.role == "RECEIVER").limit(1))
    if user and not session.scalar(select(DonationRecognition.id).where(DonationRecognition.rescue_id == rescue.id)):
        session.add(DonationRecognition(
            rescue_id=rescue.id, receiver_organization_id=receiver.id, issued_by_user_id=user.id,
            people_served=delivered, food_rating=5 if quantity % 20 == 0 else 4, donor_name=donor.name,
            receiver_name=receiver.name, issued_at=times["DELIVERED"],
            message=f"Thank you for sharing {delivered} servings with our community.",
        ))
    if session.get(MealFeedback, rescue.id) is None:
        session.add(MealFeedback(rescue_id=rescue.id, answers={
            "taste": 5 if quantity % 20 == 0 else 4, "packaging": 4, "dietary_fit": 5,
            "staple_portion": "too_large" if quantity >= 100 else "about_right",
            "vegetable_portion": "too_small" if quantity >= 100 else "about_right",
        }))
    if receiver.name == "Hope Community Kitchen" and not session.scalar(
        select(FoodAllocationPlan.id).where(FoodAllocationPlan.rescue_id == rescue.id)
    ):
        session.add(FoodAllocationPlan(
            rescue_id=rescue.id, receiver_organization_id=receiver.id, updated_at=times["DELIVERED"],
            groups=[
                {"name": "Community lunch", "people": delivered // 2, "servings": delivered // 2, "dietary_notes": ""},
                {"name": "Evening service", "people": delivered - delivered // 2, "servings": delivered - delivered // 2, "dietary_notes": ""},
            ],
        ))
    for author, target in ((donor, receiver), (receiver, donor)):
        if not session.scalar(select(PartnerRating.id).where(
            PartnerRating.rescue_id == rescue.id, PartnerRating.author_org_id == author.id
        )):
            session.add(PartnerRating(rescue_id=rescue.id, author_org_id=author.id, target_org_id=target.id,
                                      stars=5 if quantity % 20 == 0 else 4, created_at=times["DELIVERED"]))


def seed_extended(session) -> None:
    """Idempotently add extended orgs, users, and 30+ historical rescues."""
    ph = hash_password(DEMO_PASSWORD)

    # Admin org
    admin_org = _ensure_org(session, _ADMIN_ORG[0], OrganizationType.ADMIN.value,
                             _ADMIN_ORG[1], _ADMIN_ORG[2], _ADMIN_ORG[3], 0.5, None, None)
    _ensure_user(session, _ADMIN_USER[0], admin_org.id, _ADMIN_USER[3], _ADMIN_USER[2], ph)

    # Donor orgs + users
    donor_orgs: list[Organization] = []
    for i, (name, locality, lat, lon, rel, addr, phone) in enumerate(_DONOR_ORGS):
        org = _ensure_org(session, name, OrganizationType.CATERER.value,
                          locality, lat, lon, rel, addr, phone)
        donor_orgs.append(org)
        if i < len(_DONOR_USERS):
            _ensure_user(session, _DONOR_USERS[i][0], org.id,
                         _DONOR_USERS[i][3], _DONOR_USERS[i][2], ph)

    # Receiver orgs + capacities + users
    receiver_orgs: list[Organization] = []
    for i, (name, org_type, locality, lat, lon, rel, max_srv, need, veg, nonveg, transport) in enumerate(_RECEIVER_ORGS):
        org = _ensure_org(session, name, org_type, locality, lat, lon, rel, None, None)
        receiver_orgs.append(org)
        _ensure_capacity(session, org.id, max_srv, need, veg, nonveg, transport, i)
        if i < len(_RECEIVER_USERS):
            _ensure_user(session, _RECEIVER_USERS[i][0], org.id,
                         _RECEIVER_USERS[i][3], _RECEIVER_USERS[i][2], ph)

    session.flush()

    # Historical rescues spanning four weeks. Append entries to preserve existing IDs.
    history = [
        # (days_ago, status, food_idx, donor_idx, receiver_idx, qty)
        (28, RescueStatus.DELIVERED.value, 0, 0, 0, 100),
        (27, RescueStatus.DELIVERED.value, 1, 1, 1, 80),
        (26, RescueStatus.EXPIRED.value,   2, 2, None, 60),
        (25, RescueStatus.DELIVERED.value, 3, 3, 2, 120),
        (24, RescueStatus.DELIVERED.value, 4, 0, 3, 90),
        (23, RescueStatus.CANCELLED.value, 5, 4, None, 50),
        (22, RescueStatus.DELIVERED.value, 6, 1, 4, 150),
        (21, RescueStatus.DELIVERED.value, 7, 2, 0, 70),
        (20, RescueStatus.EXPIRED.value,   8, 5, None, 40),
        (19, RescueStatus.DELIVERED.value, 9, 6, 5, 110),
        (18, RescueStatus.DELIVERED.value, 10, 7, 1, 85),
        (17, RescueStatus.DELIVERED.value, 11, 0, 6, 200),
        (16, RescueStatus.CANCELLED.value, 12, 3, None, 55),
        (15, RescueStatus.DELIVERED.value, 13, 1, 7, 95),
        (14, RescueStatus.DELIVERED.value, 14, 2, 0, 130),
        (13, RescueStatus.DELIVERED.value, 0,  4, 2, 100),
        (12, RescueStatus.EXPIRED.value,   1,  5, None, 75),
        (11, RescueStatus.DELIVERED.value, 2,  6, 3, 160),
        (10, RescueStatus.DELIVERED.value, 3,  7, 4, 90),
        (9,  RescueStatus.DELIVERED.value, 4,  0, 5, 110),
        (8,  RescueStatus.CANCELLED.value, 5,  1, None, 45),
        (7,  RescueStatus.DELIVERED.value, 6,  2, 6, 180),
        (6,  RescueStatus.DELIVERED.value, 7,  3, 7, 95),
        (5,  RescueStatus.DELIVERED.value, 8,  4, 0, 120),
        (4,  RescueStatus.DELIVERED.value, 9,  5, 1, 85),
        (3,  RescueStatus.EXPIRED.value,   10, 6, None, 60),
        (2,  RescueStatus.DELIVERED.value, 11, 7, 2, 140),
        (1.5,RescueStatus.DELIVERED.value, 12, 0, 3, 100),
        (1,  RescueStatus.DELIVERED.value, 13, 1, 4, 75),
        (0.5,RescueStatus.DELIVERED.value, 14, 2, 5, 90),
        (27, RescueStatus.DELIVERED.value, 0, 8, 0, 72),
        (25, RescueStatus.DELIVERED.value, 7, 9, 3, 56),
        (21, RescueStatus.DELIVERED.value, 6, 10, 2, 94),
        (17, RescueStatus.DELIVERED.value, 9, 11, 4, 63),
        (13, RescueStatus.DELIVERED.value, 4, 12, 1, 54),
        (9, RescueStatus.DELIVERED.value, 3, 13, 5, 88),
        (5, RescueStatus.DELIVERED.value, 1, 14, 6, 44),
        (2, RescueStatus.DELIVERED.value, 12, 15, 7, 68),
    ]

    rng = Random(42)
    for days_ago, status, food_idx, donor_idx, recv_idx, qty in history:
        food_name, dietary, allergens = _FOOD_TEMPLATES[food_idx % len(_FOOD_TEMPLATES)]
        donor_org = donor_orgs[donor_idx % len(donor_orgs)]
        recv_org = receiver_orgs[recv_idx % len(receiver_orgs)] if recv_idx is not None else None
        handling = _HANDLING[rng.randint(0, len(_HANDLING) - 1)]
        _make_historical_rescue(
            session, donor_org, days_ago, status,
            food_name, dietary, allergens, qty, handling, rng,
            delivered_to=recv_org,
        )

    session.flush()
    _seed_active_scenarios(session, donor_orgs, receiver_orgs)
    from app.services.trust_service import compute_trust_scores
    compute_trust_scores(session)


def _seed_active_scenarios(session, donors, receivers):
    from app.services.handoff_service import store_pickup_code
    from app.services.rescue_helpers import new_display_id
    now = datetime.now(timezone.utc)
    descriptions = (
        ("split", donors[0], "Vegetable pulao", "VEG", 200, "COOKED_MEAL", "HOT_HELD"),
        ("bakery", donors[1], "Wheat rolls", "VEG", 40, "BAKERY", "ROOM_TEMPERATURE"),
        ("cold", donors[3], "Chilled fruit cups", "VEGAN", 35, "FRUIT_VEG", "REFRIGERATED"),
        ("support", donors[4], "Dal and rice", "VEG", 45, "COOKED_MEAL", "HOT_HELD"),
    )
    for label, donor, name, diet, quantity, category, handling in descriptions:
        prefix = f"demo-scenario-{label}-"
        if session.scalar(select(Rescue.id).where(
            Rescue.donor_organization_id == donor.id,
            Rescue.idempotency_key.startswith(prefix), Rescue.pickup_by > now,
        ).limit(1)):
            continue
        key = f"{prefix}{now:%Y%m%d%H%M}"
        item = _make_food_item(name, diet, ["gluten"] if label == "bakery" else [], quantity, now)
        item.food_category = category
        rescue = Rescue(
            id=new_uuid(), display_id=new_display_id(), donor_organization_id=donor.id, status="POSTED",
            prepared_at=now - timedelta(minutes=20), pickup_by=now + timedelta(minutes=100),
            handling_type=handling, untouched_confirmed=True, packaging_available=label != "support",
            safety_attestation=True, latitude=donor.latitude, longitude=donor.longitude, locality=donor.locality,
            private_address=donor.private_address or "", total_servings=quantity, dietary_type=derive_dietary_type([diet]),
            idempotency_key=key, created_at=now, updated_at=now, food_items=[item],
        )
        session.add(rescue)
        session.flush()
        session.add(StatusEvent(rescue_id=rescue.id, to_status="POSTED", created_at=now))
        if label == "split":
            message = PartnerMessage(sender_org_id=donor.id, recipient_org_id=receivers[0].id,
                                     message=f"Split proposal for {rescue.display_id} · 30 servings", created_at=now)
            session.add(message)
            session.flush()
            session.add(AllocationNotice(message_id=message.id, rescue_id=rescue.id, items=[{
                "id": str(item.id), "name": item.name, "diet": item.dietary_type, "servings": 30,
            }]))
        if label == "support":
            rescue.status = "CLAIMED"
            offer = MatchOffer(
                rescue_id=rescue.id, receiver_organization_id=receivers[6].id, rank=1,
                score=.8, proximity_score=.8, urgency_score=.8, need_score=.8, reliability_score=.8,
                fairness_score=.8, estimated_distance_km=5, estimated_travel_minutes=20,
                status="ACCEPTED", offered_at=now, expires_at=rescue.pickup_by, claimed_at=now, created_at=now,
            )
            session.add(offer)
            session.flush()
            session.add(PickupLogistics(offer_id=offer.id, donor_containers=False, donor_transport=False,
                                        receiver_containers=False, receiver_transport=False, arrangements={}))
            handoff = Handoff(rescue_id=rescue.id, pickup_code_expires_at=rescue.pickup_by)
            store_pickup_code(handoff, "4826")
            session.add(handoff)
            session.add(StatusEvent(rescue_id=rescue.id, from_status="POSTED", to_status="CLAIMED",
                                    created_at=now + timedelta(microseconds=1)))
    for name, resource in (("Demo Container Bank", "containers"), ("Demo Community Courier", "transport")):
        if not session.scalar(select(LogisticsProvider.id).where(LogisticsProvider.name == name)):
            session.add(LogisticsProvider(
                name=name, contact=f"{resource}@rescuerelay.example", resource=resource,
                service_area="Hyderabad", max_servings=300, refrigeration=True, available=True,
            ))
    session.flush()


def init_extended() -> None:
    """Create all tables and seed extended data. Safe to run repeatedly."""
    from app.seed.init_db import init_database
    init_database()
    print("Extended seed complete.")


def reset_extended() -> None:
    """Drop all tables, then create + seed with extended data."""
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    session = SessionLocal()
    try:
        from app.seed.init_db import seed_demo
        seed_demo(session)
        seed_extended(session)
        session.commit()
        print("Reset + extended seed complete.")
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--reset":
        reset_extended()
    else:
        init_extended()
