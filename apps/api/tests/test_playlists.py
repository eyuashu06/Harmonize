"""Tests for playlists and favorites."""
from __future__ import annotations


def test_create_playlist(client, auth_headers):
    r = client.post(
        "/api/v1/playlists",
        json={"name": "Practice set", "description": "Daily warmup"},
        headers=auth_headers,
    )
    assert r.status_code == 201
    assert r.json()["name"] == "Practice set"


def test_create_duplicate_playlist_conflicts(client, auth_headers):
    body = {"name": "Practice set"}
    client.post("/api/v1/playlists", json=body, headers=auth_headers)
    r = client.post("/api/v1/playlists", json=body, headers=auth_headers)
    assert r.status_code == 409


def test_favorite_unfavorite(client, auth_headers):
    # create a song
    song = {
        "title": "Blackbird",
        "artist": "Beatles",
        "key": "G",
        "tempo_bpm": 96,
        "time_signature": "4/4",
        "lyrics": [{"line_index": 0, "text": "Blackbird singing in the dead of night", "chords": []}],
    }
    r = client.post("/api/v1/songs", json=song, headers=auth_headers)
    sid = r.json()["id"]

    # favorite
    r = client.post(f"/api/v1/favorites/{sid}", headers=auth_headers)
    assert r.status_code == 201

    # list
    r = client.get("/api/v1/favorites", headers=auth_headers)
    assert r.status_code == 200
    assert any(f["song_id"] == sid for f in r.json())

    # unfavorite
    r = client.delete(f"/api/v1/favorites/{sid}", headers=auth_headers)
    assert r.status_code == 204
