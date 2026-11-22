"""Signup, login, and protected-route authentication."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Organization, User

API = "/api/v1"

SIGNUP = {
    "name": "  Priya Rao  ",
    "email": "Priya@example.com",
    "password": "a-private-passphrase",
    "organization_name": "  New Food Partner  ",
    "organization_type": "NGO",
    "locality": "Madhapur",
    "street_address": "  Plot 12, Silicon Valley Road  ",
}


def test_signup_lists_supported_neighborhoods(client: TestClient) -> None:
    response = client.get(f"{API}/auth/signup/localities")
    assert response.status_code == 200
    assert "Madhapur" in response.json()["data"]


@pytest.mark.parametrize(("organization_type", "role"), [("CATERER", "DONOR"), ("NGO", "RECEIVER")])
def test_signup_creates_pending_partner_and_session(
    client: TestClient, db_session: Session, organization_type: str, role: str
) -> None:
    resp = client.post(f"{API}/auth/signup", json={**SIGNUP, "organization_type": organization_type})
    assert resp.status_code == 201, resp.text
    data = resp.json()["data"]
    assert data["user"]["email"] == "priya@example.com"
    assert data["user"]["name"] == "Priya Rao"
    assert data["user"]["role"] == role
    assert data["organization"]["name"] == "New Food Partner"
    assert data["organization"]["organization_type"] == organization_type
    assert data["organization"]["verification_status"] == "PENDING"
    assert "private_address" not in data["organization"]

    organization = db_session.scalar(select(Organization).where(Organization.name == "New Food Partner"))
    assert organization is not None
    assert organization.locality == "Madhapur, Hyderabad"
    assert organization.private_address == "Plot 12, Silicon Valley Road, Madhapur, Hyderabad"
    assert (organization.latitude, organization.longitude) == (17.4483, 78.3915)

    headers = {"Authorization": f"Bearer {data['token']}"}
    assert client.get(f"{API}/auth/me", headers=headers).json()["data"]["user"] == data["user"]
    login_response = client.post(f"{API}/auth/login", json={"email": SIGNUP["email"], "password": SIGNUP["password"]})
    assert login_response.status_code == 200
    assert login_response.json()["data"]["user"]["id"] == data["user"]["id"]


def test_duplicate_signup_does_not_create_another_organization(client: TestClient, db_session: Session) -> None:
    assert client.post(f"{API}/auth/signup", json=SIGNUP).status_code == 201
    count = db_session.scalar(select(func.count()).select_from(Organization))
    response = client.post(f"{API}/auth/signup", json={**SIGNUP, "email": SIGNUP["email"].lower()})
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "EMAIL_IN_USE"
    assert db_session.scalar(select(func.count()).select_from(Organization)) == count


@pytest.mark.parametrize(
    "invalid_fields",
    [{"organization_type": "ADMIN"}, {"password": "🌱" * 19}, {"locality": "Unknown"}, {"street_address": "  "}],
)
def test_signup_rejects_invalid_accounts(client: TestClient, db_session: Session, invalid_fields: dict) -> None:
    response = client.post(f"{API}/auth/signup", json={**SIGNUP, **invalid_fields})
    assert response.status_code == 422
    assert db_session.scalar(select(User.id).where(User.email == SIGNUP["email"].lower())) is None


def test_valid_login_returns_token_and_role(client: TestClient) -> None:
    resp = client.post(
        f"{API}/auth/login",
        json={"email": "donor@rescuerelay.demo", "password": "demo123"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["success"] is True
    assert body["data"]["token"]
    assert body["data"]["user"]["role"] == "DONOR"


def test_invalid_password_returns_401(client: TestClient) -> None:
    resp = client.post(
        f"{API}/auth/login",
        json={"email": "donor@rescuerelay.demo", "password": "wrong-password"},
    )
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "INVALID_CREDENTIALS"


def test_me_without_token_returns_401(client: TestClient) -> None:
    resp = client.get(f"{API}/auth/me")
    assert resp.status_code == 401


def test_me_with_token_returns_200(client: TestClient, donor_headers: dict[str, str]) -> None:
    resp = client.get(f"{API}/auth/me", headers=donor_headers)
    assert resp.status_code == 200, resp.text
    assert resp.json()["data"]["user"]["email"] == "donor@rescuerelay.demo"
