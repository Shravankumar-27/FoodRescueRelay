"""Small shared helpers used as column defaults across models."""

import uuid
from datetime import datetime, timezone


def new_uuid() -> uuid.UUID:
    """Return a fresh random UUID (used as a primary-key default)."""
    return uuid.uuid4()


def utcnow() -> datetime:
    """Return the current time as a timezone-aware UTC datetime."""
    return datetime.now(timezone.utc)
