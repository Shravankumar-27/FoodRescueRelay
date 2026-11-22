"""Impact metrics: delivered servings and completion figures for donor and admin views.

Scope rules:
- donor_org_id set: rows for that donor's rescues only.
- receiver_org_id set (and no donor): rows delivered by that receiver.
- both None: platform-wide aggregate (admin).
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.enums import OfferStatus
from app.models.handoff import Handoff
from app.models.impact import ImpactRecord
from app.models.offer import MatchOffer
from app.models.organization import Organization
from app.models.rescue import Rescue
from app.models.recognition import DonationRecognition
from app.services.rescue_helpers import ensure_utc

METHODOLOGY_NOTE = "Meals rescued = receiver-confirmed delivered servings."
RECENT_LIMIT = 5


def _rescue_denominator(
    db: Session, donor_org_id: uuid.UUID | None, receiver_org_id: uuid.UUID | None
) -> int:
    if donor_org_id is not None:
        stmt = select(func.count(Rescue.id)).where(Rescue.donor_organization_id == donor_org_id)
    elif receiver_org_id is not None:
        stmt = select(func.count(func.distinct(MatchOffer.rescue_id))).where(
            MatchOffer.receiver_organization_id == receiver_org_id,
            MatchOffer.claimed_at.is_not(None),
        )
    else:
        stmt = select(func.count(Rescue.id))
    return int(db.scalar(stmt) or 0)


def _delivered_rows(
    db: Session, donor_org_id: uuid.UUID | None, receiver_org_id: uuid.UUID | None
) -> list[Any]:
    """One query: every delivered rescue in scope, newest delivery first."""
    stmt = (
        select(
            ImpactRecord.delivered_servings.label("servings"),
            ImpactRecord.donor_organization_id.label("donor_id"),
            ImpactRecord.receiver_organization_id.label("receiver_id"),
            Rescue.id.label("rescue_id"),
            Handoff.collected_servings.label("collected_servings"),
            Handoff.rejected_servings.label("rejected_servings"),
            DonationRecognition.people_served.label("people_served"),
            DonationRecognition.food_rating.label("food_rating"),
            DonationRecognition.public_token.label("recognition_token"),
            ImpactRecord.created_at.label("recorded_at"),
            Handoff.delivered_at.label("delivered_at"),
            Rescue.display_id.label("display_id"),
            Rescue.created_at.label("posted_at"),
            Organization.name.label("receiver_name"),
        )
        .select_from(ImpactRecord)
        .join(Rescue, Rescue.id == ImpactRecord.rescue_id)
        .join(Handoff, Handoff.rescue_id == ImpactRecord.rescue_id)
        .join(Organization, Organization.id == ImpactRecord.receiver_organization_id)
        .outerjoin(DonationRecognition, (DonationRecognition.rescue_id == Rescue.id) & DonationRecognition.withdrawn_at.is_(None))
    )
    if donor_org_id is not None:
        stmt = stmt.where(ImpactRecord.donor_organization_id == donor_org_id)
    if receiver_org_id is not None:
        stmt = stmt.where(ImpactRecord.receiver_organization_id == receiver_org_id)
    stmt = stmt.order_by(Handoff.delivered_at.desc())
    return list(db.execute(stmt).all())


def impact_summary(
    db: Session,
    donor_org_id: uuid.UUID | None,
    receiver_org_id: uuid.UUID | None,
    now: datetime,
    *,
    delivered_rows: list[Any] | None = None,
) -> dict[str, Any]:
    current = ensure_utc(now)
    month_start = current.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    rows = delivered_rows if delivered_rows is not None else _delivered_rows(db, donor_org_id, receiver_org_id)
    denominator = _rescue_denominator(db, donor_org_id, receiver_org_id)

    total_meals = 0
    meals_this_month = 0
    minutes: list[float] = []
    for row in rows:
        total_meals += row.servings
        if ensure_utc(row.recorded_at) >= month_start:
            meals_this_month += row.servings
        elapsed = ensure_utc(row.delivered_at or row.recorded_at) - ensure_utc(row.posted_at)
        minutes.append(elapsed.total_seconds() / 60)

    completed = len(rows)
    ratings = [row.food_rating for row in rows if row.food_rating is not None]
    people_rows = [row for row in rows if row.people_served is not None]
    collected = sum(row.collected_servings or 0 for row in rows)
    rejected = sum(row.rejected_servings or 0 for row in rows)
    weeks = []
    monday = current.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=current.weekday())
    for offset in range(7, -1, -1):
        start = monday - timedelta(weeks=offset)
        end = start + timedelta(weeks=1)
        meals = sum(row.servings for row in rows if start <= ensure_utc(row.recorded_at) < end)
        weeks.append({"week": start.strftime("%d %b"), "meals": meals, "co2e_kg": round(meals * .4 * 2.5, 1)})
    return {
        "reported_people_served": sum(row.people_served for row in people_rows),
        "people_counted_deliveries": len(people_rows),
        "people_count_note": "Receiving partners report people served for each delivery.",
        "food_rating": round(sum(ratings) / len(ratings), 1) if ratings else None,
        "food_rating_count": len(ratings),
        "recognition_count": sum(row.recognition_token is not None for row in rows),
        "community_partners": len({row.donor_id if receiver_org_id else row.receiver_id for row in rows}),
        "collected_servings": collected,
        "rejected_servings": rejected,
        "unaccounted_servings": max(0, collected - total_meals - rejected),
        "utilization_rate": round(total_meals / collected, 3) if collected else None,
        "weekly": weeks,
        "food_kg_estimate": round(total_meals * .4, 1),
        "co2e_kg_estimate": round(total_meals * .4 * 2.5, 1),
        "household_meal_equivalents": round(total_meals / 4, 1),
        "assumptions": "Illustrative model: one delivered serving = one meal; 0.4 kg per meal; 2.5 kg CO2e per kg food. Household meal equivalents = meals / 4, not unique families. No measured water or methane savings are claimed.",
        "meals_rescued_month": meals_this_month,
        "total_meals_rescued": total_meals,
        "completed_rescues": completed,
        "completion_rate": round(completed / denominator, 2) if denominator else 0.0,
        "avg_completion_minutes": round(sum(minutes) / len(minutes), 1) if minutes else None,
        "recent_completed": [
            {
                "display_id": row.display_id,
                "rescue_id": str(row.rescue_id),
                "recognition_token": str(row.recognition_token) if row.recognition_token else None,
                "delivered_servings": row.servings,
                "delivered_at": ensure_utc(row.delivered_at or row.recorded_at).isoformat(),
                "receiver_name": row.receiver_name,
            }
            for row in rows[:RECENT_LIMIT]
        ],
        "methodology_note": METHODOLOGY_NOTE,
    }
