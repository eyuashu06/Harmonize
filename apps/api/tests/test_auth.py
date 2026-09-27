"""Tests for auth flow."""
from __future__ import annotations

import uuid

import pytest

from app.core.security import create_access_token, decode_token


def test_jwt_roundtrip():
    sub = str(uuid.uuid4())
    token = create_access_token(subject=sub, claims={"role": "user"})
    payload = decode_token(token)
    assert payload["sub"] == sub
    assert payload["role"] == "user"


def test_jwt_invalid_token():
    from app.core.errors import AuthError

    with pytest.raises(AuthError):
        decode_token("not-a-real-token")


def test_protected_route_requires_token(client):
    r = client.get("/api/v1/users/me")
    assert r.status_code == 401


def test_get_me_returns_user(client, user, auth_headers):
    r = client.get("/api/v1/users/me", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["email"] == user.email


def test_update_me(client, auth_headers):
    r = client.patch(
        "/api/v1/users/me",
        json={"display_name": "Renamed", "skill_level": "advanced"},
        headers=auth_headers,
    )
    assert r.status_code == 200
    assert r.json()["display_name"] == "Renamed"


def test_inactive_user_forbidden(client, db, user):
    user.is_active = False
    db.add(user)
    db.commit()
    token = create_access_token(subject=str(user.id))
    r = client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 403
