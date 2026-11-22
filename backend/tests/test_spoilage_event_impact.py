"""Regression coverage for timed dispatch and the new public event report."""

from datetime import datetime, timedelta
from uuid import UUID, uuid4

from sqlalchemy import select

from app.models.offer import MatchOffer
from app.models.status_event import StatusEvent
from app.workers.dispatch_worker import run_once

API = "/api/v1"


def test_hold_table_caps_pickup_and_escalates_once(client, create_rescue, db_session):
    guidance = client.get(f"{API}/hold-times").json()["data"]
    assert all(not rule["verified"] for rule in guidance["categories"])
    rescue = create_rescue(uuid4().hex, pickup_minutes=240, hold_hours={"COOKED_MEAL": 2})
    posted = datetime.fromisoformat(rescue["created_at"])
    pickup = datetime.fromisoformat(rescue["pickup_by"])
    consume = datetime.fromisoformat(rescue["consume_by"])
    assert consume - pickup == timedelta(minutes=30)
    assert consume - datetime.fromisoformat(rescue["prepared_at"]) == timedelta(hours=2)
    assert "private_address" not in rescue

    for ratio in (0.41, 0.42, 0.71, 0.72):
        run_once(now=posted + (pickup - posted) * ratio)
    reasons = db_session.scalars(select(StatusEvent.reason).where(
        StatusEvent.rescue_id == UUID(rescue["id"])
    )).all()
    for reason in ("radius_widened_volunteer_alert", "next_receiver_notified", "urgent_window"):
        assert reasons.count(reason) == 1


def test_missed_check_in_releases_address_and_reoffers(client, create_rescue, hope_headers, db_session):
    rescue = create_rescue(uuid4().hex)
    rid = rescue["id"]
    path = f"{API}/rescues/{rid}"
    assert client.post(f"{API}/offers/open_{rid}/claim", headers=hope_headers).status_code == 200
    detail = client.get(path, headers=hope_headers).json()["data"]
    assert detail["private_address"]
    run_once(now=datetime.fromisoformat(detail["check_in_due"]) + timedelta(seconds=1))

    detail = client.get(path, headers=hope_headers).json()["data"]
    assert "private_address" not in detail
    offers = db_session.scalars(select(MatchOffer).where(MatchOffer.rescue_id == UUID(rid))).all()
    assert "ACCEPTED" not in [offer.status for offer in offers]
    assert any(offer.status == "PENDING" for offer in offers)


def test_checked_in_delivery_can_publish_an_address_free_event(client, create_rescue, donor_headers, hope_headers):
    rescue = create_rescue(uuid4().hex)
    rid = rescue["id"]
    path = f"{API}/rescues/{rid}"
    assert client.post(f"{path}/event-share", headers=donor_headers).status_code == 404
    assert client.post(f"{API}/offers/open_{rid}/claim", headers=hope_headers).status_code == 200
    check = client.post(f"{path}/on-the-way", headers=hope_headers)
    assert check.status_code == 200
    assert client.post(f"{path}/on-the-way", headers=hope_headers).json()["data"] == check.json()["data"]
    code = client.get(path, headers=donor_headers).json()["data"]["pickup_code"]
    assert client.post(f"{path}/collect", headers=hope_headers,
                       json={"pickup_code": code, "collected_servings": 140}).status_code == 200
    assert client.post(f"{path}/deliver", headers=hope_headers,
                       json={"delivered_servings": 132, "rejected_servings": 8}).status_code == 200

    response = client.post(f"{path}/event-share", headers=donor_headers)
    assert response.status_code == 200, response.text
    token = response.json()["data"]["token"]
    report = client.get(f"{API}/event-impact/{token}").json()["data"]
    assert report["meals"] == 132
    assert report["estimated_kg"] == 52.8
    assert report["estimated_co2e_kg"] == 132
    assert report["receiver_names"] == ["Hope Community Kitchen"]
    assert set(report) == {
        "meals", "estimated_kg", "estimated_co2e_kg", "kg_per_meal", "co2e_per_kg",
        "receiver_names", "data_notice", "safety_notice",
    }


def test_admin_demo_clock_advances_the_shared_listing_timeline(monkeypatch, create_rescue, donor_headers, admin_headers):
    from fastapi.testclient import TestClient
    from app.core.config import get_settings
    from app.main import create_app

    rescue = create_rescue(uuid4().hex)
    monkeypatch.setattr(get_settings(), "DEMO_CLOCK_ENABLED", True)
    with TestClient(create_app()) as demo:
        for minutes in (21, 15):
            response = demo.post(f"{API}/demo/clock", headers=admin_headers, json={"minutes": minutes})
            assert response.status_code == 200, response.text
        detail = demo.get(f"{API}/rescues/{rescue['id']}", headers=donor_headers).json()["data"]
        assert detail["clock_offset_ms"] == 36 * 60_000
        assert detail["urgent"] is True
        assert sum(event["reason"] == "urgent_window" for event in detail["status_events"]) == 1
