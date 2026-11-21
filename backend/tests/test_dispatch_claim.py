"""Offer dispatch (decline, timeout, no candidates) and atomic claim."""

import threading
import uuid
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.main import app
from app.models.enums import OfferStatus
from app.models.offer import MatchOffer
from app.models.organization import Organization
from app.services.dispatch_service import advance_expired_offers

API = "/api/v1"
HOPE = "Hope Community Kitchen"
CITYFOOD = "City Food Relief"


def _org_id(db: Session, name: str) -> uuid.UUID:
    return db.scalar(select(Organization.id).where(Organization.name == name))


def _pending(db: Session, rescue_id: uuid.UUID) -> list[MatchOffer]:
    return list(
        db.scalars(
            select(MatchOffer)
            .where(MatchOffer.rescue_id == rescue_id, MatchOffer.status == OfferStatus.PENDING.value)
            .execution_options(populate_existing=True)
        ).all()
    )


def test_create_leaves_exactly_one_pending_offer_to_hope(create_rescue, db_session: Session) -> None:
    data = create_rescue(uuid.uuid4().hex)
    rescue_id = uuid.UUID(data["id"])
    pending = _pending(db_session, rescue_id)
    assert len(pending) == 1
    assert pending[0].receiver_organization_id == _org_id(db_session, HOPE)


def test_decline_sends_next_offer(
    create_rescue, client: TestClient, hope_headers, db_session: Session
) -> None:
    data = create_rescue(uuid.uuid4().hex)
    rescue_id = uuid.UUID(data["id"])
    first = _pending(db_session, rescue_id)[0]

    resp = client.post(f"{API}/offers/{first.id}/decline", headers=hope_headers)
    assert resp.status_code == 200, resp.text

    pending = _pending(db_session, rescue_id)
    assert len(pending) == 1
    assert pending[0].receiver_organization_id == _org_id(db_session, CITYFOOD)
    declined = db_session.scalar(
        select(MatchOffer).where(MatchOffer.id == first.id).execution_options(populate_existing=True)
    )
    assert declined.status == OfferStatus.DECLINED.value


def test_timeout_sends_next_offer(create_rescue, db_session: Session) -> None:
    data = create_rescue(uuid.uuid4().hex)
    rescue_id = uuid.UUID(data["id"])
    assert _pending(db_session, rescue_id)[0].receiver_organization_id == _org_id(db_session, HOPE)

    advance_expired_offers(db_session, now=datetime.now(timezone.utc) + timedelta(minutes=10))
    db_session.commit()

    pending = _pending(db_session, rescue_id)
    assert len(pending) == 1
    assert pending[0].receiver_organization_id == _org_id(db_session, CITYFOOD)


def test_no_candidates_left_moves_rescue_to_matching(
    create_rescue, client: TestClient, donor_headers, hope_headers, cityfood_headers, db_session: Session
) -> None:
    data = create_rescue(uuid.uuid4().hex)
    rescue_id = uuid.UUID(data["id"])

    hope_offer = _pending(db_session, rescue_id)[0]
    assert client.post(f"{API}/offers/{hope_offer.id}/decline", headers=hope_headers).status_code == 200

    cityfood_offer = _pending(db_session, rescue_id)[0]
    assert client.post(f"{API}/offers/{cityfood_offer.id}/decline", headers=cityfood_headers).status_code == 200

    resp = client.get(f"{API}/rescues/{rescue_id}", headers=donor_headers)
    assert resp.status_code == 200, resp.text
    assert resp.json()["data"]["status"] == "MATCHING"


def test_claim_valid_offer_returns_200(
    create_rescue, client: TestClient, hope_headers, db_session: Session
) -> None:
    data = create_rescue(uuid.uuid4().hex)
    offer = _pending(db_session, uuid.UUID(data["id"]))[0]
    resp = client.post(f"{API}/offers/{offer.id}/claim", headers=hope_headers)
    assert resp.status_code == 200, resp.text
    assert resp.json()["data"]["status"] == "CLAIMED"


def test_claim_after_expiry_is_rejected(
    create_rescue, client: TestClient, hope_headers, db_session: Session
) -> None:
    data = create_rescue(uuid.uuid4().hex)
    offer = _pending(db_session, uuid.UUID(data["id"]))[0]

    advance_expired_offers(db_session, now=datetime.now(timezone.utc) + timedelta(minutes=10))
    db_session.commit()

    resp = client.post(f"{API}/offers/{offer.id}/claim", headers=hope_headers)
    assert resp.status_code == 409, resp.text
    assert resp.json()["error"]["code"] == "OFFER_EXPIRED"


def test_claim_by_unrelated_receiver_is_404(
    create_rescue, client: TestClient, cityfood_headers, db_session: Session
) -> None:
    data = create_rescue(uuid.uuid4().hex)
    hope_offer = _pending(db_session, uuid.UUID(data["id"]))[0]
    resp = client.post(f"{API}/offers/{hope_offer.id}/claim", headers=cityfood_headers)
    assert resp.status_code == 404, resp.text


def test_concurrent_claims_only_one_succeeds(
    create_rescue, hope_headers, db_session: Session
) -> None:
    data = create_rescue(uuid.uuid4().hex)
    offer = _pending(db_session, uuid.UUID(data["id"]))[0]
    offer_id = offer.id

    barrier = threading.Barrier(2)
    statuses: list[int] = []
    lock = threading.Lock()

    def _claim() -> None:
        local_client = TestClient(app)
        barrier.wait()
        resp = local_client.post(f"{API}/offers/{offer_id}/claim", headers=hope_headers)
        with lock:
            statuses.append(resp.status_code)

    threads = [threading.Thread(target=_claim) for _ in range(2)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join(timeout=60)

    assert len(statuses) == 2, statuses
    assert statuses.count(200) == 1, statuses
    # Every losing request gets 409 CLAIM_CONFLICT, including when SQLite reports a lock.
    assert all(code == 409 for code in statuses if code != 200), statuses
