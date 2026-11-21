"""Offer routes: receiver inbox, atomic claim and decline."""

from __future__ import annotations

import secrets
import uuid
from datetime import timedelta
from typing import Any

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select, update
from sqlalchemy.exc import OperationalError, IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import DbSession, require_roles
from app.api.responses import ok
from app.core.errors import AppError
from app.models.base_types import new_uuid, utcnow
from app.models.enums import OfferStatus, RescueStatus, UserRole
from app.models.handoff import Handoff
from app.models.offer import MatchOffer
from app.models.rescue import Rescue
from app.models.status_event import StatusEvent
from app.models.user import User
from app.models.organization import Organization
from app.models.receiver_capacity import ReceiverCapacity
from app.services.dispatch_service import advance_expired_offers, decline_offer
from app.services.handoff_service import store_pickup_code
from app.services.matching_service import match_rescue
from app.services.rescue_helpers import ensure_utc, seconds_remaining
from app.services.rescue_service import SAFETY_NOTICE, food_item_out, iso_utc

router = APIRouter(prefix="/offers", tags=["offers"])

CLAIM_ATTEMPTS = 3
PICKUP_CODE_GRACE = timedelta(minutes=60)
CLAIM_REASON = "claimed_by_receiver"


def _request_id(request: Request) -> str:
    return getattr(request.state, "request_id", "unknown")


def _is_locked_error(exc: OperationalError) -> bool:
    return "locked" in str(exc.orig if exc.orig is not None else exc).lower()


def _load_own_offer(db: Session, offer_id: uuid.UUID, user: User) -> MatchOffer:
    offer = db.scalar(
        select(MatchOffer)
        .where(MatchOffer.id == offer_id)
        .execution_options(populate_existing=True)
    )
    if offer is None or offer.receiver_organization_id != user.organization_id:
        raise AppError("OFFER_NOT_FOUND", "Offer was not found.", 404)
    return offer


def _claim_failure(db: Session, offer_id: uuid.UUID, user: User, now: Any) -> AppError:
    """Explain why the conditional claim update matched no row."""
    offer = _load_own_offer(db, offer_id, user)
    expired = ensure_utc(offer.expires_at) <= now
    if offer.status == OfferStatus.TIMED_OUT.value or (
        offer.status == OfferStatus.PENDING.value and expired
    ):
        return AppError("OFFER_EXPIRED", "This offer has expired. Another receiver may take it.", 409)
    return AppError("OFFER_NOT_PENDING", "This offer is no longer available.", 409)


def _claim_once(db: Session, offer_id: uuid.UUID, user: User) -> dict[str, Any]:
    now = utcnow()

    # Serialize claims for this receiver so simultaneous rescues cannot overbook capacity.
    db.execute(update(ReceiverCapacity).where(ReceiverCapacity.organization_id == user.organization_id).values(updated_at=now))

    offer = _load_own_offer(db, offer_id, user)
    rescue = db.get(Rescue, offer.rescue_id)
    if rescue and db.get(Organization, rescue.donor_organization_id).verification_status != "VERIFIED":
        raise AppError("DONOR_UNAVAILABLE", "This donor is not currently verified.", 409)
    if rescue is None or ensure_utc(rescue.pickup_by) <= now:
        raise AppError("OFFER_EXPIRED", "The pickup deadline has passed.", 409)
    if offer.status != "PENDING" or ensure_utc(offer.expires_at) <= now:
        raise _claim_failure(db, offer_id, user, now)
    candidate = next((c for c in match_rescue(db, rescue.id, now) if c.receiver_organization_id == user.organization_id), None)
    if candidate is None or not candidate.feasible:
        raise AppError("NOT_ELIGIBLE", "Your current food preferences, capacity or pickup timing do not match this rescue.", 409)

    # Step 1: conditional accept of this offer. Only one request can flip it.
    result = db.execute(
        update(MatchOffer)
        .where(
            MatchOffer.id == offer_id,
            MatchOffer.receiver_organization_id == user.organization_id,
            MatchOffer.status == OfferStatus.PENDING.value,
            MatchOffer.expires_at > now,
        )
        .values(status=OfferStatus.ACCEPTED.value, claimed_at=now)
        .execution_options(synchronize_session=False)
    )
    if result.rowcount != 1:
        raise _claim_failure(db, offer_id, user, now)

    rescue_id = db.scalar(select(MatchOffer.rescue_id).where(MatchOffer.id == offer_id))

    previous_status = rescue.status
    # Step 2: conditional claim of the rescue itself.
    rescue_result = db.execute(
        update(Rescue)
        .where(Rescue.id == rescue_id, Rescue.status.in_(["POSTED", "MATCHING", "OFFERED"]), Rescue.pickup_by > now)
        .values(status=RescueStatus.CLAIMED.value, updated_at=now)
        .execution_options(synchronize_session=False)
    )
    if rescue_result.rowcount != 1:
        raise AppError(
            "RESCUE_ALREADY_CLAIMED",
            "This rescue was just accepted by another receiver.",
            409,
        )

    rescue = db.scalar(
        select(Rescue).where(Rescue.id == rescue_id).execution_options(populate_existing=True)
    )

    # Step 3: close every other open offer for this rescue.
    db.execute(
        update(MatchOffer)
        .where(
            MatchOffer.rescue_id == rescue_id,
            MatchOffer.status == OfferStatus.PENDING.value,
            MatchOffer.id != offer_id,
        )
        .values(status=OfferStatus.CANCELLED.value)
        .execution_options(synchronize_session=False)
    )

    # Step 4: create the handoff. Only the bcrypt hash and the encrypted donor copy
    # are stored; the plaintext code is never persisted.
    code = f"{secrets.randbelow(10000):04d}"
    handoff = Handoff(
        id=new_uuid(),
        rescue_id=rescue_id,
        pickup_code_expires_at=ensure_utc(rescue.pickup_by) + PICKUP_CODE_GRACE,
        pickup_code_attempts=0,
        created_at=now,
    )
    store_pickup_code(handoff, code)
    db.add(handoff)

    # Step 5: audit trail.
    db.add(
        StatusEvent(
            rescue_id=rescue_id,
            actor_user_id=user.id,
            from_status=previous_status,
            to_status=RescueStatus.CLAIMED.value,
            reason=CLAIM_REASON,
            created_at=now,
        )
    )
    db.flush()

    return {
        "rescue_id": str(rescue_id),
        "status": RescueStatus.CLAIMED.value,
        "offer_id": str(offer_id),
        "pickup_by": iso_utc(rescue.pickup_by),
    }


def _eligible(db, rescue, user, now):
    if db.get(Organization, rescue.donor_organization_id).verification_status != "VERIFIED":
        return None
    return next((c for c in match_rescue(db, rescue.id, now) if c.receiver_organization_id == user.organization_id and c.feasible), None)


@router.get("/available")
def list_available(request: Request, db: DbSession, user: User = Depends(require_roles(UserRole.RECEIVER))) -> dict[str, Any]:
    now = utcnow()
    advance_expired_offers(db, now)
    db.commit()
    rescues = db.scalars(select(Rescue).where(Rescue.status.in_(["POSTED", "MATCHING", "OFFERED"]), Rescue.pickup_by > now).order_by(Rescue.pickup_by)).all()
    items = []
    for rescue in rescues:
        candidate = _eligible(db, rescue, user, now)
        if candidate is None:
            continue
        offers = db.scalars(select(MatchOffer).where(MatchOffer.rescue_id == rescue.id, MatchOffer.receiver_organization_id == user.organization_id).order_by(MatchOffer.created_at.desc())).all()
        if any(o.status == "DECLINED" for o in offers):
            continue
        direct = next((o for o in offers if o.status == "PENDING" and ensure_utc(o.expires_at) > now), None)
        deadline = direct.expires_at if direct else rescue.pickup_by
        donor = db.get(Organization, rescue.donor_organization_id)
        items.append({
            "id": str(direct.id) if direct else f"open_{rescue.id}",
            "rescue_id": str(rescue.id), "rescue_display_id": rescue.display_id,
            "donor_name": donor.name, "donor_id": str(donor.id),
            "trust_score": donor.trust_score,
            "rank_badge": donor.rank_badge,
            "locality": rescue.locality, "total_servings": rescue.total_servings,
            "food_items": [food_item_out(item) for item in rescue.food_items],
            "handling_type": rescue.handling_type, "handling_notes": rescue.handling_notes,
            "packaging_available": rescue.packaging_available, "untouched_confirmed": rescue.untouched_confirmed,
            "prepared_at": iso_utc(rescue.prepared_at), "pickup_by": iso_utc(rescue.pickup_by),
            "seconds_remaining": seconds_remaining(rescue.pickup_by, now),
            "expires_at": iso_utc(deadline), "seconds_to_respond": seconds_remaining(deadline, now),
            "estimated_distance_km": round(candidate.distance_km, 2), "estimated_travel_minutes": round(candidate.travel_minutes, 1),
            "why": candidate.why, "factors": candidate.factors, "score": candidate.score,
            "safety_notice": SAFETY_NOTICE, "latitude": round(rescue.latitude, 2), "longitude": round(rescue.longitude, 2),
            "is_direct_offer": direct is not None,
        })
    return ok(items, _request_id(request))


@router.get("/history")
def list_history(
    request: Request,
    db: DbSession,
    user: User = Depends(require_roles(UserRole.RECEIVER)),
) -> dict[str, Any]:
    advance_expired_offers(db)
    db.commit()
    rows = db.execute(
        select(MatchOffer, Rescue, Handoff)
        .join(Rescue, Rescue.id == MatchOffer.rescue_id)
        .outerjoin(Handoff, Handoff.rescue_id == Rescue.id)
        .where(
            MatchOffer.receiver_organization_id == user.organization_id,
            MatchOffer.status == OfferStatus.ACCEPTED.value,
        )
        .order_by(MatchOffer.claimed_at.desc())
    ).all()
    items = [
        {
            "offer_id": str(offer.id),
            "rescue_id": str(rescue.id),
            "rescue_display_id": rescue.display_id,
            "status": rescue.status,
            "delivered_servings": handoff.delivered_servings if handoff is not None else None,
            "pickup_by": iso_utc(rescue.pickup_by),
        }
        for offer, rescue, handoff in rows
    ]
    return ok(items, _request_id(request))


@router.post("/{offer_id}/claim")
def claim_offer(
    offer_id: str,
    request: Request,
    db: DbSession,
    user: User = Depends(require_roles(UserRole.RECEIVER)),
) -> dict[str, Any]:
    try:
        parsed_id = uuid.UUID(offer_id[5:] if offer_id.startswith("open_") else offer_id)
    except ValueError:
        raise AppError("INVALID_OFFER", "Invalid offer identifier.", 422)

    for attempt in range(1, CLAIM_ATTEMPTS + 1):
        try:
            actual_offer_id = parsed_id
            if offer_id.startswith("open_"):
                now = utcnow()
                rescue = db.get(Rescue, parsed_id)
                if rescue is None or rescue.status not in ("POSTED", "MATCHING", "OFFERED") or ensure_utc(rescue.pickup_by) <= now:
                    raise AppError("OFFER_EXPIRED", "This rescue is no longer available.", 409)
                candidate = _eligible(db, rescue, user, now)
                if candidate is None:
                    raise AppError("NOT_ELIGIBLE", "This rescue does not match your current capacity, preferences or timing.", 409)
                previous = db.scalars(select(MatchOffer).where(MatchOffer.rescue_id == rescue.id, MatchOffer.receiver_organization_id == user.organization_id)).all()
                if any(o.status == "DECLINED" for o in previous):
                    raise AppError("OFFER_NOT_PENDING", "You declined this rescue.", 409)
                pending = next((o for o in previous if o.status == "PENDING" and ensure_utc(o.expires_at) > now), None)
                if pending is None:
                    pending = MatchOffer(id=new_uuid(), rescue_id=rescue.id, receiver_organization_id=user.organization_id,
                        rank=1, score=candidate.score, proximity_score=candidate.factors["proximity"], urgency_score=candidate.factors["urgency"],
                        need_score=candidate.factors["need"], reliability_score=candidate.factors["reliability"], fairness_score=candidate.factors["fairness"],
                        estimated_distance_km=candidate.distance_km, estimated_travel_minutes=candidate.travel_minutes,
                        status="PENDING", offered_at=now, expires_at=rescue.pickup_by, created_at=now)
                    db.add(pending)
                    db.flush()
                actual_offer_id = pending.id
            data = _claim_once(db, actual_offer_id, user)
            db.commit()
            return ok(data, _request_id(request))
        except OperationalError as exc:
            db.rollback()
            if not _is_locked_error(exc):
                raise
            if attempt == CLAIM_ATTEMPTS:
                raise AppError(
                    "CLAIM_CONFLICT", "This rescue was just accepted by another receiver.", 409
                ) from exc
        except IntegrityError as exc:
            db.rollback()
            raise AppError("CLAIM_CONFLICT", "Another receiver has already accepted this rescue.", 409) from exc
        except AppError:
            db.rollback()
            raise
    raise AppError("CLAIM_CONFLICT", "This rescue was just accepted by another receiver.", 409)


@router.post("/{offer_id}/decline")
def decline(
    offer_id: str,
    request: Request,
    db: DbSession,
    user: User = Depends(require_roles(UserRole.RECEIVER)),
) -> dict[str, Any]:
    if offer_id.startswith("open_"):
        try:
            rescue = db.get(Rescue, uuid.UUID(offer_id[5:]))
        except ValueError:
            raise AppError("INVALID_OFFER", "Invalid offer identifier.", 422)
        candidate = _eligible(db, rescue, user, utcnow()) if rescue else None
        if candidate is None:
            raise AppError("OFFER_NOT_FOUND", "Offer was not found.", 404)
        db.add(MatchOffer(rescue_id=rescue.id, receiver_organization_id=user.organization_id, rank=1,
            score=candidate.score, proximity_score=0, urgency_score=0, need_score=0, reliability_score=0, fairness_score=0,
            estimated_distance_km=candidate.distance_km, estimated_travel_minutes=candidate.travel_minutes,
            status="DECLINED", offered_at=utcnow(), expires_at=rescue.pickup_by))
        db.commit()
        return ok({"offer_id": offer_id, "status": OfferStatus.DECLINED.value}, _request_id(request))
    try:
        actual_offer_id = uuid.UUID(offer_id)
    except ValueError:
        raise AppError("INVALID_OFFER", "Invalid offer identifier.", 422)
    offer = _load_own_offer(db, actual_offer_id, user)
    if offer.status != OfferStatus.PENDING.value:
        raise AppError("OFFER_NOT_PENDING", "This offer is no longer available.", 409)
    decline_offer(db, offer, user.id, utcnow())
    db.commit()
    return ok({"offer_id": str(offer.id), "status": OfferStatus.DECLINED.value}, _request_id(request))
