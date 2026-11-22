"""Recognition is issued only by the receiver that confirmed the delivery.

The public response is an allowlist: no addresses, contacts, user identities,
pickup codes or beneficiary details. Revoked acknowledgements cannot be verified.
"""
import uuid
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select, update
from app.api.deps import DbSession, require_roles
from app.api.responses import ok
from app.core.errors import AppError
from app.models.base_types import utcnow
from app.models.enums import UserRole
from app.models.impact import ImpactRecord
from app.models.organization import Organization
from app.models.recognition import DonationRecognition
from app.models.rescue import Rescue
from app.models.user import User
from app.services.rescue_service import iso_utc

router = APIRouter(tags=["recognition"])


class RecognitionIn(BaseModel):
    people_served: int | None = Field(default=None, ge=0, le=100000, strict=True)
    food_rating: int | None = Field(default=None, ge=1, le=5, strict=True)
    message: str = Field(default="", max_length=280)
    consent_to_publish: bool = False

    @field_validator("message")
    @classmethod
    def clean_message(cls, value):
        return value.strip()


def _delivered(db, rescue_id, user):
    rescue = db.get(Rescue, rescue_id)
    impact = db.scalar(select(ImpactRecord).where(ImpactRecord.rescue_id == rescue_id))
    if not rescue or rescue.status != "DELIVERED" or not impact or user.organization_id not in (impact.donor_organization_id, impact.receiver_organization_id):
        raise AppError("RECOGNITION_NOT_FOUND", "A completed donation for your organization was not found.", 404)
    return rescue, impact


def _serialize(db, row, rescue=None, impact=None):
    rescue = rescue or db.get(Rescue, row.rescue_id)
    impact = impact or db.scalar(select(ImpactRecord).where(ImpactRecord.rescue_id == row.rescue_id))
    return {
        "rescue_id": str(rescue.id), "display_id": rescue.display_id,
        "public_token": str(row.public_token), "donor_name": row.donor_name,
        "receiver_name": row.receiver_name, "delivered_servings": impact.delivered_servings,
        "delivered_at": iso_utc(impact.created_at), "issued_at": iso_utc(row.issued_at),
        "people_served": row.people_served, "food_rating": row.food_rating, "message": row.message,
        "status": "WITHDRAWN" if row.withdrawn_at else "ISSUED", "demo": True,
        "disclaimer": "Receiver-issued appreciation for a confirmed donation. Food feedback is subjective, not a food-safety, legal or tax certification. Synthetic demo data.",
    }


@router.get("/rescues/{rescue_id}/recognition")
def get_recognition(rescue_id: uuid.UUID, request: Request, db: DbSession, user: User = Depends(require_roles(UserRole.DONOR, UserRole.RECEIVER))):
    rescue, impact = _delivered(db, rescue_id, user)
    row = db.scalar(select(DonationRecognition).where(DonationRecognition.rescue_id == rescue_id))
    return ok(_serialize(db, row, rescue, impact) if row else None, request.state.request_id)


@router.post("/rescues/{rescue_id}/recognition")
def issue(rescue_id: uuid.UUID, body: RecognitionIn, request: Request, db: DbSession, user: User = Depends(require_roles(UserRole.RECEIVER))):
    # Serialize concurrent issue/withdraw requests for this delivery.
    db.execute(update(Rescue).where(Rescue.id == rescue_id).values(updated_at=Rescue.updated_at))
    rescue, impact = _delivered(db, rescue_id, user)
    if user.organization_id != impact.receiver_organization_id:
        raise AppError("RECOGNITION_NOT_FOUND", "Only the receiving organization can issue this recognition.", 404)
    if not body.consent_to_publish:
        raise AppError("PUBLICATION_CONSENT_REQUIRED", "Confirm permission to share this acknowledgement publicly.", 422)
    if impact.delivered_servings <= 0:
        raise AppError("NO_DELIVERED_MEALS", "Recognition requires at least one delivered meal.", 409)
    if body.people_served is not None and not 1 <= body.people_served <= impact.delivered_servings:
        raise AppError("INVALID_PEOPLE_COUNT", "People served must be between one and the delivered servings. Leave blank if not counted.", 422)
    row = db.scalar(select(DonationRecognition).where(DonationRecognition.rescue_id == rescue_id))
    if row and not row.withdrawn_at:
        # Retried submissions are safe; an issued acknowledgement cannot be edited silently.
        if (row.people_served, row.food_rating, row.message) != (body.people_served, body.food_rating, body.message):
            raise AppError("ALREADY_ISSUED", "Withdraw the existing acknowledgement before issuing corrected details.", 409)
        return ok(_serialize(db, row, rescue, impact), request.state.request_id)
    if row is None:
        row = DonationRecognition(rescue_id=rescue_id, receiver_organization_id=user.organization_id)
        db.add(row)
    row.issued_by_user_id = user.id
    row.public_token = uuid.uuid4()
    row.people_served = body.people_served
    row.food_rating = body.food_rating
    row.message = body.message
    row.donor_name = db.get(Organization, impact.donor_organization_id).name
    row.receiver_name = user.organization.name
    row.issued_at = utcnow()
    row.withdrawn_at = None
    db.commit()
    return ok(_serialize(db, row, rescue, impact), request.state.request_id)


@router.post("/rescues/{rescue_id}/recognition/withdraw")
def withdraw(rescue_id: uuid.UUID, request: Request, db: DbSession, user: User = Depends(require_roles(UserRole.RECEIVER))):
    db.execute(update(Rescue).where(Rescue.id == rescue_id).values(updated_at=Rescue.updated_at))
    _delivered(db, rescue_id, user)
    row = db.scalar(select(DonationRecognition).where(DonationRecognition.rescue_id == rescue_id, DonationRecognition.receiver_organization_id == user.organization_id))
    if not row:
        raise AppError("RECOGNITION_NOT_FOUND", "Acknowledgement not found.", 404)
    row.withdrawn_at = row.withdrawn_at or utcnow()
    db.commit()
    return ok({"status": "WITHDRAWN"}, request.state.request_id)


@router.get("/recognition/verify/{token}")
def verify(token: uuid.UUID, request: Request, db: DbSession):
    row = db.scalar(select(DonationRecognition).where(DonationRecognition.public_token == token, DonationRecognition.withdrawn_at.is_(None)))
    if not row:
        raise AppError("RECOGNITION_UNAVAILABLE", "This recognition is unavailable or has been withdrawn. Do not use an old poster as current confirmation.", 404)
    return ok(_serialize(db, row), request.state.request_id)


@router.get("/recognition/mine")
def mine(request: Request, db: DbSession, user: User = Depends(require_roles(UserRole.DONOR, UserRole.RECEIVER))):
    field = ImpactRecord.donor_organization_id if user.role == "DONOR" else ImpactRecord.receiver_organization_id
    rows = db.execute(select(DonationRecognition, Rescue, ImpactRecord).join(Rescue, Rescue.id == DonationRecognition.rescue_id).join(ImpactRecord, ImpactRecord.rescue_id == Rescue.id).where(field == user.organization_id).order_by(DonationRecognition.issued_at.desc()).limit(100)).all()
    return ok([_serialize(db, r, s, i) for r, s, i in rows], request.state.request_id)
