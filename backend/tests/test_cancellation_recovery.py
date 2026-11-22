import uuid
from sqlalchemy import select
from app.models.status_event import StatusEvent

API = "/api/v1"


def test_release_rematches_frees_capacity_and_isolates_chat(create_rescue, client, donor_headers, hope_headers, cityfood_headers):
    rid = create_rescue(uuid.uuid4().hex)["id"]
    assert client.post(f"{API}/offers/open_{rid}/claim",headers=hope_headers).status_code == 200
    assert client.post(f"{API}/rescues/{rid}/chat",headers=donor_headers,json={"message":"Private handoff for Hope only"}).status_code == 200
    assert client.post(f"{API}/rescues/{rid}/release",headers=cityfood_headers,json={"reason":"Transport unavailable"}).status_code == 404
    released = client.post(f"{API}/rescues/{rid}/release",headers=hope_headers,json={"reason":"Transport unavailable"})
    assert released.status_code == 200, released.text
    assert released.json()["data"]["status"] in ("MATCHING","OFFERED")
    assert client.get(f"{API}/receivers/capacity",headers=hope_headers).json()["data"]["available_servings"] == 180
    assert client.post(f"{API}/offers/open_{rid}/claim",headers=hope_headers).status_code == 409
    assert client.post(f"{API}/offers/open_{rid}/claim",headers=cityfood_headers).status_code == 200
    assert client.get(f"{API}/rescues/{rid}/chat",headers=cityfood_headers).json()["data"]["messages"] == []
    assert client.get(f"{API}/rescues/{rid}/chat",headers=hope_headers).status_code == 404
    history = client.get(f"{API}/offers/history",headers=hope_headers).json()["data"]
    assert history[0]["status"] == "CANCELLED"
    code = client.get(f"{API}/rescues/{rid}",headers=donor_headers).json()["data"]["pickup_code"]
    assert client.post(f"{API}/rescues/{rid}/collect",headers=cityfood_headers,json={"pickup_code":code,"collected_servings":140}).status_code == 200
    assert client.post(f"{API}/rescues/{rid}/release",headers=cityfood_headers,json={"reason":"Too late"}).status_code == 409


def test_donor_cancel_requires_reason_and_is_audited(create_rescue, client, donor_headers, hope_headers, db_session):
    rid = create_rescue(uuid.uuid4().hex)["id"]
    assert client.post(f"{API}/rescues/{rid}/cancel",headers=donor_headers).status_code == 422
    assert client.post(f"{API}/offers/open_{rid}/claim",headers=hope_headers).status_code == 200
    assert client.post(f"{API}/rescues/{rid}/cancel",headers=donor_headers,json={"reason":"Food no longer available"}).status_code == 200
    assert client.get(f"{API}/receivers/capacity",headers=hope_headers).json()["data"]["reserved_servings"] == 0
    events = db_session.scalars(select(StatusEvent).where(StatusEvent.rescue_id == uuid.UUID(rid))).all()
    assert any(e.reason == "cancelled_by_donor: Food no longer available" for e in events)
