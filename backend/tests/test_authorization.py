"""Role and ownership checks: who can see or change what."""

import uuid

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.enums import OfferStatus
from app.models.offer import MatchOffer

API = "/api/v1"
DEMO_PRIVATE_ADDRESS = "Demo venue address (synthetic)"


def test_receiver_cannot_cancel_donor_rescue(
    create_rescue, client: TestClient, hope_headers
) -> None:
    data = create_rescue(uuid.uuid4().hex)
    resp = client.post(f"{API}/rescues/{data['id']}/cancel", headers=hope_headers)
    assert resp.status_code in (403, 404), resp.text


def test_unrelated_receiver_gets_404_without_private_address(
    create_rescue, client: TestClient, shelter_headers
) -> None:
    # ShelterServe is infeasible for 140 servings, so it never receives an offer.
    data = create_rescue(uuid.uuid4().hex)
    resp = client.get(f"{API}/rescues/{data['id']}", headers=shelter_headers)
    assert resp.status_code == 404, resp.text
    assert DEMO_PRIVATE_ADDRESS not in resp.text
    assert "private_address" not in resp.text


def test_admin_can_list_rescues(client: TestClient, admin_headers) -> None:
    resp = client.get(f"{API}/admin/rescues", headers=admin_headers)
    assert resp.status_code == 200, resp.text


def test_donor_cannot_list_admin_rescues(client: TestClient, donor_headers) -> None:
    resp = client.get(f"{API}/admin/rescues", headers=donor_headers)
    assert resp.status_code == 403, resp.text


def test_admin_never_sees_pickup_code(
    create_rescue, client: TestClient, hope_headers, admin_headers, db_session: Session
) -> None:
    data = create_rescue(uuid.uuid4().hex)
    rescue_id = uuid.UUID(data["id"])
    offer = db_session.scalar(
        select(MatchOffer)
        .where(MatchOffer.rescue_id == rescue_id, MatchOffer.status == OfferStatus.PENDING.value)
        .execution_options(populate_existing=True)
    )
    assert offer is not None
    claim = client.post(f"{API}/offers/{offer.id}/claim", headers=hope_headers)
    assert claim.status_code == 200, claim.text

    resp = client.get(f"{API}/rescues/{rescue_id}", headers=admin_headers)
    assert resp.status_code == 200, resp.text
    assert "pickup_code" not in resp.json()["data"]
