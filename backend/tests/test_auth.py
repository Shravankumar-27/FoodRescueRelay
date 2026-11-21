"""Login and protected-route authentication."""

from fastapi.testclient import TestClient

API = "/api/v1"


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
