from uuid import uuid4

from sqlalchemy import func, select

from app.models import DonationRecognition, Handoff, ImpactRecord, MealFeedback, Rescue
from app.seed.seed_extended import seed_extended

API = "/api/v1"


def test_seed_upgrades_labels_without_breaking_rescue_links(db_session):
    from app.models import AllocationNotice, Organization, PartnerMessage
    from app.seed.init_db import seed_demo
    rescue = db_session.scalar(select(Rescue))
    rescue_id = rescue.id
    rescue.display_id = "RR-U7QFRM"
    rescue.handling_notes = "Synthetic QA listing. Keep refrigerated."
    receiver = db_session.scalar(select(Organization).where(Organization.name == "Hope Community Kitchen"))
    message = PartnerMessage(sender_org_id=rescue.donor_organization_id, recipient_org_id=receiver.id,
                             message="Split proposal for RR-U7QFRM · 10 servings")
    db_session.add(message)
    db_session.flush()
    db_session.add(AllocationNotice(message_id=message.id, rescue_id=rescue.id, items=[]))
    db_session.flush()
    seed_demo(db_session)
    db_session.flush()
    assert rescue.id == rescue_id
    assert rescue.display_id.removeprefix("RR-").isdigit()
    assert rescue.handling_notes == "Keep refrigerated."
    assert message.message == f"Split proposal for {rescue.display_id} · 10 servings"
    upgraded = rescue.display_id
    seed_demo(db_session)
    assert rescue.display_id == upgraded


def test_demo_seed_creates_ranked_deliveries_and_appreciation_without_duplicates(client, donor_headers, db_session):
    seed_extended(db_session)
    db_session.commit()
    models = (Rescue, ImpactRecord, Handoff, DonationRecognition, MealFeedback)
    counts = [db_session.scalar(select(func.count()).select_from(model)) for model in models]
    assert counts == [83, 71, 72, 71, 31]
    seed_extended(db_session)
    db_session.commit()
    assert [db_session.scalar(select(func.count()).select_from(model)) for model in models] == counts
    rankings = client.get(f"{API}/impact/leaderboard", headers=donor_headers).json()["data"]
    for group in ("donors", "receivers"):
        assert rankings[group][0]["meals"] > 0
        assert rankings[group][0]["kindness_coins"] == rankings[group][0]["meals"] * 10
    donors_by_locality = {}
    for donor in rankings["donors"]:
        donors_by_locality.setdefault(donor["locality"], []).append(donor)
    assert len(donors_by_locality) == 8
    assert all(len(donors) >= 2 for donors in donors_by_locality.values())
    feedback = client.get(f"{API}/impact/meal-insights", headers=donor_headers).json()["data"]
    assert feedback["responses"] >= 3 and feedback["averages"]["taste"] > 0


def test_favorite_partners_are_private_and_persistent(client, donor_headers, hope_headers, cityfood_headers):
    me = client.get(f"{API}/auth/me", headers=donor_headers).json()["data"]
    donor_id = me["organization"]["id"]
    receivers = client.get(f"{API}/receivers/nearby", headers=donor_headers).json()["data"]
    hope_id = next(receiver["id"] for receiver in receivers if receiver["name"] == "Hope Community Kitchen")
    for user, target in ((donor_headers, hope_id), (hope_headers, donor_id)):
        path = f"{API}/partners/{target}/favorite"
        for _ in range(2):
            response = client.put(path, headers=user, json={"favorite": True})
            assert response.status_code == 200, response.text
        saved = client.get(f"{API}/partners/favorites", headers=user).json()["data"]
        assert [partner["id"] for partner in saved] == [target]
        assert client.put(path, headers=user, json={"favorite": False}).status_code == 200
        assert client.get(f"{API}/partners/favorites", headers=user).json()["data"] == []
    assert client.put(f"{API}/partners/{hope_id}/favorite", headers=cityfood_headers, json={"favorite": True}).status_code == 404


def test_confirmed_providers_clear_collection_block_and_delivery_returns_finished_timeline(
    client, create_rescue, donor_headers, hope_headers, admin_headers,
):
    capacity = client.get(f"{API}/receivers/capacity", headers=hope_headers).json()["data"]
    capacity.update(transport_available=False, containers_available=False)
    assert client.put(f"{API}/receivers/capacity", headers=hope_headers, json=capacity).status_code == 200
    ids = {}
    for resource in ("containers", "transport"):
        data = {"name": f"Test {resource}", "contact": "dispatch@example.test", "resource": resource,
                "service_area": "Hyderabad", "max_servings": 200}
        response = client.post(f"{API}/admin/logistics/providers", headers=admin_headers, json=data)
        assert response.status_code == 200, response.text
        ids[resource] = response.json()["data"]["id"]
    rescue = create_rescue(uuid4().hex, packaging_available=False)
    path = f"{API}/rescues/{rescue['id']}"
    claim = client.post(f"{API}/offers/open_{rescue['id']}/claim", headers=hope_headers)
    assert claim.status_code == 200, claim.text
    offer = claim.json()["data"]["offer_id"]
    code = client.get(path, headers=donor_headers).json()["data"]["pickup_code"]
    collect = {"pickup_code": code, "collected_servings": 140}
    assert client.post(f"{path}/collect", headers=hope_headers, json=collect).json()["error"]["code"] == "LOGISTICS_PENDING"
    logistics = client.get(f"{path}/logistics", headers=hope_headers).json()["data"]
    assert {provider["id"] for provider in logistics["providers"]} == set(ids.values())
    for provider_id in ids.values():
        result = client.put(f"{path}/logistics/provider", headers=hope_headers,
                            json={"offer_id": offer, "provider_id": provider_id})
        assert result.status_code == 200, result.text
    assert all(not resource["needs_help"] for resource in result.json()["data"]["resources"].values())
    assert client.post(f"{path}/collect", headers=hope_headers, json=collect).status_code == 200
    delivered = client.post(f"{path}/deliver", headers=hope_headers, json={"delivered_servings": 135, "rejected_servings": 5})
    assert delivered.status_code == 200, delivered.text
    detail = delivered.json()["data"]["rescue"]
    assert detail["status"] == "DELIVERED"
    assert detail["impact"]["delivered_servings"] == 135
    assert detail["status_events"][-1]["to_status"] == "DELIVERED"
    assert client.get(path, headers=donor_headers).json()["data"]["status"] == "DELIVERED"
