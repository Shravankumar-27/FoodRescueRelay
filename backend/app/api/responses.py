"""Helpers for building standard success response envelopes."""

from typing import Any

from fastapi.encoders import jsonable_encoder


def ok(data: Any, request_id: str) -> dict[str, Any]:
    return {
        "success": True,
        "data": jsonable_encoder(data),
        "request_id": request_id,
    }
