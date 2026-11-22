"""Coins follow actual outcomes; allocation drafts cannot create impact or leak."""
import uuid
import pytest

API = "/api/v1"


@pytest.fixture
def collected(client, create_rescue, donor_headers, hope_headers):
    rid = create_rescue(uuid.uuid4().hex)["id"]
    assert client.post(f"{API}/offers/open_{rid}/claim", headers=hope_headers).status_code == 200
    code = client.get(f"{API}/rescues/{rid}", headers=donor_headers).json()["data"]["pickup_code"]
    assert client.post(f"{API}/rescues/{rid}/collect", headers=hope_headers, json={"pickup_code":code,"collected_servings":140}).status_code == 200
    return rid


def balance(client, headers):
    return client.get(f"{API}/contribution", headers=headers).json()["data"]


def test_coins_only_confirmed_food_and_retries_dont_mint(collected, client, donor_headers, hope_headers, cityfood_headers):
    assert balance(client, donor_headers)["coins"] == balance(client, hope_headers)["coins"] == 0
    payload = {"delivered_servings":132,"rejected_servings":8}
    for _ in range(2):
        assert client.post(f"{API}/rescues/{collected}/deliver", headers=hope_headers, json=payload).status_code == 200
    for headers in [donor_headers,hope_headers]:
        data = balance(client,headers)
        assert data["coins"] == 1320
        assert data["medal"] == "Bronze heart"
        assert data["next_medal"]["remaining"] == 3680
        assert len(data["ledger"]) == 1
        assert data["ledger"][0]["coins"] == 1320
        assert data["weekly_streak"] == 1
    assert balance(client,cityfood_headers)["coins"] == 0
    board = client.get(f"{API}/impact/leaderboard",headers=donor_headers).json()["data"]
    assert board["donors"][0]["kindness_coins"] == 1320
    assert board["donors"][0]["contribution_medal"] == "Bronze heart"
    assert client.get(f"{API}/contribution").status_code == 401
    # Certificate issue/withdrawal changes reported feedback, never contribution coins.
    assert client.post(f"{API}/rescues/{collected}/recognition", headers=hope_headers,json={"consent_to_publish":True}).status_code == 200
    assert balance(client,donor_headers)["coins"] == 1320
    client.post(f"{API}/rescues/{collected}/recognition/withdraw",headers=hope_headers)
    assert balance(client,donor_headers)["coins"] == 1320


def test_all_rejected_food_has_no_coin_medal(collected, client, hope_headers):
    client.post(f"{API}/rescues/{collected}/deliver",headers=hope_headers,json={"delivered_servings":0,"rejected_servings":140})
    data=balance(client,hope_headers)
    assert data["coins"] == 0 and data["ledger"] == []
    assert not any(m["earned"] for m in data["milestones"])


def body(**changes):
    result={"revision":0,"handling_reviewed":True,"groups":[{"name":"Kitchen A","people":100,"servings":100,"dietary_notes":"Check dairy"}]}
    result.update(changes)
    return result


def test_private_plan_revision_capacity_and_no_impact(collected, client, hope_headers, donor_headers, cityfood_headers):
    url=f"{API}/receiver/planner/{collected}"
    assert client.get(url,headers=donor_headers).status_code == 403
    assert client.get(url,headers=cityfood_headers).status_code == 404
    assert client.put(url,headers=cityfood_headers,json=body()).status_code == 404
    first=client.put(url,headers=hope_headers,json=body()).json()["data"]
    assert first["revision"] == 1 and first["available_servings"] == 140
    assert client.get(url,headers=hope_headers).json()["data"]["groups"][0]["servings"] == 100
    assert client.put(url,headers=hope_headers,json=body()).status_code == 409
    assert balance(client,hope_headers)["coins"] == 0
    # A smaller final delivery makes the old draft visibly stale, never quietly valid.
    client.post(f"{API}/rescues/{collected}/deliver",headers=hope_headers,json={"delivered_servings":80,"rejected_servings":60})
    current=client.get(url,headers=hope_headers).json()["data"]
    assert current["available_servings"] == 80 and current["needs_revision"]
    assert client.put(url,headers=hope_headers,json=body(revision=1)).status_code == 422
    assert client.put(url,headers=hope_headers,json=body(revision=1,groups=[])).status_code == 200


@pytest.mark.parametrize("changes",[
    {"handling_reviewed":False},
    {"groups":[{"name":" ","people":1,"servings":1}]},
    {"groups":[{"name":"A","people":1,"servings":141}]},
    {"groups":[{"name":"A","people":1,"servings":1.5}]},
    {"groups":[{"name":"A","people":0,"servings":0}]},
    {"groups":[{"name":"A","people":True,"servings":0}]},
    {"groups":[{"name":"A","people":1,"servings":1},{"name":" a ","people":1,"servings":1}]},
])
def test_rejects_invalid_plan(collected,client,hope_headers,changes):
    assert client.put(f"{API}/receiver/planner/{collected}",headers=hope_headers,json=body(**changes)).status_code == 422


def test_cannot_plan_uncollected_food(client,create_rescue,hope_headers):
    rid=create_rescue(uuid.uuid4().hex)["id"]
    assert client.get(f"{API}/receiver/planner/{rid}",headers=hope_headers).status_code == 404
    assert client.get(f"{API}/receiver/planner",headers=hope_headers).json()["data"] == []
