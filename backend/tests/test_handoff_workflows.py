from uuid import uuid4

from sqlalchemy import select

from app.models.handoff import Handoff
from app.models.offer import MatchOffer
from app.models.rescue import Rescue

API = "/api/v1"


def test_retry_dispatch_and_release_notification_with_donor_replacement(
    client, create_rescue, donor_headers, hope_headers, cityfood_headers, db_session,
):
    rescue = create_rescue(uuid4().hex)
    path = f"{API}/rescues/{rescue['id']}"
    assert client.post(f"{path}/dispatch", headers=donor_headers).status_code == 200
    assert client.post(f"{API}/offers/open_{rescue['id']}/claim", headers=hope_headers).status_code == 200
    released = client.post(f"{path}/release", headers=hope_headers, json={"reason": "Our pickup team is unavailable"})
    assert released.status_code == 200, released.text
    listing = next(item for item in client.get(f"{API}/rescues/mine", headers=donor_headers).json()["data"]
                   if item["id"] == rescue["id"])
    assert listing["receiver_release"]["reason"] == "Our pickup team is unavailable"
    matches = client.get(f"{path}/matches", headers=donor_headers).json()["data"]
    assert any("declined" in " ".join(match["rejection_reasons"]) for match in matches)
    replacement = next(match for match in matches if match["replacement_available"])
    chosen = client.post(f"{path}/replacement/{replacement['receiver_id']}", headers=donor_headers)
    assert chosen.status_code == 200, chosen.text
    assert chosen.json()["data"]["pending_receiver"] == replacement["receiver_name"]
    assert client.post(f"{API}/offers/open_{rescue['id']}/claim", headers=cityfood_headers).status_code == 200
    events = client.get(f"{path}/events", headers=cityfood_headers).json()["data"]
    assert all("Our pickup team" not in (event["reason"] or "") for event in events)
    assert db_session.scalar(select(MatchOffer).join(Rescue).where(
        Rescue.display_id == rescue["display_id"], MatchOffer.status == "ACCEPTED"
    ))


def test_logistics_start_at_claim_and_unblock_pickup(
    client, create_rescue, donor_headers, hope_headers, admin_headers, cityfood_headers,
):
    capacity = client.get(f"{API}/receivers/capacity", headers=hope_headers).json()["data"]
    capacity.update(transport_available=False, containers_available=False, refrigeration_available=True, volunteer_servings=30)
    assert client.put(f"{API}/receivers/capacity", headers=hope_headers, json=capacity).status_code == 200
    rescue = create_rescue(uuid4().hex, packaging_available=False, handling_type="REFRIGERATED")
    path = f"{API}/rescues/{rescue['id']}"
    puzzle = client.get(f"{path}/allocation-puzzle", headers=donor_headers).json()["data"]
    hope = next(item for item in puzzle["receivers"] if item["name"] == "Hope Community Kitchen")
    assert puzzle["requires_refrigeration"]
    assert (hope["volunteers"], hope["refrigeration"], len(hope["eligible_items"])) == (30, True, 2)
    assert client.get(f"{API}/admin/logistics", headers=admin_headers).json()["data"] == []
    claim = client.post(f"{API}/offers/open_{rescue['id']}/claim", headers=hope_headers)
    assert claim.status_code == 200, claim.text
    offer_id = claim.json()["data"]["offer_id"]
    assert client.get(f"{path}/logistics", headers=cityfood_headers).status_code == 404
    queued = client.get(f"{API}/admin/logistics", headers=admin_headers).json()["data"]
    assert len(queued) == 1 and all(resource["needs_help"] for resource in queued[0]["resources"].values())
    code = client.get(path, headers=donor_headers).json()["data"]["pickup_code"]
    quantity = {"pickup_code": code, "collected_servings": 140}
    pending = client.post(f"{path}/collect", headers=hope_headers, json=quantity)
    assert pending.json()["error"]["code"] == "LOGISTICS_PENDING"
    donor = client.put(f"{path}/logistics", headers=donor_headers,
                       json={"offer_id": offer_id, "containers": True, "transport": False})
    assert donor.status_code == 200, donor.text
    provider_path = f"{API}/admin/logistics/{rescue['id']}/{offer_id}/transport"
    provider = {"name": "Demo Courier", "contact": "dispatch@example.test"}
    for value in (provider, None, provider):
        response = client.put(provider_path, headers=admin_headers, json=value)
        assert response.status_code == 200, response.text
    assert client.get(f"{path}/logistics", headers=hope_headers).json()["data"]["resources"]["transport"]["provider"] == provider
    assert client.post(f"{path}/collect", headers=hope_headers, json=quantity).status_code == 200
    assert client.post(f"{path}/collect", headers=hope_headers, json=quantity).status_code == 200
    assert client.get(f"{API}/admin/logistics", headers=admin_headers).json()["data"] == []


def test_menu_feedback_is_opt_in_aggregated_and_withdrawable(
    client, create_rescue, donor_headers, hope_headers, cityfood_headers, db_session,
):
    answers = {"consent": True, "taste": 5, "packaging": 4, "dietary_fit": 3,
               "staple_portion": "too_large", "vegetable_portion": "too_small"}
    summary_path = f"{API}/impact/meal-insights"
    for count in range(1, 4):
        rescue = create_rescue(uuid4().hex)
        path = f"{API}/rescues/{rescue['id']}"
        assert client.post(f"{API}/offers/open_{rescue['id']}/claim", headers=hope_headers).status_code == 200
        code = client.get(path, headers=donor_headers).json()["data"]["pickup_code"]
        assert client.put(f"{path}/meal-feedback", headers=hope_headers, json=answers).status_code == 409
        assert client.post(f"{path}/collect", headers=hope_headers,
                           json={"pickup_code": code, "collected_servings": 140}).status_code == 200
        assert client.post(f"{path}/deliver", headers=hope_headers,
                           json={"delivered_servings": 140, "rejected_servings": 0}).status_code == 200
        assert client.get(f"{path}/meal-feedback", headers=cityfood_headers).status_code == 404
        assert client.get(f"{path}/meal-feedback", headers=donor_headers).status_code == 403
        response = client.put(f"{path}/meal-feedback", headers=hope_headers, json=answers)
        assert response.status_code == 200, response.text
        result = client.get(summary_path, headers=donor_headers).json()["data"]
        assert result["responses"] == count
        if count < 3:
            assert not result["averages"]
    assert result["averages"]["taste"] == 5
    assert result["portions"]["vegetable_portion"] == {"too_small": 3}
    assert client.put(f"{path}/meal-feedback", headers=hope_headers, json={"consent": False}).status_code == 200
    assert client.get(summary_path, headers=donor_headers).json()["data"]["averages"] == {}
    handoff = db_session.scalar(select(Handoff).join(Rescue).where(Rescue.display_id == rescue["display_id"]))
    handoff.delivered_at = None
    db_session.commit()
    assert client.get(f"{API}/impact/summary", headers=donor_headers).status_code == 200
