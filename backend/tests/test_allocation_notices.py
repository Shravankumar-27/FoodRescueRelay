from uuid import uuid4

API = "/api/v1"


def test_selected_allocation_proposals_notify_only_their_receivers(
    client, create_rescue, donor_headers, hope_headers, cityfood_headers, shelter_headers,
):
    rescue = create_rescue(uuid4().hex)
    path = f"{API}/rescues/{rescue['id']}/allocation-puzzle"
    puzzle = client.get(path, headers=donor_headers).json()["data"]
    rice, dal = (next(item for item in puzzle["items"] if item["name"] == name) for name in ("Veg Biryani", "Dal"))
    receivers = {receiver["name"]: receiver["id"] for receiver in puzzle["receivers"]}
    hope = {"receiver_id": receivers["Hope Community Kitchen"], "items": [{"item_id": rice["id"], "servings": 60}]}
    city = {"receiver_id": receivers["City Food Relief"], "items": [{"item_id": rice["id"], "servings": 40}]}
    bad = {**city, "items": [{"item_id": rice["id"], "servings": 41}]}
    assert client.post(f"{path}/notify", headers=hope_headers, json={"proposals": [hope]}).status_code == 403
    assert client.post(f"{path}/notify", headers=donor_headers, json={"proposals": [hope, bad]}).status_code == 422
    assert client.get(f"{API}/partners/inbox", headers=hope_headers).json()["data"] == []

    for expected in (2, 0):
        response = client.post(f"{path}/notify", headers=donor_headers, json={"proposals": [hope, city]})
        assert response.status_code == 200, response.text
        assert response.json()["data"]["sent"] == expected
    assert client.get(f"{API}/partners/inbox", headers=shelter_headers).json()["data"] == []
    inbox = client.get(f"{API}/partners/inbox", headers=hope_headers).json()["data"]
    assert inbox[0]["unread"] == 1
    conversation_path = f"{API}/partners/{inbox[0]['partner_id']}/chat"
    messages = client.get(conversation_path, headers=hope_headers).json()["data"]["messages"]
    proposal = messages[0]["allocation_proposal"]
    assert proposal["items"] == [{**rice, "servings": 60}]
    assert proposal["pickup_by"] == rescue["pickup_by"]
    assert proposal["status"] == "open"
    assert "private_address" not in proposal
    notified = client.get(path, headers=donor_headers).json()["data"]["notices"]
    assert next(notice for notice in notified if notice["receiver_id"] == hope["receiver_id"])["read_at"]
    assert not next(notice for notice in notified if notice["receiver_id"] == city["receiver_id"])["read_at"]
    assert client.get(f"{API}/partners/inbox", headers=cityfood_headers).json()["data"][0]["unread"] == 1

    updated = {**hope, "items": [{"item_id": dal["id"], "servings": 20}]}
    assert client.post(f"{path}/notify", headers=donor_headers, json={"proposals": [updated]}).status_code == 200
    messages = client.get(conversation_path, headers=hope_headers).json()["data"]["messages"]
    assert [message["allocation_proposal"]["status"] for message in messages] == ["superseded", "open"]
    assert client.post(f"{API}/rescues/{rescue['id']}/cancel", headers=donor_headers, json={"reason": "Pickup cancelled"}).status_code == 200
    assert client.post(f"{path}/notify", headers=donor_headers, json={"proposals": [hope]}).status_code == 409
    messages = client.get(conversation_path, headers=hope_headers).json()["data"]["messages"]
    assert messages[-1]["allocation_proposal"]["status"] == "closed"


def test_notification_validates_live_capacity_without_sending_partial_batch(
    client, create_rescue, donor_headers, hope_headers, cityfood_headers,
):
    rescue = create_rescue(uuid4().hex)
    path = f"{API}/rescues/{rescue['id']}/allocation-puzzle"
    puzzle = client.get(path, headers=donor_headers).json()["data"]
    item = next(item for item in puzzle["items"] if item["servings"] == 100)
    ids = {row["name"]: row["id"] for row in puzzle["receivers"]}
    capacity = client.get(f"{API}/receivers/capacity", headers=hope_headers).json()["data"]
    capacity["volunteer_servings"] = 10
    assert client.put(f"{API}/receivers/capacity", headers=hope_headers, json=capacity).status_code == 200
    proposals = [
        {"receiver_id": ids[name], "items": [{"item_id": item["id"], "servings": 20}]}
        for name in ("City Food Relief", "Hope Community Kitchen")
    ]
    response = client.post(f"{path}/notify", headers=donor_headers, json={"proposals": proposals})
    assert response.status_code == 409, response.text
    assert client.get(f"{API}/partners/inbox", headers=cityfood_headers).json()["data"] == []
