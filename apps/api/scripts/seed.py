"""Seed demo data so the app is immediately useful after `make up`."""
from __future__ import annotations

import uuid

from sqlalchemy import select

from app.core.logging import configure_logging, get_logger
from app.db.session import SessionLocal
from app.songs.models import Song
from app.songs.schemas import LyricLineIn, SectionIn, SongCreate
from app.songs.service import create_song
from app.users import models as user_models

log = get_logger(__name__)

DEMO_SONGS = [
    SongCreate(
        title="Wonderwall",
        artist="Oasis",
        key="F#m",
        mode="minor",
        tempo_bpm=87,
        time_signature="4/4",
        capo=2,
        difficulty="beginner",
        tags=["rock", "90s", "britpop"],
        sections=[
            SectionIn(name="Intro", type="intro", order_index=0, repeat=1),
            SectionIn(name="Verse 1", type="verse", order_index=1, repeat=1),
            SectionIn(name="Chorus", type="chorus", order_index=2, repeat=2),
            SectionIn(name="Bridge", type="bridge", order_index=3, repeat=1),
            SectionIn(name="Outro", type="outro", order_index=4, repeat=1),
        ],
        lyrics=[
            LyricLineIn(
                line_index=0,
                text="Today is gonna be the day",
                chords=[
                    {"chord": "Em7", "beat": 1.0},
                    {"chord": "G", "beat": 2.5},
                    {"chord": "Dsus4", "beat": 4.0},
                    {"chord": "A7sus4", "beat": 5.5},
                ],
            ),
            LyricLineIn(
                line_index=1,
                text="That they're gonna throw it back to you",
                chords=[
                    {"chord": "Em7", "beat": 1.0},
                    {"chord": "G", "beat": 3.0},
                    {"chord": "Dsus4", "beat": 5.0},
                    {"chord": "A7sus4", "beat": 7.0},
                ],
            ),
            LyricLineIn(
                line_index=2,
                text="By now you should've somehow",
                chords=[
                    {"chord": "F#m7", "beat": 1.0},
                    {"chord": "A", "beat": 2.5},
                    {"chord": "E", "beat": 4.0},
                    {"chord": "E6", "beat": 5.5},
                ],
            ),
            LyricLineIn(
                line_index=3,
                text="Realised what you gotta do",
                chords=[
                    {"chord": "F#m7", "beat": 1.0},
                    {"chord": "A", "beat": 3.0},
                    {"chord": "E", "beat": 5.0},
                    {"chord": "C#m", "beat": 7.0},
                ],
            ),
        ],
    ),
    SongCreate(
        title="Let It Be",
        artist="The Beatles",
        key="C",
        mode="major",
        tempo_bpm=72,
        time_signature="4/4",
        capo=0,
        difficulty="beginner",
        tags=["classic", "piano", "rock"],
        sections=[
            SectionIn(name="Verse 1", type="verse", order_index=0, repeat=1),
            SectionIn(name="Chorus", type="chorus", order_index=1, repeat=2),
            SectionIn(name="Verse 2", type="verse", order_index=2, repeat=1),
            SectionIn(name="Chorus", type="chorus", order_index=3, repeat=2),
        ],
        lyrics=[
            LyricLineIn(
                line_index=0,
                text="When I find myself in times of trouble",
                chords=[
                    {"chord": "C", "beat": 1.0},
                    {"chord": "G", "beat": 3.0},
                    {"chord": "Am", "beat": 5.0},
                    {"chord": "F", "beat": 7.0},
                ],
            ),
            LyricLineIn(
                line_index=1,
                text="Mother Mary comes to me",
                chords=[
                    {"chord": "C", "beat": 1.0},
                    {"chord": "G", "beat": 3.0},
                    {"chord": "F", "beat": 5.0},
                    {"chord": "C", "beat": 7.0},
                ],
            ),
            LyricLineIn(
                line_index=2,
                text="Speaking words of wisdom, let it be",
                chords=[
                    {"chord": "C", "beat": 1.0},
                    {"chord": "G", "beat": 3.0},
                    {"chord": "Am", "beat": 5.0},
                    {"chord": "F", "beat": 7.0},
                ],
            ),
            LyricLineIn(
                line_index=3,
                text="Let it be",
                chords=[
                    {"chord": "C", "beat": 1.0},
                    {"chord": "G", "beat": 3.0},
                    {"chord": "F", "beat": 5.0},
                    {"chord": "C", "beat": 7.0},
                ],
            ),
        ],
    ),
    SongCreate(
        title="Hotel California",
        artist="Eagles",
        key="Bm",
        mode="minor",
        tempo_bpm=75,
        time_signature="4/4",
        capo=0,
        difficulty="advanced",
        tags=["classic-rock", "guitar", "70s"],
        sections=[
            SectionIn(name="Intro", type="intro", order_index=0, repeat=1),
            SectionIn(name="Verse 1", type="verse", order_index=1, repeat=1),
            SectionIn(name="Chorus", type="chorus", order_index=2, repeat=2),
            SectionIn(name="Verse 2", type="verse", order_index=3, repeat=1),
            SectionIn(name="Solo", type="solo", order_index=4, repeat=1),
            SectionIn(name="Outro", type="outro", order_index=5, repeat=1),
        ],
        lyrics=[
            LyricLineIn(
                line_index=0,
                text="On a dark desert highway, cool wind in my hair",
                chords=[
                    {"chord": "Bm", "beat": 1.0},
                    {"chord": "F#", "beat": 3.0},
                    {"chord": "A", "beat": 5.0},
                    {"chord": "E", "beat": 7.0},
                ],
            ),
            LyricLineIn(
                line_index=1,
                text="Warm smell of colitas rising up through the air",
                chords=[
                    {"chord": "Bm", "beat": 1.0},
                    {"chord": "F#", "beat": 3.0},
                    {"chord": "A", "beat": 5.0},
                    {"chord": "E", "beat": 7.0},
                ],
            ),
            LyricLineIn(
                line_index=2,
                text="Welcome to the Hotel California",
                chords=[
                    {"chord": "G", "beat": 1.0},
                    {"chord": "D", "beat": 3.0},
                    {"chord": "Em", "beat": 5.0},
                    {"chord": "F#", "beat": 7.0},
                ],
            ),
        ],
    ),
]


def run() -> None:
    configure_logging()
    db = SessionLocal()
    try:
        # Skip if already seeded
        existing = db.scalar(select(Song).where(Song.title == "Wonderwall"))
        if existing is not None:
            log.info("seed_skip", reason="demo songs already present")
            return

        # Create or reuse a demo "library" user (no firebase uid)
        owner = db.scalar(select(user_models.User).where(user_models.User.email == "library@harmonyhub.local"))
        if owner is None:
            owner = user_models.User(
                id=uuid.uuid4(),
                email="library@harmonyhub.local",
                display_name="HarmonyHub Library",
                role="admin",
                is_active=True,
            )
            db.add(owner)
            db.commit()
            db.refresh(owner)

        for song in DEMO_SONGS:
            try:
                create_song(db, song, owner_id=owner.id)
                log.info("seeded_song", title=song.title)
            except Exception as e:  # noqa: BLE001
                log.warning("seed_song_failed", title=song.title, error=str(e))
        log.info("seed_done")
    finally:
        db.close()


if __name__ == "__main__":
    run()
