"""Rescue creation: validation rules and idempotency."""

import uuid

from fastapi.testclient import TestClient

API = "/api/v1"


def test_valid_rescue_is_created(create_rescue) -> None:
    data = create_rescue(uuid.uuid4().hex, expect=201)
    assert data["total_servings"] == 140
    assert data["status"] == "OFFERED"


def test_zero_quantity_is_422(client: TestClient, donor_headers, make_payload) -> None:
    payload = make_payload(uuid.uuid4().hex)
    payload["food_items"][0]["quantity_servings"] = 0
    resp = client.post(f"{API}/rescues", json=payload, headers=donor_headers)
    assert resp.status_code == 422, resp.text


def test_negative_quantity_is_422(client: TestClient, donor_headers, make_payload) -> None:
    payload = make_payload(uuid.uuid4().hex)
    payload["food_items"][1]["quantity_servings"] = -5
    resp = client.post(f"{API}/rescues", json=payload, headers=donor_headers)
    assert resp.status_code == 422, resp.text


def test_pickup_in_past_is_422(client: TestClient, donor_headers, make_payload) -> None:
    payload = make_payload(uuid.uuid4().hex, pickup_minutes=-10)
    resp = client.post(f"{API}/rescues", json=payload, headers=donor_headers)
    assert resp.status_code == 422, resp.text
    assert resp.json()["error"]["code"] == "PICKUP_IN_PAST"


def test_served_food_is_422(client: TestClient, donor_headers, make_payload) -> None:
    payload = make_payload(uuid.uuid4().hex, served_or_mixed_with_waste=True)
    resp = client.post(f"{API}/rescues", json=payload, headers=donor_headers)
    assert resp.status_code == 422, resp.text
    assert resp.json()["error"]["code"] == "FOOD_NOT_ELIGIBLE"


def test_duplicate_idempotency_key_returns_same_rescue(
    client: TestClient, donor_headers, make_payload
) -> None:
    key = uuid.uuid4().hex
    first = client.post(f"{API}/rescues", json=make_payload(key), headers=donor_headers)
    assert first.status_code == 201, first.text
    second = client.post(f"{API}/rescues", json=make_payload(key), headers=donor_headers)
    assert second.status_code == 200, second.text
    assert second.json()["data"]["id"] == first.json()["data"]["id"]
