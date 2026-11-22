"""Transparent trust, aggregated in bounded queries without loading rescue history."""
from sqlalchemy import select, func, case
from app.models.organization import Organization
from app.models.rescue import Rescue
from app.models.offer import MatchOffer
from app.models.community import PartnerRating


def _badge(score):
    return "GOLD" if score >= .85 else "SILVER" if score >= .7 else "BRONZE" if score >= .5 else "NEW"


def trust_details_many(db, orgs):
    """Same formula for one or many partners; at most four aggregate reads."""
    if not orgs:
        return {}
    donors = [o.id for o in orgs if o.organization_type == "CATERER"]
    receivers = [o.id for o in orgs if o.organization_type != "CATERER"]
    ids = [o.id for o in orgs]
    terminal = Rescue.status.in_(["DELIVERED", "CANCELLED", "EXPIRED"])
    completed_sum = func.sum(case((Rescue.status == "DELIVERED", 1), else_=0))
    outcomes = {}
    if donors:
        outcomes.update({oid: (count, done) for oid, count, done in db.execute(
            select(Rescue.donor_organization_id, func.count(Rescue.id), completed_sum)
            .where(terminal, Rescue.donor_organization_id.in_(donors))
            .group_by(Rescue.donor_organization_id))})
    if receivers:
        outcomes.update({oid: (count, done) for oid, count, done in db.execute(
            select(MatchOffer.receiver_organization_id, func.count(Rescue.id), completed_sum)
            .join(Rescue, MatchOffer.rescue_id == Rescue.id)
            .where(terminal, MatchOffer.receiver_organization_id.in_(receivers), MatchOffer.status == "ACCEPTED")
            .group_by(MatchOffer.receiver_organization_id))})
    released = dict(db.execute(select(MatchOffer.receiver_organization_id, func.count(MatchOffer.id))
        .where(MatchOffer.receiver_organization_id.in_(receivers), MatchOffer.status == "DECLINED",
               MatchOffer.claimed_at.is_not(None)).group_by(MatchOffer.receiver_organization_id)).all()) if receivers else {}
    ratings = {oid: (count, total) for oid, count, total in db.execute(
        select(PartnerRating.target_org_id, func.count(PartnerRating.id), func.sum(PartnerRating.stars))
        .where(PartnerRating.target_org_id.in_(ids)).group_by(PartnerRating.target_org_id))}
    result = {}
    for org in orgs:
        count, completed = outcomes.get(org.id, (0, 0))
        count += released.get(org.id, 0)
        rating_count, rating_total = ratings.get(org.id, (0, 0))
        average = rating_total / rating_count if rating_count else None
        completion = completed / count if count else None
        score = round((completion if completion is not None else .5) * .4 + org.reliability * .3 + (average / 5 if average else .5) * .3, 3)
        result[org.id] = {"trust_score": score, "rank_badge": _badge(score) if count else "NEW", "completion_rate": completion,
            "rating": round(average, 1) if average else None, "rating_count": rating_count, "completed_rescues": completed}
    return result


def trust_details(db, org):
    return trust_details_many(db, [org])[org.id]


def compute_trust_scores(db, org_ids=None):
    query = select(Organization)
    if org_ids is not None:
        query = query.where(Organization.id.in_(org_ids))
    orgs = db.scalars(query).all()
    details = trust_details_many(db, orgs)
    for org in orgs:
        org.trust_score = details[org.id]["trust_score"]
        org.rank_badge = details[org.id]["rank_badge"]
    db.flush()
    return len(orgs)
