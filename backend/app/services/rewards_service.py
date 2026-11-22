"""Non-financial contribution coins, derived from confirmed deliveries, never minted twice."""
from datetime import timedelta
from app.models.base_types import utcnow
from app.services.rescue_helpers import ensure_utc
from app.services.impact_service import _delivered_rows, impact_summary

COINS_PER_MEAL = 10
TIERS = [(0, "Getting started"), (10, "Seed of kindness"), (1000, "Bronze heart"),
         (5000, "Silver table"), (15000, "Golden harvest"), (50000, "Community champion")]


def reward_summary(db, user, organization):
    donor = user.organization_id if user.role == "DONOR" else None
    receiver = user.organization_id if user.role == "RECEIVER" else None
    now = utcnow()
    delivered_rows = _delivered_rows(db, donor, receiver)
    impact = impact_summary(db, donor, receiver, now, delivered_rows=delivered_rows)
    rows = [r for r in delivered_rows if r.servings > 0]
    coins = sum(r.servings for r in rows) * COINS_PER_MEAL
    tier = max((t for t in TIERS if coins >= t[0]), key=lambda t: t[0])
    next_tier = next((t for t in TIERS if t[0] > coins), None)
    weeks = {ensure_utc(r.recorded_at).date() - timedelta(days=ensure_utc(r.recorded_at).weekday()) for r in rows}
    this_week = now.date() - timedelta(days=now.weekday())
    # A week in progress does not break an existing streak until it ends.
    cursor = this_week if this_week in weeks else this_week - timedelta(weeks=1)
    streak = 0
    while cursor in weeks:
        streak += 1
        cursor -= timedelta(weeks=1)
    return {
        "organization_name": organization.name, "role": user.role, "generated_at": now.isoformat(),
        "coins": coins, "coins_per_meal": COINS_PER_MEAL, "medal": tier[1],
        "next_medal": {"name": next_tier[1], "threshold": next_tier[0], "remaining": next_tier[0]-coins} if next_tier else None,
        "milestones": [{"name": name, "threshold": threshold, "earned": coins >= threshold} for threshold, name in TIERS[1:]],
        "active_weeks": len(weeks), "weekly_streak": streak,
        "impact": impact,
        "ledger": [{"rescue_id": str(r.rescue_id), "display_id": r.display_id,
                    "at": ensure_utc(r.recorded_at).isoformat(), "meals": r.servings,
                    "coins": r.servings * COINS_PER_MEAL} for r in rows[:100]],
        "rules": "10 contribution coins = 1 receiver-confirmed delivered meal. No coins for posting, claiming, ratings, rejected food or planning. Coins have no cash, redemption or transfer value. Both partners earn contribution credit; community meals are counted once. Coins never affect access to food or matching priority.",
    }
