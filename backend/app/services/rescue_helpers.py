"""Small helpers shared by rescue, matching and dispatch code."""

from __future__ import annotations

import secrets
from datetime import datetime, timezone

def ensure_utc(dt: datetime) -> datetime:
    """Return ``dt`` as an aware UTC datetime.

    SQLite returns naive datetimes; naive values are treated as UTC.
    """
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def seconds_remaining(pickup_by: datetime, now: datetime) -> int:
    """Whole seconds until ``pickup_by``, never negative."""
    delta = ensure_utc(pickup_by) - ensure_utc(now)
    return max(0, int(delta.total_seconds()))


def new_display_id() -> str:
    """Return a readable rescue code such as ``RR-12345678``."""
    return f"RR-{10_000_000 + secrets.randbelow(90_000_000)}"
