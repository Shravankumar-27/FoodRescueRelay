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
            MatchOffer.status == OfferStatus.ACCEPTED.value,
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
) -> dict[str, Any]:
    current = ensure_utc(now)
    month_start = current.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    rows = _delivered_rows(db, donor_org_id, receiver_org_id)
    denominator = _rescue_denominator(db, donor_org_id, receiver_org_id)

    total_meals = 0
    meals_this_month = 0
    minutes: list[float] = []
    for row in rows:
        total_meals += row.servings
        if ensure_utc(row.recorded_at) >= month_start:
            meals_this_month += row.servings
        elapsed = ensure_utc(row.delivered_at) - ensure_utc(row.posted_at)
        minutes.append(elapsed.total_seconds() / 60)

    completed = len(rows)
    weeks = []
    monday = current.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=current.weekday())
    for offset in range(7, -1, -1):
        start = monday - timedelta(weeks=offset)
        end = start + timedelta(weeks=1)
        meals = sum(row.servings for row in rows if start <= ensure_utc(row.recorded_at) < end)
        weeks.append({"week": start.strftime("%d %b"), "meals": meals, "co2e_kg": round(meals * .4 * 2.5, 1)})
    return {
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
                "delivered_servings": row.servings,
                "delivered_at": ensure_utc(row.delivered_at).isoformat(),
                "receiver_name": row.receiver_name,
            }
            for row in rows[:RECENT_LIMIT]
        ],
        "methodology_note": METHODOLOGY_NOTE,
    }
