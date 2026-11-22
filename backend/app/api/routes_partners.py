"""Authenticated, opposite-role conversations and verified-handoff feedback."""
import uuid
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select, or_, and_, update, case, func
from app.api.deps import DbSession, require_roles
from app.api.responses import ok
from app.core.errors import AppError
from app.models.base_types import utcnow
from app.models.enums import UserRole
from app.models.user import User
from app.models.organization import Organization
from app.models.community import AllocationNotice, FavoritePartner, PartnerMessage, PartnerRating
from app.models.offer import MatchOffer
from app.models.rescue import Rescue
from app.services.allocation_notices import puzzle_is_open
from app.services.rescue_service import iso_utc

router = APIRouter(tags=["partners"])
participant = require_roles(UserRole.DONOR, UserRole.RECEIVER)


class MessageIn(BaseModel):
    message: str = Field(min_length=1, max_length=500)

    @field_validator("message")
    @classmethod
    def nonempty(cls, value):
        if not value.strip():
            raise ValueError("Write a message before sending.")
        return value.strip()


class FavoriteIn(BaseModel):
    favorite: bool


def partner(db, user, partner_id):
    org = db.get(Organization, partner_id)
    opposite = (org and ((user.role == "DONOR" and org.organization_type in ("NGO", "SHELTER", "COMMUNITY_KITCHEN")) or (user.role == "RECEIVER" and org.organization_type == "CATERER")))
    if not opposite or org.verification_status != "VERIFIED":
        raise AppError("PARTNER_NOT_FOUND", "This partner is unavailable.", 404)
    return org


@router.get("/partners/favorites")
def favorites(request: Request, db: DbSession, user: User = Depends(participant)):
    partners = db.scalars(select(Organization)
        .join(FavoritePartner, FavoritePartner.organization_id == Organization.id)
        .where(FavoritePartner.user_id == user.id, Organization.verification_status == "VERIFIED")
        .order_by(Organization.name)).all()
    return ok([{"id": str(org.id), "name": org.name, "locality": org.locality} for org in partners], request.state.request_id)


@router.put("/partners/{partner_id}/favorite")
def favorite_partner(partner_id: uuid.UUID, body: FavoriteIn, request: Request, db: DbSession, user: User = Depends(participant)):
    if body.favorite:
        partner(db, user, partner_id)
    db.execute(update(User).where(User.id == user.id).values(is_active=User.is_active))
    saved = db.get(FavoritePartner, (user.id, partner_id))
    if body.favorite and saved is None:
        db.add(FavoritePartner(user_id=user.id, organization_id=partner_id))
    elif not body.favorite and saved is not None:
        db.delete(saved)
    db.commit()
    return ok({"favorite": body.favorite}, request.state.request_id)


@router.get("/partners/inbox")
def inbox(request: Request, db: DbSession, user: User = Depends(participant)):
    own = user.organization_id
    other = case((PartnerMessage.sender_org_id == own, PartnerMessage.recipient_org_id), else_=PartnerMessage.sender_org_id)
    ranked = select(
        other.label("partner_id"), PartnerMessage.message, PartnerMessage.created_at,
        func.row_number().over(partition_by=other, order_by=(PartnerMessage.created_at.desc(), PartnerMessage.id.desc())).label("position"),
        func.sum(case((and_(PartnerMessage.recipient_org_id == own, PartnerMessage.read_at.is_(None)), 1), else_=0))
            .over(partition_by=other).label("unread"),
    ).where(or_(PartnerMessage.sender_org_id == own, PartnerMessage.recipient_org_id == own)).subquery()
    rows = db.execute(select(ranked, Organization.name).join(Organization, Organization.id == ranked.c.partner_id)
        .where(ranked.c.position == 1).order_by(ranked.c.created_at.desc(), ranked.c.partner_id)).mappings().all()
    return ok([{"partner_id": str(row["partner_id"]), "name": row["name"], "last_message": row["message"],
                "updated_at": iso_utc(row["created_at"]), "unread": row["unread"]} for row in rows], request.state.request_id)



@router.get("/partners/{partner_id}/chat")
def conversation(partner_id: uuid.UUID, request: Request, db: DbSession, user: User = Depends(participant)):
    org = partner(db, user, partner_id)
    pair = or_(and_(PartnerMessage.sender_org_id == user.organization_id, PartnerMessage.recipient_org_id == partner_id), and_(PartnerMessage.sender_org_id == partner_id, PartnerMessage.recipient_org_id == user.organization_id))
    rows = db.execute(select(PartnerMessage, AllocationNotice, Rescue)
        .outerjoin(AllocationNotice, AllocationNotice.message_id == PartnerMessage.id)
        .outerjoin(Rescue, Rescue.id == AllocationNotice.rescue_id)
        .where(pair).order_by(PartnerMessage.created_at.desc(), PartnerMessage.id.desc()).limit(100)).all()
    data = []
    seen_proposals = set()
    now = utcnow()
    for msg, notice, rescue in rows:
        own = msg.sender_org_id == user.organization_id
        entry = {"id": str(msg.id), "sender_name": user.organization.name if own else org.name,
            "sender_role": user.role if own else ("RECEIVER" if user.role == "DONOR" else "DONOR"),
            "message": msg.message, "is_suggested": False, "created_at": iso_utc(msg.created_at)}
        if notice and rescue:
            entry["allocation_proposal"] = {
                "items": notice.items, "pickup_by": iso_utc(rescue.pickup_by), "locality": rescue.locality,
                "status": "superseded" if rescue.id in seen_proposals else "open" if puzzle_is_open(rescue, now) else "closed",
            }
            seen_proposals.add(rescue.id)
        data.append(entry)
    db.execute(update(PartnerMessage).where(
        PartnerMessage.sender_org_id == partner_id, PartnerMessage.recipient_org_id == user.organization_id,
        PartnerMessage.read_at.is_(None),
    ).values(read_at=now))
    db.commit()
    suggested = ["Can you collect today?", "How many servings can you accept?", "Any dietary or allergen restrictions?", "Please confirm packaging and pickup time.", "Thank you!"] if user.role == "DONOR" else ["Is the food ready for pickup?", "Please confirm ingredients and allergens.", "Please confirm packaging and pickup time.", "We can collect today.", "Thank you!"]
    return ok({"partner_name": org.name, "messages": list(reversed(data)), "suggested": suggested}, request.state.request_id)


@router.post("/partners/{partner_id}/chat")
def send(partner_id: uuid.UUID, body: MessageIn, request: Request, db: DbSession, user: User = Depends(participant)):
    partner(db, user, partner_id)
    msg = PartnerMessage(sender_org_id=user.organization_id, recipient_org_id=partner_id, message=body.message)
    db.add(msg)
    db.commit()
    return ok({"id": str(msg.id), "created_at": iso_utc(msg.created_at)}, request.state.request_id)


class RatingIn(BaseModel):
    stars: int = Field(ge=1, le=5)


@router.post("/rescues/{rescue_id}/rating")
def rate(rescue_id: uuid.UUID, body: RatingIn, request: Request, db: DbSession, user: User = Depends(participant)):
    db.execute(update(Rescue).where(Rescue.id == rescue_id).values(updated_at=Rescue.updated_at))
    rescue = db.get(Rescue, rescue_id)
    accepted = db.scalar(select(MatchOffer).where(MatchOffer.rescue_id == rescue_id, MatchOffer.status == "ACCEPTED"))
    if not rescue or not accepted or user.organization_id not in (rescue.donor_organization_id, accepted.receiver_organization_id):
        raise AppError("RESCUE_NOT_FOUND", "Rescue not found.", 404)
    if rescue.status != "DELIVERED":
        raise AppError("NOT_DELIVERED", "Feedback is available after delivery.", 409)
    target = accepted.receiver_organization_id if user.organization_id == rescue.donor_organization_id else rescue.donor_organization_id
    rating = db.scalar(select(PartnerRating).where(PartnerRating.rescue_id == rescue_id, PartnerRating.author_org_id == user.organization_id))
    if rating is None:
        rating = PartnerRating(rescue_id=rescue_id, author_org_id=user.organization_id, target_org_id=target, stars=body.stars)
        db.add(rating)
    else:
        rating.stars = body.stars
    db.flush()
    from app.services.trust_service import compute_trust_scores
    compute_trust_scores(db, [target])
    db.commit()
    return ok({"stars": rating.stars}, request.state.request_id)


@router.get("/rescues/{rescue_id}/rating")
def my_rating(rescue_id: uuid.UUID, request: Request, db: DbSession, user: User = Depends(participant)):
    rescue = db.get(Rescue, rescue_id)
    accepted = db.scalar(select(MatchOffer).where(MatchOffer.rescue_id == rescue_id, MatchOffer.status == "ACCEPTED"))
    if not rescue or not accepted or user.organization_id not in (rescue.donor_organization_id, accepted.receiver_organization_id):
        raise AppError("RESCUE_NOT_FOUND", "Rescue not found.", 404)
    rating = db.scalar(select(PartnerRating).where(PartnerRating.rescue_id == rescue_id, PartnerRating.author_org_id == user.organization_id))
    return ok({"stars": rating.stars if rating else None}, request.state.request_id)
