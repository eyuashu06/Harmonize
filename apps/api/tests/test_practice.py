"""Tests for practice sessions."""
from __future__ import annotations


def test_create_and_list_practice_session(client, auth_headers):
    payload = {
        "duration_seconds": 600,
        "sections_completed": ["verse", "chorus"],
        "average_tempo_bpm": 90.5,
        "pitch_accuracy": 0.85,
        "timing_accuracy": 0.78,
        "notes": "Good session, struggled on the bridge.",
    }
    r = client.post("/api/v1/practice/sessions", json=payload, headers=auth_headers)
    assert r.status_code == 201
    sid = r.json()["id"]

    r = client.get("/api/v1/practice/sessions", headers=auth_headers)
    assert r.status_code == 200
    assert any(s["id"] == sid for s in r.json())


def test_practice_stats(client, auth_headers):
    # create two sessions
    for secs in (300, 600):
        client.post(
            "/api/v1/practice/sessions",
            json={"duration_seconds": secs, "pitch_accuracy": 0.7, "timing_accuracy": 0.8},
            headers=auth_headers,
        )
    r = client.get("/api/v1/practice/stats", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["total_sessions"] == 2
    assert data["total_minutes"] >= 15
    assert data["average_pitch_accuracy"] is not None
