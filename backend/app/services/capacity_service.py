"""Active handoffs reserve receiver capacity until delivery or expiry."""
from sqlalchemy import select, func
from app.models.rescue import Rescue
from app.models.offer import MatchOffer


def reserved_servings(db, org_id):
    return int(db.scalar(select(func.sum(Rescue.total_servings)).join(MatchOffer, MatchOffer.rescue_id == Rescue.id).where(
        MatchOffer.receiver_organization_id == org_id, MatchOffer.status == "ACCEPTED", Rescue.status.in_(["CLAIMED", "COLLECTED"])
    )) or 0)


def free_servings(db, capacity):
    return max(0, capacity.available_servings - reserved_servings(db, capacity.organization_id))
