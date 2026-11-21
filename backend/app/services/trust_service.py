"""Transparent trust: completed outcomes, seeded reliability and handoff feedback."""
from sqlalchemy import select, func
from app.models.organization import Organization
from app.models.rescue import Rescue
from app.models.offer import MatchOffer
from app.models.community import PartnerRating


def _badge(score):
    return "GOLD" if score >= .85 else "SILVER" if score >= .7 else "BRONZE" if score >= .5 else "NEW"


def trust_details(db, org):
    stmt = select(Rescue).where(Rescue.status.in_(["DELIVERED", "CANCELLED", "EXPIRED"]))
    if org.organization_type == "CATERER":
        stmt = stmt.where(Rescue.donor_organization_id == org.id)
    else:
        stmt = stmt.join(MatchOffer, MatchOffer.rescue_id == Rescue.id).where(MatchOffer.receiver_organization_id == org.id, MatchOffer.status == "ACCEPTED")
    rescues = db.scalars(stmt).all()
    completed = sum(r.status == "DELIVERED" for r in rescues)
    ratings = db.scalars(select(PartnerRating.stars).where(PartnerRating.target_org_id == org.id)).all()
    completion = completed / len(rescues) if rescues else None
    average = sum(ratings) / len(ratings) if ratings else None
    score = round((completion if completion is not None else .5) * .4 + org.reliability * .3 + (average / 5 if average else .5) * .3, 3)
    return {"trust_score": score, "rank_badge": _badge(score) if rescues else "NEW", "completion_rate": completion,
        "rating": round(average, 1) if average else None, "rating_count": len(ratings), "completed_rescues": completed}


def compute_trust_scores(db):
    orgs = db.scalars(select(Organization)).all()
    for org in orgs:
        details = trust_details(db, org)
        org.trust_score = details["trust_score"]
        org.rank_badge = details["rank_badge"]
    db.flush()
    return len(orgs)
