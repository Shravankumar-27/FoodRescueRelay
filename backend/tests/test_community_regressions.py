"""Cross-account discovery, deadline, chat, capacity and impact regressions."""
import uuid
from datetime import timedelta
import pytest
from sqlalchemy import select
from app.models.base_types import utcnow
from app.models.organization import Organization
from app.models.rescue import Rescue
from app.models.offer import MatchOffer
from app.models.receiver_capacity import ReceiverCapacity
from app.services.dispatch_service import advance_expired_offers

API = "/api/v1"


def test_compatible_accounts_see_and_claim_same_listing(create_rescue, client, hope_headers, cityfood_headers, shelter_headers):
    rescue = create_rescue(uuid.uuid4().hex)
    for headers in (hope_headers, cityfood_headers):
        response = client.get(f"{API}/offers/available", headers=headers)
        assert response.status_code == 200, response.text
        assert rescue["id"] in [o["rescue_id"] for o in response.json()["data"]]
    assert rescue["id"] not in [o["rescue_id"] for o in client.get(f"{API}/offers/available", headers=shelter_headers).json()["data"]]
    response = client.post(f"{API}/offers/open_{rescue['id']}/claim", headers=cityfood_headers)
    assert response.status_code == 200, response.text
    assert client.post(f"{API}/offers/open_{rescue['id']}/claim", headers=hope_headers).status_code == 409


def test_open_claim_revalidates_capacity_and_preferences(create_rescue, client, cityfood_headers, db_session):
    rescue = create_rescue(uuid.uuid4().hex)
    org = db_session.scalar(select(Organization).where(Organization.name == "City Food Relief"))
    cap = db_session.scalar(select(ReceiverCapacity).where(ReceiverCapacity.organization_id == org.id))
    cap.accepted_food_categories = ["BAKERY"]
    db_session.commit()
    assert client.post(f"{API}/offers/open_{rescue['id']}/claim", headers=cityfood_headers).status_code == 409
    assert rescue["id"] not in [o["rescue_id"] for o in client.get(f"{API}/offers/available", headers=cityfood_headers).json()["data"]]


def test_portion_feed_only_shows_compatible_food(create_rescue, client, shelter_headers, db_session):
    org = db_session.scalar(select(Organization).where(Organization.name == "ShelterServe"))
    capacity = db_session.scalar(select(ReceiverCapacity).where(ReceiverCapacity.organization_id == org.id))
    capacity.excluded_allergens = ["dairy"]
    db_session.commit()
    rescue = create_rescue(uuid.uuid4().hex)
    feed = client.get(f"{API}/offers/available?include_portions=true", headers=shelter_headers)
    assert feed.status_code == 200, feed.text
    offer = next(row for row in feed.json()["data"] if row["rescue_id"] == rescue["id"])
    assert offer["portion_only"] and offer["suggested_servings"] == 40
    assert [item["name"] for item in offer["food_items"]] == ["Dal"]
    assert client.post(f"{API}/offers/open_{rescue['id']}/claim", headers=shelter_headers).status_code == 409


def test_declined_open_listing_stays_hidden(create_rescue, client, cityfood_headers):
    rescue = create_rescue(uuid.uuid4().hex)
    assert client.post(f"{API}/offers/open_{rescue['id']}/decline", headers=cityfood_headers).status_code == 200
    assert rescue["id"] not in [o["rescue_id"] for o in client.get(f"{API}/offers/available", headers=cityfood_headers).json()["data"]]


@pytest.mark.parametrize("status", ["MATCHING", "OFFERED", "CLAIMED"])
def test_uncollected_rescues_expire_even_without_pending_offers(status, create_rescue, db_session):
    data = create_rescue(uuid.uuid4().hex)
    rescue = db_session.get(Rescue, uuid.UUID(data["id"]))
    rescue.status = status
    for offer in db_session.scalars(select(MatchOffer).where(MatchOffer.rescue_id == rescue.id)).all():
        offer.status = "CANCELLED"
    db_session.commit()
    advance_expired_offers(db_session, rescue.pickup_by + timedelta(seconds=1))
    db_session.flush()
    assert rescue.status == "EXPIRED"


def test_capacity_reserved_until_delivery_and_shared_impact(create_rescue, client, donor_headers, hope_headers, cityfood_headers):
    data = create_rescue(uuid.uuid4().hex)
    rid = data["id"]
    assert client.post(f"{API}/offers/open_{rid}/claim", headers=hope_headers).status_code == 200
    cap = client.get(f"{API}/receivers/capacity", headers=hope_headers).json()["data"]
    assert cap["available_servings"] == 40
    assert cap["reserved_servings"] == 140
    second = create_rescue(uuid.uuid4().hex)
    assert client.post(f"{API}/offers/open_{second['id']}/claim", headers=hope_headers).status_code == 409
    assert client.get(f"{API}/rescues/{rid}/chat", headers=cityfood_headers).status_code == 404
    code = client.get(f"{API}/rescues/{rid}", headers=donor_headers).json()["data"]["pickup_code"]
    assert client.post(f"{API}/rescues/{rid}/collect", headers=hope_headers, json={"pickup_code":code,"collected_servings":140}).status_code == 200
    assert client.get(f"{API}/rescues/{rid}", headers=hope_headers).json()["data"]["collected_servings"] == 140
    assert client.post(f"{API}/rescues/{rid}/deliver", headers=hope_headers, json={"delivered_servings":130,"rejected_servings":10}).status_code == 200
    for headers in (donor_headers, hope_headers):
        final = client.get(f"{API}/rescues/{rid}", headers=headers).json()["data"]
        assert final["status"] == "DELIVERED"
        assert final["impact"]["delivered_servings"] == 130
    assert client.get(f"{API}/receivers/capacity", headers=hope_headers).json()["data"]["available_servings"] == 180
    assert client.get(f"{API}/impact/community").json()["data"]["total_meals_rescued"] == 130
    assert client.post(f"{API}/rescues/{rid}/rating", headers=donor_headers, json={"stars":5}).status_code == 200
    assert client.post(f"{API}/rescues/{rid}/rating", headers=cityfood_headers, json={"stars":5}).status_code == 404
    csv = client.get(f"{API}/impact/report/donor", headers=donor_headers)
    assert csv.status_code == 200 and "130" in csv.text


def test_private_partner_chat_and_unread_inbox(client, donor_headers, hope_headers, cityfood_headers, db_session):
    donor = db_session.scalar(select(Organization).where(Organization.name == "Madhapur Grand Events"))
    receiver = db_session.scalar(select(Organization).where(Organization.name == "Hope Community Kitchen"))
    assert client.post(f"{API}/partners/{receiver.id}/chat", headers=donor_headers, json={"message":"Can you collect 40 vegetarian meals?"}).status_code == 200
    assert client.get(f"{API}/partners/inbox", headers=hope_headers).json()["data"][0]["unread"] == 1
    assert client.get(f"{API}/partners/inbox", headers=cityfood_headers).json()["data"] == []
    assert client.get(f"{API}/partners/{donor.id}/chat", headers=hope_headers).json()["data"]["messages"][0]["message"].startswith("Can you collect")
    assert client.get(f"{API}/partners/inbox", headers=hope_headers).json()["data"][0]["unread"] == 0
    assert client.post(f"{API}/partners/{receiver.id}/chat", headers=cityfood_headers, json={"message":"hello"}).status_code == 404
    assert client.post(f"{API}/partners/{receiver.id}/chat", headers=donor_headers, json={"message":"   "}).status_code == 422


def test_extended_dietary_category_and_allergen_matching(create_rescue, client, hope_headers):
    cap = client.get(f"{API}/receivers/capacity", headers=hope_headers).json()["data"]
    cap.update(accepted_dietary_types=["JAIN"], accepted_food_categories=["BAKERY"], excluded_allergens=["peanuts"])
    assert client.put(f"{API}/receivers/capacity", headers=hope_headers, json=cap).status_code == 200
    compatible = create_rescue(uuid.uuid4().hex, food_items=[{"name":"Jain bread", "quantity_servings":40,"dietary_type":"JAIN","food_category":"BAKERY","allergens":[],"allergen_info_unknown":False}])
    incompatible = create_rescue(uuid.uuid4().hex, food_items=[{"name":"Peanut bread", "quantity_servings":40,"dietary_type":"JAIN","food_category":"BAKERY","allergens":["peanuts"],"allergen_info_unknown":False}])
    ids = [r["rescue_id"] for r in client.get(f"{API}/offers/available", headers=hope_headers).json()["data"]]
    assert compatible["id"] in ids and incompatible["id"] not in ids


def test_admin_verification_and_non_admin_rejection(client, donor_headers, admin_headers, db_session):
    org = db_session.scalar(select(Organization).where(Organization.name == "City Food Relief"))
    path = f"{API}/admin/organizations/{org.id}/verification"
    body = {"status":"SUSPENDED", "reason":"Demo verification review"}
    assert client.post(path, headers=donor_headers, json=body).status_code == 403
    assert client.post(path, headers=admin_headers, json=body).status_code == 200
    nearby = client.get(f"{API}/receivers/nearby", headers=donor_headers).json()["data"]
    assert str(org.id) not in [o["id"] for o in nearby]


def test_invalid_offer_identifier_is_validation_error(client, hope_headers):
    assert client.post(f"{API}/offers/open_not-a-uuid/claim", headers=hope_headers).status_code == 422


def test_future_preparation_is_rejected(create_rescue, client, donor_headers, make_payload):
    payload = make_payload(uuid.uuid4().hex, prepared_at=(utcnow()+timedelta(minutes=5)).isoformat())
    assert client.post(f"{API}/rescues", headers=donor_headers, json=payload).status_code == 422
