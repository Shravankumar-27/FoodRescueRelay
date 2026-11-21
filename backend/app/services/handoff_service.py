"""Pickup-code helpers for handoffs.

Pickup codes are stored only as bcrypt hashes. A donor-visible copy is kept as a
Fernet-encrypted token so it can be shown back to the donor without storing
plaintext. The Fernet key is derived from JWT_SECRET.
"""

from __future__ import annotations

import base64
import hashlib
from datetime import datetime

from cryptography.fernet import Fernet
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import AppError
from app.core.security import hash_password, verify_password
from app.models.base_types import utcnow
from app.models.enums import RescueStatus
from app.models.handoff import Handoff
from app.models.rescue import Rescue
from app.services.rescue_helpers import ensure_utc

PICKUP_CODE_MAX_ATTEMPTS = 5
DONOR_VISIBLE_STATUSES = frozenset({RescueStatus.CLAIMED.value, RescueStatus.COLLECTED.value})


def _fernet() -> Fernet:
    digest = hashlib.sha256(get_settings().JWT_SECRET.encode("utf-8")).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def encrypt_display_code(code: str) -> str:
    return _fernet().encrypt(code.encode("utf-8")).decode("ascii")


def decrypt_display_code(token: str) -> str:
    return _fernet().decrypt(token.encode("ascii")).decode("utf-8")


def store_pickup_code(handoff: Handoff, code: str) -> None:
    """Keep the bcrypt hash for verification and the encrypted copy for the donor."""
    handoff.pickup_code_hash = hash_password(code)
    handoff.pickup_code_display = encrypt_display_code(code)


def verify_pickup_code(handoff: Handoff, code: str, now: datetime) -> bool:
    """Check a receiver-entered code against the handoff.

    Raises AppError when the code is locked (too many attempts) or expired.
    On a wrong code the attempt counter is incremented and False is returned;
    the caller must commit so the attempt persists, then report the error.
    Returns True when the code matches. Does not commit.
    """
    attempts = handoff.pickup_code_attempts or 0
    if attempts >= PICKUP_CODE_MAX_ATTEMPTS:
        raise AppError(
            "PICKUP_CODE_LOCKED",
            "Too many incorrect attempts. Ask the donor to confirm the code.",
            429,
        )
    if handoff.pickup_code_expires_at is None or ensure_utc(now) > ensure_utc(handoff.pickup_code_expires_at):
        raise AppError("PICKUP_CODE_EXPIRED", "This pickup code has expired.", 410)
    if handoff.pickup_code_hash and verify_password(code, handoff.pickup_code_hash):
        return True
    handoff.pickup_code_attempts = attempts + 1
    return False


def get_pickup_code_for_donor(db: Session, rescue: Rescue) -> str | None:
    """Return the decrypted 4-digit code for the donor, or None when not available.

    Only shown while the rescue is CLAIMED or COLLECTED and the code has not expired.
    """
    if rescue.status not in DONOR_VISIBLE_STATUSES:
        return None
    handoff = db.scalar(select(Handoff).where(Handoff.rescue_id == rescue.id))
    if handoff is None or not handoff.pickup_code_display:
        return None
    if handoff.pickup_code_expires_at is None or ensure_utc(handoff.pickup_code_expires_at) < utcnow():
        return None
    return decrypt_display_code(handoff.pickup_code_display)
