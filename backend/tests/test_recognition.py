"""Receiver consent, publication privacy and honest contribution metrics."""
import uuid
import pytest
from app.seed.reset_demo import reset_demo

API = "/api/v1"


@pytest.fixture
def delivered(client, create_rescue, donor_headers, hope_headers):
    rescue = create_rescue(uuid.uuid4().hex)
    rid = rescue["id"]
    assert client.post(f"{API}/offers/open_{rid}/claim", headers=hope_headers).status_code == 200
    code = client.get(f"{API}/rescues/{rid}", headers=donor_headers).json()["data"]["pickup_code"]
    assert client.post(f"{API}/rescues/{rid}/collect", headers=hope_headers, json={"pickup_code":code,"collected_servings":140}).status_code == 200
    assert client.post(f"{API}/rescues/{rid}/deliver", headers=hope_headers, json={"delivered_servings":132,"rejected_servings":8}).status_code == 200
    return rid


def issue(client, rid, headers, **changes):
    body = {"people_served":100,"food_rating":4,"message":"Thank you for supporting our community kitchen.","consent_to_publish":True}
    body.update(changes)
    return client.post(f"{API}/rescues/{rid}/recognition", headers=headers, json=body)


def test_only_actual_receiver_can_issue(delivered, client, donor_headers, hope_headers, cityfood_headers):
    assert issue(client, delivered, donor_headers).status_code == 403
    assert issue(client, delivered, cityfood_headers).status_code == 404
    assert issue(client, delivered, hope_headers, consent_to_publish=False).status_code == 422
    assert issue(client, delivered, hope_headers).status_code == 200
    assert client.get(f"{API}/rescues/{delivered}/recognition", headers=cityfood_headers).status_code == 404


@pytest.mark.parametrize("changes", [{"people_served":133},{"people_served":0},{"people_served":1.5},{"food_rating":6},{"food_rating":True}])
def test_recognition_validates_reported_figures(delivered, client, hope_headers, changes):
    assert issue(client, delivered, hope_headers, **changes).status_code == 422


def test_public_verification_is_minimal_and_revocable(delivered, client, hope_headers, donor_headers):
    first = issue(client, delivered, hope_headers).json()["data"]
    url = f"{API}/recognition/verify/{first['public_token']}"
    public = client.get(url).json()["data"]
    assert public["delivered_servings"] == 132 and public["people_served"] == 100
    assert not ({"private_address","latitude","longitude","donor_phone","issued_by_user_id","pickup_code"} & public.keys())
    assert issue(client, delivered, hope_headers).json()["data"]["public_token"] == first["public_token"]
    assert issue(client, delivered, hope_headers, food_rating=5).status_code == 409
    summary = client.get(f"{API}/impact/summary", headers=donor_headers).json()["data"]
    assert summary["reported_people_served"] == 100 and summary["food_rating"] == 4
    assert summary["total_meals_rescued"] == 132 and summary["rejected_servings"] == 8
    assert summary["recognition_count"] == 1
    assert client.post(f"{API}/rescues/{delivered}/recognition/withdraw", headers=hope_headers).status_code == 200
    assert client.get(url).status_code == 404
    summary = client.get(f"{API}/impact/summary", headers=donor_headers).json()["data"]
    assert summary["reported_people_served"] == 0 and summary["food_rating"] is None
    assert summary["total_meals_rescued"] == 132
    second = issue(client, delivered, hope_headers, food_rating=5).json()["data"]
    assert second["public_token"] != first["public_token"]
    assert client.get(url).status_code == 404


def test_unknown_people_are_not_invented(delivered, client, donor_headers, hope_headers):
    assert issue(client, delivered, hope_headers, people_served=None, food_rating=None).status_code == 200
    summary = client.get(f"{API}/impact/summary", headers=donor_headers).json()["data"]
    assert summary["total_meals_rescued"] == 132
    assert summary["reported_people_served"] == 0 and summary["people_counted_deliveries"] == 0
    assert summary["food_rating_count"] == 0


def test_cannot_issue_before_delivery(create_rescue, client, hope_headers):
    rid = create_rescue(uuid.uuid4().hex)["id"]
    assert issue(client, rid, hope_headers).status_code == 404


def test_admin_certificate_is_shared_with_both_partners(delivered, client, admin_headers, donor_headers, hope_headers):
    path = f"{API}/admin/recognition/{delivered}"
    assert client.post(path, headers=donor_headers, json={"consent_to_publish": True}).status_code == 403
    assert client.post(path, headers=admin_headers, json={"consent_to_publish": True, "food_rating": 5}).status_code == 422
    response = client.post(path, headers=admin_headers, json={"consent_to_publish": True, "message": "Thank you."})
    assert response.status_code == 200, response.text
    certificate = response.json()["data"]
    assert certificate["issuer_role"] == "ADMIN" and certificate["delivered_servings"] == 132
    assert certificate["receiver_name"] == "Hope Community Kitchen"
    listed = client.get(f"{API}/admin/recognition", headers=admin_headers, params={"code": certificate["display_id"]})
    assert listed.status_code == 200, listed.text
    assert listed.json()["data"][0]["certificate"]["public_token"] == certificate["public_token"]
    for headers in (donor_headers, hope_headers):
        records = client.get(f"{API}/recognition/mine", headers=headers).json()["data"]
        assert records[0]["public_token"] == certificate["public_token"]
    public = f"{API}/recognition/verify/{certificate['public_token']}"
    assert client.get(public).json()["data"]["issuer_role"] == "ADMIN"
    assert client.post(f"{API}/rescues/{delivered}/recognition/withdraw", headers=hope_headers).status_code == 403
    assert client.post(f"{path}/withdraw", headers=admin_headers).status_code == 200
    assert client.get(public).status_code == 404


def test_demo_reset_removes_recognition_and_chat_children(delivered, client, hope_headers, db_session):
    data = issue(client, delivered, hope_headers).json()["data"]
    client.post(f"{API}/rescues/{delivered}/chat", headers=hope_headers, json={"message":"Thank you"})
    client.post(f"{API}/rescues/{delivered}/rating", headers=hope_headers, json={"stars":5})
    reset_demo(db_session)
    db_session.commit()
    assert client.get(f"{API}/recognition/verify/{data['public_token']}").status_code == 404
