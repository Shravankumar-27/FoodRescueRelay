"""Shared pytest fixtures.

The test database and timeout are set in os.environ BEFORE any app module is
imported, because app.core.config and app.db.session read them at import time.
"""

from __future__ import annotations

import os
import pathlib
from collections.abc import Callable, Iterator
from datetime import datetime, timedelta, timezone
from typing import Any

BACKEND_DIR = pathlib.Path(__file__).resolve().parent.parent
TEST_DB_PATH = BACKEND_DIR / "data" / "_pytest.db"
_TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL", "").strip()
if _TEST_DATABASE_URL:
    os.environ["DATABASE_URL"] = _TEST_DATABASE_URL
else:
    os.environ["DATABASE_URL"] = "sqlite:///" + TEST_DB_PATH.as_posix()
_IS_SQLITE_TEST_DB = os.environ["DATABASE_URL"].startswith("sqlite")
os.environ["DISPATCH_OFFER_TIMEOUT_SECONDS"] = "120"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from app.db.session import SessionLocal  # noqa: E402
from app.main import app  # noqa: E402
from app.seed.init_db import DEMO_PASSWORD, init_database  # noqa: E402

API = "/api/v1"


def make_rescue_payload(key: str, pickup_minutes: int = 50, **overrides: Any) -> dict[str, Any]:
    """Valid rescue creation body for 140 servings, with optional field overrides."""
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "food_items": [
            {
                "name": "Veg Biryani",
                "quantity_servings": 100,
                "dietary_type": "VEG",
                "allergens": ["dairy"],
                "allergen_info_unknown": False,
            },
            {
                "name": "Dal",
                "quantity_servings": 40,
                "dietary_type": "VEG",
                "allergens": [],
                "allergen_info_unknown": False,
            },
        ],
        "handling_type": "HOT_HELD",
        "handling_notes": "Kept hot",
        "untouched_confirmed": True,
        "served_or_mixed_with_waste": False,
        "packaging_available": True,
        "safety_attestation": True,
        "prepared_at": (now - timedelta(minutes=30)).isoformat(),
        "pickup_by": (now + timedelta(minutes=pickup_minutes)).isoformat(),
        "idempotency_key": key,
    }
    payload.update(overrides)
    return payload


@pytest.fixture(scope="session", autouse=True)
def test_database() -> Iterator[None]:
    """Start from a fresh SQLite file and seed the demo data once per session."""
    if _IS_SQLITE_TEST_DB and TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()
    init_database()
    yield


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def login(client: TestClient) -> Callable[[str], dict[str, str]]:
    def _login(email: str) -> dict[str, str]:
        resp = client.post(f"{API}/auth/login", json={"email": email, "password": DEMO_PASSWORD})
        assert resp.status_code == 200, resp.text
        return {"Authorization": f"Bearer {resp.json()['data']['token']}"}

    return _login


@pytest.fixture
def donor_headers(login: Callable[[str], dict[str, str]]) -> dict[str, str]:
    return login("donor@rescuerelay.demo")


@pytest.fixture
def hope_headers(login: Callable[[str], dict[str, str]]) -> dict[str, str]:
    return login("hope@rescuerelay.demo")


@pytest.fixture
def shelter_headers(login: Callable[[str], dict[str, str]]) -> dict[str, str]:
    return login("shelter@rescuerelay.demo")


@pytest.fixture
def cityfood_headers(login: Callable[[str], dict[str, str]]) -> dict[str, str]:
    return login("cityfood@rescuerelay.demo")


@pytest.fixture
def admin_headers(login: Callable[[str], dict[str, str]]) -> dict[str, str]:
    return login("admin@rescuerelay.demo")


@pytest.fixture
def db_session() -> Iterator[Session]:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture
def make_payload() -> Callable[..., dict[str, Any]]:
    return make_rescue_payload


@pytest.fixture
def create_rescue(
    client: TestClient, donor_headers: dict[str, str]
) -> Callable[..., dict[str, Any]]:
    """POST a rescue as the demo donor and return its response data."""

    def _create(key: str, expect: int = 201, **overrides: Any) -> dict[str, Any]:
        resp = client.post(
            f"{API}/rescues",
            json=make_rescue_payload(key, **overrides),
            headers=donor_headers,
        )
        assert resp.status_code == expect, resp.text
        return resp.json()["data"]

    return _create
