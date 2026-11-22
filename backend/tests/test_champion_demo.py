from types import SimpleNamespace

import pytest
from sqlalchemy import func, select

from app.models import ImpactRecord, Rescue
from app.seed.seed_champions import seed_champions


def test_champions_derive_medals_from_deliveries_without_duplicate_credit(client, db_session, donor_headers, hope_headers):
    assert seed_champions(db_session) == 40
    db_session.commit()
    assert seed_champions(db_session) == 0
    db_session.commit()
    for headers in (donor_headers, hope_headers):
        response = client.get("/api/v1/contribution", headers=headers)
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["medal"] == "Community champion"
        assert data["next_medal"] is None
        assert data["coins"] == 56000
        assert data["impact"]["total_meals_rescued"] == 5600
        assert data["impact"]["reported_people_served"] == 0
        assert all(m["earned"] for m in data["milestones"])
    assert db_session.scalar(select(func.sum(ImpactRecord.delivered_servings))) == 5600
    assert db_session.scalar(select(func.count(Rescue.id)).where(Rescue.status == "DELIVERED")) == 40


def test_champion_seed_refuses_non_demo_databases(db_session, monkeypatch):
    monkeypatch.setattr("app.seed.seed_champions.get_settings", lambda: SimpleNamespace(DEMO_MODE=False))
    with pytest.raises(ValueError, match="only in demo mode"):
        seed_champions(db_session)
    assert db_session.scalar(select(func.count(ImpactRecord.id))) == 0
