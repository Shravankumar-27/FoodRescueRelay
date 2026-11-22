"""Query-count regression checks run against isolated synthetic fixtures."""
from contextlib import contextmanager
from time import perf_counter
import uuid
import pytest
from sqlalchemy import event, select
from app.db.session import engine
from app.models.organization import Organization
from app.models.rescue import Rescue
from app.models.receiver_capacity import ReceiverCapacity
from app.models.base_types import utcnow
from app.services.matching_service import load_candidates
from app.services.trust_service import compute_trust_scores


@contextmanager
def queries():
    statements = []
    def record(_conn, _cursor, statement, *_args):
        statements.append(statement)
    event.listen(engine, "before_cursor_execute", record)
    try:
        yield statements
    finally:
        event.remove(engine, "before_cursor_execute", record)


@pytest.fixture(params=[0, 40], ids=["seed-network", "larger-network"])
def network(db_session, request):
    donor = db_session.scalar(select(Organization).where(Organization.organization_type == "CATERER"))
    for index in range(request.param):
        org = Organization(id=uuid.uuid4(), name=f"Synthetic Kitchen {index}", organization_type="NGO",
            verification_status="VERIFIED", locality=donor.locality, latitude=donor.latitude,
            longitude=donor.longitude, reliability=.5)
        db_session.add(org)
        db_session.add(ReceiverCapacity(organization=org, available=True, max_servings=200, available_servings=200))
    db_session.commit()


def test_dashboard_query_budget(network, client, donor_headers, hope_headers, admin_headers):
    for path, headers, budget in [("/receivers/nearby",donor_headers,6),("/impact/leaderboard",donor_headers,8),
                          ("/contribution",donor_headers,3),("/partners/inbox",donor_headers,2),
                          ("/admin/organizations",admin_headers,6)]:
        started = perf_counter()
        with queries() as statements:
            response = client.get("/api/v1"+path,headers=headers)
        assert response.status_code == 200, response.text
        print(f"{path}: {len(statements)} SQL statements; {(perf_counter()-started)*1000:.1f} ms")
        assert len(statements) <= budget
    # Dispatch can write offers on its first pass; measure the steady polling read.
    client.get("/api/v1/offers/available", headers=hope_headers)
    with queries() as statements:
        response = client.get("/api/v1/offers/available", headers=hope_headers)
    assert response.status_code == 200
    print(f"offers steady read: {len(statements)} SQL statements")
    assert len(statements) <= 8


def test_matching_and_trust_query_budget(network, db_session):
    rescue = db_session.scalar(select(Rescue))
    with queries() as statements:
        candidates = load_candidates(db_session,rescue,utcnow())
    print(f"candidates: {len(candidates)} receivers; {len(statements)} SQL statements")
    assert len(statements) <= 3
    with queries() as statements:
        count = compute_trust_scores(db_session)
    print(f"trust refresh: {count} organizations; {len(statements)} SQL statements")
    assert len([s for s in statements if s.lstrip().upper().startswith("SELECT")]) <= 5
