"""Chat routes: in-app messaging between donor and receiver for a rescue."""
from __future__ import annotations
import uuid
from typing import Any
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy import select, or_, func
from app.api.deps import DbSession, require_roles
from app.api.responses import ok
from app.core.errors import AppError
from app.models.base_types import new_uuid, utcnow
from app.models.chat_message import ChatMessage
from app.models.enums import UserRole
from app.models.user import User
from app.services.rescue_service import iso_utc
from app.models.rescue import Rescue
from app.models.offer import MatchOffer

router = APIRouter(prefix="/rescues", tags=["chat"])

SUGGESTED_MESSAGES_BY_STATUS: dict[str, list[str]] = {
    "CLAIMED": ["On my way to pick up!", "ETA 10 minutes", "Food ready for pickup?", "Thank you for donating!"],
    "COLLECTED": ["Food collected successfully!", "On my way to deliver", "ETA 15 minutes to delivery"],
    "DELIVERED": ["Delivered successfully! Thank you!", "Meals reached the community", "Great partnership!"],
    "default": ["Hello!", "Quick question about the food", "On my way", "Thank you!", "Any update?"],
}


def _request_id(request: Request) -> str:
    return getattr(request.state, "request_id", "unknown")


class SendMessageBody(BaseModel):
    message: str = Field(min_length=1, max_length=500)


def can_chat(db, user, rescue):
    # Listing visibility must never grant access to another organization's chat.
    if user.role == "ADMIN" or user.organization_id == rescue.donor_organization_id:
        return True
    return db.scalar(select(MatchOffer.id).where(MatchOffer.rescue_id == rescue.id,
        MatchOffer.receiver_organization_id == user.organization_id, MatchOffer.status == "ACCEPTED")) is not None


@router.get("/{rescue_id}/chat")
def get_chat(
    rescue_id: uuid.UUID,
    request: Request,
    db: DbSession,
    user: User = Depends(require_roles(UserRole.DONOR, UserRole.RECEIVER, UserRole.ADMIN)),
) -> dict[str, Any]:
    rescue = db.get(Rescue, rescue_id)
    if rescue is None or not can_chat(db, user, rescue):
        raise AppError("RESCUE_NOT_FOUND", "Rescue not found.", 404)
    accepted = db.scalar(select(MatchOffer).where(MatchOffer.rescue_id == rescue_id, MatchOffer.status == "ACCEPTED"))
    query = select(ChatMessage).where(ChatMessage.rescue_id == rescue_id)
    if user.role != "ADMIN":
        claims = db.scalar(select(func.count(MatchOffer.id)).where(MatchOffer.rescue_id == rescue_id, MatchOffer.claimed_at.is_not(None))) or 0
        # Preserve legacy messages only in their original handoff; never leak them to a replacement receiver.
        query = query.where(or_(ChatMessage.offer_id == accepted.id, ChatMessage.offer_id.is_(None)) if accepted and claims <= 1 else ChatMessage.offer_id == accepted.id if accepted else ChatMessage.id.is_(None))
    messages = list(reversed(db.scalars(query.order_by(ChatMessage.created_at.desc()).limit(100)).all()))
    suggested = SUGGESTED_MESSAGES_BY_STATUS.get(rescue.status, SUGGESTED_MESSAGES_BY_STATUS["default"])
    if user.role == "DONOR":
        suggested = {
            "CLAIMED": ["Food is packed and ready.", "What is your arrival time?", "Please confirm transport and containers.", "Ask our team for the pickup code."],
            "COLLECTED": ["Thank you for collecting!", "Please confirm delivery when complete.", "Any update on the delivery?"],
            "DELIVERED": ["Thank you for reaching the community!", "We appreciate your partnership."],
        }.get(rescue.status, ["Hello!", "How can we help with pickup?", "Thank you!"])
    return ok({
        "messages": [
            {"id": str(m.id), "sender_name": m.sender_name, "sender_role": m.sender_role,
             "message": m.message, "is_suggested": m.is_suggested, "created_at": iso_utc(m.created_at)}
            for m in messages
        ],
        "suggested": suggested,
    }, _request_id(request))


@router.post("/{rescue_id}/chat")
def send_chat(
    rescue_id: uuid.UUID,
    body: SendMessageBody,
    request: Request,
    db: DbSession,
    user: User = Depends(require_roles(UserRole.DONOR, UserRole.RECEIVER)),
) -> dict[str, Any]:
    rescue = db.get(Rescue, rescue_id)
    if rescue is None or not can_chat(db, user, rescue):
        raise AppError("RESCUE_NOT_FOUND", "Rescue not found.", 404)
    if not body.message.strip():
        raise AppError("EMPTY_MESSAGE", "Write a message before sending.", 422)
    accepted = db.scalar(select(MatchOffer).where(MatchOffer.rescue_id == rescue_id, MatchOffer.status == "ACCEPTED"))
    if not accepted:
        raise AppError("NO_ACTIVE_HANDOFF", "Use partner messages until a receiver claims this rescue.", 409)
    msg = ChatMessage(
        id=new_uuid(),
        rescue_id=rescue_id,
        offer_id=accepted.id,
        sender_org_id=user.organization_id,
        sender_name=user.name or user.organization.name,
        sender_role=str(user.role.value if hasattr(user.role, "value") else user.role),
        message=body.message.strip(),
        is_suggested=False,
        created_at=utcnow(),
    )
    db.add(msg)
    db.commit()
    return ok({"id": str(msg.id), "created_at": iso_utc(msg.created_at)}, _request_id(request))
