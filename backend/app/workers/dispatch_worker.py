"""Background worker that times out expired dispatch offers.

Run once:      python -m app.workers.dispatch_worker --once
Run forever:   python -m app.workers.dispatch_worker
"""

from __future__ import annotations

import sys
import time
import logging
from datetime import datetime

from app.db.session import SessionLocal
from app.core.config import get_settings
from app.services.dispatch_service import advance_expired_offers

POLL_INTERVAL_SECONDS = 5
HEARTBEAT_SECONDS = 60
logger = logging.getLogger(__name__)


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
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s", stream=sys.stdout)
    logger.info("Dispatch worker started (database target: %s). Checking every %s seconds.",
                get_settings().DATABASE_TARGET, POLL_INTERVAL_SECONDS)
    if "--once" in argv:
        count = run_once()
        logger.info("Check complete: %s expired offers processed.", count)
        return
    last_heartbeat = 0.0
    try:
        while True:
            count = run_once()
            now = time.monotonic()
            if count:
                logger.info("Processed %s expired offers.", count)
            if now - last_heartbeat >= HEARTBEAT_SECONDS:
                logger.info("Worker healthy; dispatch check complete. Waiting for the next check.")
                last_heartbeat = now
            time.sleep(POLL_INTERVAL_SECONDS)
    except KeyboardInterrupt:
        logger.info("Dispatch worker stopped.")
        return


if __name__ == "__main__":
    main(sys.argv[1:])
