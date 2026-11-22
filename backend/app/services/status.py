"""Rescue status transitions with an audit trail."""

from __future__ import annotations

import uuid

from sqlalchemy import update
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.models.base_types import utcnow
from app.models.enums import RescueStatus
from app.models.rescue import Rescue
from app.models.status_event import StatusEvent

S = RescueStatus

ALLOWED: dict[RescueStatus, frozenset[RescueStatus]] = {
    S.POSTED: frozenset({S.MATCHING, S.CLAIMED, S.CANCELLED, S.EXPIRED}),
    S.MATCHING: frozenset({S.OFFERED, S.CLAIMED, S.EXPIRED, S.CANCELLED}),
    S.OFFERED: frozenset({S.CLAIMED, S.MATCHING, S.EXPIRED, S.CANCELLED}),
    S.CLAIMED: frozenset({S.COLLECTED, S.MATCHING, S.CANCELLED, S.EXPIRED}),
    S.COLLECTED: frozenset({S.DELIVERED}),
    S.DELIVERED: frozenset(),
    S.EXPIRED: frozenset(),
    S.CANCELLED: frozenset(),
}


def lock_rescue(db: Session, rescue_id: uuid.UUID) -> Rescue | None:
    # SQLite has no FOR UPDATE. A no-op write takes its writer lock.
    db.execute(update(Rescue).where(Rescue.id == rescue_id).values(updated_at=Rescue.updated_at))
    return db.get(Rescue, rescue_id, populate_existing=True)


def transition_rescue(
    db: Session,
    rescue: Rescue,
    to_status: RescueStatus,
    actor_user_id: uuid.UUID | None,
    reason: str | None = None,
) -> None:
    """Move ``rescue`` to ``to_status`` and record a StatusEvent.

    Raises AppError (409) when the transition is not allowed. Does not commit.
    """
    current = RescueStatus(rescue.status)
    if to_status not in ALLOWED.get(current, frozenset()):
        raise AppError("RESCUE_STATE_CHANGED", f"This rescue is now {current.value.lower()}. Refresh to see its available actions.", 409)

    now = utcnow()
    rescue.status = to_status.value
    rescue.updated_at = now
    db.add(
        StatusEvent(
            rescue_id=rescue.id,
            actor_user_id=actor_user_id,
            from_status=current.value,
            to_status=to_status.value,
            reason=reason[:300] if reason else None,
            created_at=now,
        )
    )
