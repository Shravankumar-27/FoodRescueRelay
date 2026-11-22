"""Idempotent, synthetic champion history for the two primary demo accounts.

Run `python -m app.seed.seed_champions` to add only these records to an existing
demo database. Never changes medal rules or awards coins outside delivered meals.
"""
from datetime import timedelta

from sqlalchemy import select

from app.core.config import get_settings
from app.models import DonationRecognition, FoodItem, Handoff, ImpactRecord, MatchOffer, Organization, Rescue, StatusEvent, User
from app.models.base_types import new_uuid, utcnow
from app.services.rescue_helpers import new_display_id

PREFIX = "demo-champion-v1-"
DELIVERIES = 40
SERVINGS = 140


def seed_champions(session) -> int:
    if not get_settings().DEMO_MODE:
        raise ValueError("Champion samples are available only in demo mode.")
    accounts = {u.email: u for u in session.scalars(select(User).where(
        User.email.in_(["donor@rescuerelay.demo", "hope@rescuerelay.demo"])
    ))}
    donor_user, receiver_user = accounts.get("donor@rescuerelay.demo"), accounts.get("hope@rescuerelay.demo")
    if not donor_user or not receiver_user or donor_user.role != "DONOR" or receiver_user.role != "RECEIVER":
        raise ValueError("Seed the primary synthetic donor and receiver accounts first.")
    donor = session.get(Organization, donor_user.organization_id)
    receiver = session.get(Organization, receiver_user.organization_id)
    existing = set(session.scalars(select(Rescue.idempotency_key).where(Rescue.idempotency_key.startswith(PREFIX))))
    used_codes = set(session.scalars(select(Rescue.display_id)))
    now, added = utcnow(), 0
    acknowledgements = []
    for index in range(DELIVERIES):
        key = f"{PREFIX}{index:02d}"
        if key in existing:
            continue
        created = now - timedelta(days=DELIVERIES-index)
        offered, claimed, collected, delivered = [created + timedelta(minutes=m) for m in (2, 5, 30, 50)]
        code = new_display_id()
        while code in used_codes:
            code = new_display_id()
        used_codes.add(code)
        rescue = Rescue(
            id=new_uuid(), display_id=code, idempotency_key=key, donor_organization_id=donor.id,
            status="DELIVERED", total_servings=SERVINGS, dietary_type="VEG", handling_type="HOT_HELD",
            handling_notes="Synthetic demonstration history for contribution medals.",
            untouched_confirmed=True, packaging_available=True, safety_attestation=True,
            prepared_at=created-timedelta(minutes=15), pickup_by=created+timedelta(minutes=90),
            latitude=donor.latitude, longitude=donor.longitude, locality=donor.locality,
            private_address="", created_at=created, updated_at=delivered,
            food_items=[FoodItem(name="Rice and vegetable curry", quantity_servings=SERVINGS,
                dietary_type="VEG", food_category="COOKED_MEAL", allergens=[], allergen_info_unknown=False, created_at=created)],
            handoff=Handoff(collected_servings=SERVINGS, delivered_servings=SERVINGS, rejected_servings=0,
                created_at=claimed, collected_at=collected, delivered_at=delivered),
            impact=ImpactRecord(donor_organization_id=donor.id, receiver_organization_id=receiver.id,
                delivered_servings=SERVINGS, created_at=delivered),
            offers=[MatchOffer(receiver_organization_id=receiver.id, status="ACCEPTED", rank=1,
                score=.85, proximity_score=.9, urgency_score=.8, need_score=.8,
                reliability_score=receiver.reliability, fairness_score=.7,
                estimated_distance_km=3, estimated_travel_minutes=15, offered_at=offered,
                claimed_at=claimed, expires_at=collected, created_at=offered)],
        )
        states = [("POSTED", created), ("MATCHING", created+timedelta(minutes=1)),
                  ("OFFERED", offered), ("CLAIMED", claimed), ("COLLECTED", collected), ("DELIVERED", delivered)]
        rescue.status_events = [StatusEvent(from_status=states[i-1][0] if i else None,
            to_status=status, created_at=at, reason="synthetic_champion_history") for i, (status, at) in enumerate(states)]
        session.add(rescue)
        acknowledgements.append(DonationRecognition(rescue_id=rescue.id, receiver_organization_id=receiver.id,
            issued_by_user_id=receiver_user.id, donor_name=donor.name, receiver_name=receiver.name,
            issued_at=delivered, people_served=None, food_rating=None,
            message="Thank you for helping our community share another meal. Synthetic demonstration acknowledgement."))
        added += 1
    session.flush()
    session.add_all(acknowledgements)
    session.flush()
    return added


if __name__ == "__main__":
    from app.db.session import SessionLocal
    from app.services.trust_service import compute_trust_scores
    try:
        with SessionLocal.begin() as session:
            count = seed_champions(session)
            compute_trust_scores(session)
        print(f"Champion demo history ready: {count} deliveries added; 5,600 sample meals per primary partner.")
    except Exception:
        # Connection exceptions can contain database credentials.
        raise SystemExit("Champion sample update failed and was rolled back. Check demo mode and database connectivity.") from None
