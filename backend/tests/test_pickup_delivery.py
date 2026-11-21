"""Receiver pickup with the donor-held code, then delivery and impact recording."""

import uuid

from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.impact import ImpactRecord
from app.models.offer import MatchOffer
from app.models.enums import OfferStatus

API = "/api/v1"


def _claimed_rescue(create_rescue, client: TestClient, hope_headers, db: Session) -> uuid.UUID:
    data = create_rescue(uuid.uuid4().hex)
    rescue_id = uuid.UUID(data["id"])
    offer = db.scalar(
        select(MatchOffer)
        .where(MatchOffer.rescue_id == rescue_id, MatchOffer.status == OfferStatus.PENDING.value)
        .execution_options(populate_existing=True)
    )
    assert offer is not None
    resp = client.post(f"{API}/offers/{offer.id}/claim", headers=hope_headers)
    assert resp.status_code == 200, resp.text
    return rescue_id


def _pickup_code(client: TestClient, donor_headers, rescue_id: uuid.UUID) -> str:
    resp = client.get(f"{API}/rescues/{rescue_id}", headers=donor_headers)
    assert resp.status_code == 200, resp.text
    code = resp.json()["data"]["pickup_code"]
    assert code and len(code) == 4
    return code


def _wrong_code(correct: str) -> str:
    return "0000" if correct != "0000" else "1111"


def test_correct_code_collects_200(
    create_rescue, client: TestClient, donor_headers, hope_headers, db_session: Session
) -> None:
    rescue_id = _claimed_rescue(create_rescue, client, hope_headers, db_session)
    code = _pickup_code(client, donor_headers, rescue_id)
    resp = client.post(
        f"{API}/rescues/{rescue_id}/collect",
        json={"pickup_code": code, "collected_servings": 140},
        headers=hope_headers,
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["data"]["status"] == "COLLECTED"


def test_wrong_code_is_400(
    create_rescue, client: TestClient, donor_headers, hope_headers, db_session: Session
) -> None:
    rescue_id = _claimed_rescue(create_rescue, client, hope_headers, db_session)
    code = _pickup_code(client, donor_headers, rescue_id)
    resp = client.post(
        f"{API}/rescues/{rescue_id}/collect",
        json={"pickup_code": _wrong_code(code), "collected_servings": 140},
        headers=hope_headers,
    )
    assert resp.status_code == 400, resp.text
    assert resp.json()["error"]["code"] == "PICKUP_CODE_INVALID"


def test_too_many_wrong_attempts_locks_code(
    create_rescue, client: TestClient, donor_headers, hope_headers, db_session: Session
) -> None:
    rescue_id = _claimed_rescue(create_rescue, client, hope_headers, db_session)
    code = _pickup_code(client, donor_headers, rescue_id)
    wrong = _wrong_code(code)
    body = {"pickup_code": wrong, "collected_servings": 140}

    for _ in range(5):
        resp = client.post(f"{API}/rescues/{rescue_id}/collect", json=body, headers=hope_headers)
        assert resp.status_code == 400, resp.text

    locked = client.post(f"{API}/rescues/{rescue_id}/collect", json=body, headers=hope_headers)
    assert locked.status_code == 429, locked.text
    assert locked.json()["error"]["code"] == "PICKUP_CODE_LOCKED"


def test_unrelated_receiver_cannot_collect(
    create_rescue, client: TestClient, donor_headers, hope_headers, shelter_headers, db_session: Session
) -> None:
    rescue_id = _claimed_rescue(create_rescue, client, hope_headers, db_session)
    code = _pickup_code(client, donor_headers, rescue_id)
    resp = client.post(
        f"{API}/rescues/{rescue_id}/collect",
        json={"pickup_code": code, "collected_servings": 140},
        headers=shelter_headers,
    )
    assert resp.status_code == 404, resp.text


def test_delivery_rejects_totals_above_collected_422(
    create_rescue, client: TestClient, donor_headers, hope_headers, db_session: Session
) -> None:
    rescue_id = _claimed_rescue(create_rescue, client, hope_headers, db_session)
    code = _pickup_code(client, donor_headers, rescue_id)
    collect = client.post(
        f"{API}/rescues/{rescue_id}/collect",
        json={"pickup_code": code, "collected_servings": 140},
        headers=hope_headers,
    )
    assert collect.status_code == 200, collect.text

    resp = client.post(
        f"{API}/rescues/{rescue_id}/deliver",
        json={"delivered_servings": 100, "rejected_servings": 50},
        headers=hope_headers,
    )
    assert resp.status_code == 422, resp.text


def test_delivery_creates_impact_record_once(
    create_rescue, client: TestClient, donor_headers, hope_headers, db_session: Session
) -> None:
    rescue_id = _claimed_rescue(create_rescue, client, hope_headers, db_session)
    code = _pickup_code(client, donor_headers, rescue_id)
    collect = client.post(
        f"{API}/rescues/{rescue_id}/collect",
        json={"pickup_code": code, "collected_servings": 140},
        headers=hope_headers,
    )
    assert collect.status_code == 200, collect.text

    deliver_body = {"delivered_servings": 130, "rejected_servings": 10}
    first = client.post(f"{API}/rescues/{rescue_id}/deliver", json=deliver_body, headers=hope_headers)
    assert first.status_code == 200, first.text

    client.post(f"{API}/rescues/{rescue_id}/deliver", json=deliver_body, headers=hope_headers)

    count = db_session.scalar(
        select(func.count()).select_from(ImpactRecord).where(ImpactRecord.rescue_id == rescue_id)
    )
    assert count == 1
