"""Tests for the songs API."""
from __future__ import annotations

import pytest


def _make_song_payload():
    return {
        "title": "Wonderwall",
        "artist": "Oasis",
        "key": "F#m",
        "mode": "minor",
        "tempo_bpm": 87,
        "time_signature": "4/4",
        "capo": 2,
        "difficulty": "beginner",
        "tags": ["rock", "90s"],
        "sections": [
            {"name": "Intro", "type": "intro", "order_index": 0, "repeat": 1},
            {"name": "Verse 1", "type": "verse", "order_index": 1, "repeat": 1},
            {"name": "Chorus", "type": "chorus", "order_index": 2, "repeat": 2},
        ],
        "lyrics": [
            {
                "line_index": 0,
                "text": "Today is gonna be the day",
                "chords": [
                    {"chord": "Em7", "beat": 1.0},
                    {"chord": "G", "beat": 2.5},
                    {"chord": "Dsus4", "beat": 4.0},
                    {"chord": "A7sus4", "beat": 5.5},
                ],
            },
            {
                "line_index": 1,
                "text": "That they're gonna throw it back to you",
                "chords": [
                    {"chord": "Em7", "beat": 1.0},
                    {"chord": "G", "beat": 3.0},
                    {"chord": "Dsus4", "beat": 5.0},
                    {"chord": "A7sus4", "beat": 7.0},
                ],
            },
        ],
    }


@pytest.mark.usefixtures("client", "auth_headers")
class TestSongs:
    def test_create_song(self, client, auth_headers):
        r = client.post("/api/v1/songs", json=_make_song_payload(), headers=auth_headers)
        assert r.status_code == 201, r.text
        data = r.json()
        assert data["title"] == "Wonderwall"
        assert len(data["chords"]) > 0
        # Catalog should contain each unique chord symbol
        symbols = {c["symbol"] for c in data["chords"]}
        assert {"Em7", "G", "Dsus4", "A7sus4"}.issubset(symbols)

    def test_create_song_requires_auth(self, client):
        r = client.post("/api/v1/songs", json=_make_song_payload())
        assert r.status_code == 401

    def test_create_duplicate_returns_409(self, client, auth_headers):
        client.post("/api/v1/songs", json=_make_song_payload(), headers=auth_headers)
        r = client.post("/api/v1/songs", json=_make_song_payload(), headers=auth_headers)
        assert r.status_code == 409

    def test_get_song(self, client, auth_headers):
        r = client.post("/api/v1/songs", json=_make_song_payload(), headers=auth_headers)
        sid = r.json()["id"]
        r = client.get(f"/api/v1/songs/{sid}", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["lyrics"][0]["text"].startswith("Today")

    def test_search_songs(self, client, auth_headers):
        client.post("/api/v1/songs", json=_make_song_payload(), headers=auth_headers)
        r = client.get("/api/v1/songs", params={"q": "wonder"}, headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["total"] >= 1
        assert any(s["title"] == "Wonderwall" for s in data["items"])

    def test_transpose(self, client, auth_headers):
        r = client.post("/api/v1/songs", json=_make_song_payload(), headers=auth_headers)
        sid = r.json()["id"]
        r = client.post(
            f"/api/v1/songs/{sid}/transpose",
            json={"semitones": 2, "prefer_flats": False},
            headers=auth_headers,
        )
        assert r.status_code == 200
        data = r.json()
        assert data["new_key"] == "G#m"  # F#m up 2
        assert "F#m7" in data["transposed_chords"]  # Em7 up 2 = F#m7
