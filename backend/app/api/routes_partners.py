"""Authenticated, opposite-role conversations and verified-handoff feedback."""
import uuid
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select, or_, and_, update
from app.api.deps import DbSession, require_roles
from app.api.responses import ok
from app.core.errors import AppError
from app.models.base_types import utcnow
from app.models.enums import UserRole
from app.models.user import User
from app.models.organization import Organization
from app.models.community import PartnerMessage, PartnerRating
from app.models.offer import MatchOffer
from app.models.rescue import Rescue
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


def partner(db, user, partner_id):
    org = db.get(Organization, partner_id)
    opposite = (org and ((user.role == "DONOR" and org.organization_type in ("NGO", "SHELTER", "COMMUNITY_KITCHEN")) or (user.role == "RECEIVER" and org.organization_type == "CATERER")))
    if not opposite or org.verification_status != "VERIFIED":
        raise AppError("PARTNER_NOT_FOUND", "This partner is unavailable.", 404)
    return org


@router.get("/partners/inbox")
def inbox(request: Request, db: DbSession, user: User = Depends(participant)):
    rows = db.scalars(select(PartnerMessage).where(or_(PartnerMessage.sender_org_id == user.organization_id, PartnerMessage.recipient_org_id == user.organization_id)).order_by(PartnerMessage.created_at.desc())).all()
    conversations = {}
    for msg in rows:
        other = msg.recipient_org_id if msg.sender_org_id == user.organization_id else msg.sender_org_id
        key = str(other)
        if key not in conversations:
            org = db.get(Organization, other)
            conversations[key] = {"partner_id": key, "name": org.name, "last_message": msg.message, "updated_at": iso_utc(msg.created_at), "unread": 0}
        if msg.recipient_org_id == user.organization_id and msg.read_at is None:
            conversations[key]["unread"] += 1
    return ok(list(conversations.values()), request.state.request_id)


@router.get("/partners/{partner_id}/chat")
def conversation(partner_id: uuid.UUID, request: Request, db: DbSession, user: User = Depends(participant)):
    org = partner(db, user, partner_id)
    pair = or_(and_(PartnerMessage.sender_org_id == user.organization_id, PartnerMessage.recipient_org_id == partner_id), and_(PartnerMessage.sender_org_id == partner_id, PartnerMessage.recipient_org_id == user.organization_id))
    rows = list(reversed(db.scalars(select(PartnerMessage).where(pair).order_by(PartnerMessage.created_at.desc()).limit(100)).all()))
    data = []
    for msg in rows:
        own = msg.sender_org_id == user.organization_id
        data.append({"id": str(msg.id), "sender_name": user.organization.name if own else org.name,
            "sender_role": user.role if own else ("RECEIVER" if user.role == "DONOR" else "DONOR"),
            "message": msg.message, "is_suggested": False, "created_at": iso_utc(msg.created_at)})
        if not own:
            msg.read_at = utcnow()
    db.execute(update(PartnerMessage).where(PartnerMessage.sender_org_id == partner_id, PartnerMessage.recipient_org_id == user.organization_id, PartnerMessage.read_at.is_(None)).values(read_at=utcnow()))
    db.commit()
    suggested = ["Can you collect today?", "How many servings can you accept?", "Any dietary or allergen restrictions?", "Please confirm packaging and pickup time.", "Thank you!"] if user.role == "DONOR" else ["Is the food ready for pickup?", "Please confirm ingredients and allergens.", "Please confirm packaging and pickup time.", "We can collect today.", "Thank you!"]
    return ok({"partner_name": org.name, "messages": data, "suggested": suggested}, request.state.request_id)


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
    compute_trust_scores(db)
    db.commit()
    return ok({"stars": rating.stars}, request.state.request_id)
