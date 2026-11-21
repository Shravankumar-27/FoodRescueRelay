"""Background worker that times out expired dispatch offers.

Run once:      python -m app.workers.dispatch_worker --once
Run forever:   python -m app.workers.dispatch_worker
"""

from __future__ import annotations

import sys
import time
from datetime import datetime

from app.db.session import SessionLocal
from app.services.dispatch_service import advance_expired_offers

POLL_INTERVAL_SECONDS = 5


def run_once(now: datetime | None = None) -> int:
    """Process expired offers in one committed transaction. Returns the count."""
    db = SessionLocal()
    try:
        count = advance_expired_offers(db, now)
        db.commit()
        return count
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def main(argv: list[str]) -> None:
    if "--once" in argv:
        print(run_once())
        return
    try:
        while True:
            run_once()
            time.sleep(POLL_INTERVAL_SECONDS)
    except KeyboardInterrupt:
        return


if __name__ == "__main__":
    main(sys.argv[1:])
