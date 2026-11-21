"""Hero flow: donor posts, receiver claims, collects with the pickup code, delivers, impact shows."""

import uuid

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.enums import OfferStatus
from app.models.offer import MatchOffer

API = "/api/v1"


def test_hero_flow_post_claim_collect_deliver(
    create_rescue, client: TestClient, donor_headers, hope_headers, db_session: Session
) -> None:
    # 1. Donor posts a rescue; dispatch leaves one pending offer for Hope.
    data = create_rescue(uuid.uuid4().hex)
    rescue_id = uuid.UUID(data["id"])
    offer = db_session.scalar(
        select(MatchOffer)
        .where(MatchOffer.rescue_id == rescue_id, MatchOffer.status == OfferStatus.PENDING.value)
        .execution_options(populate_existing=True)
    )
    assert offer is not None

    # 2. Receiver claims the offer.
    claim = client.post(f"{API}/offers/{offer.id}/claim", headers=hope_headers)
    assert claim.status_code == 200, claim.text

    # 3. Donor reads the pickup code (only the owning donor can see it).
    detail = client.get(f"{API}/rescues/{rescue_id}", headers=donor_headers)
    assert detail.status_code == 200, detail.text
    code = detail.json()["data"]["pickup_code"]
    assert code and len(code) == 4

    # 4. Receiver collects the full surplus with the code.
    collect = client.post(
        f"{API}/rescues/{rescue_id}/collect",
        json={"pickup_code": code, "collected_servings": 140},
        headers=hope_headers,
    )
    assert collect.status_code == 200, collect.text
    assert collect.json()["data"]["status"] == "COLLECTED"

    # 5. Receiver records delivery: 132 delivered, 8 rejected.
    deliver = client.post(
        f"{API}/rescues/{rescue_id}/deliver",
        json={"delivered_servings": 132, "rejected_servings": 8},
        headers=hope_headers,
    )
    assert deliver.status_code == 200, deliver.text

    # 6. Donor sees the delivered status and the impact numbers.
    final = client.get(f"{API}/rescues/{rescue_id}", headers=donor_headers)
    assert final.status_code == 200, final.text
    body = final.json()["data"]
    assert body["status"] == "DELIVERED"
    assert body["impact"] is not None
    assert body["impact"]["delivered_servings"] == 132
