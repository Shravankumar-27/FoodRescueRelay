"""Health check route."""

from typing import Any

from fastapi import APIRouter, Request
from sqlalchemy import text

from app.api.responses import ok
from app.db.session import SessionLocal

router = APIRouter()


@router.get("/health")
def health(request: Request) -> dict[str, Any]:
    request_id = getattr(request.state, "request_id", "unknown")

    database = "ok"
    try:
        db = SessionLocal()
        try:
            db.execute(text("SELECT 1"))
        finally:
            db.close()
    except Exception:
        database = "unavailable"

    status = "ok" if database == "ok" else "degraded"
    return ok({"status": status, "database": database}, request_id)
