"""Song service: business logic for create, read, search, transpose, dedupe."""
from __future__ import annotations

import uuid
from collections.abc import Sequence

from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.errors import ConflictError, NotFoundError
from app.songs import models
from app.songs.schemas import SongCreate, SongUpdate
from app.songs.theory import (
    get_guitar_fingering,
    parse_chord,
    piano_notes,
    suggest_capo,
    transpose_key,
    transpose_symbol,
)


def create_song(db: Session, payload: SongCreate, *, owner_id: uuid.UUID | None = None) -> models.Song:
    existing = db.scalar(
        select(models.Song).where(
            models.Song.title == payload.title, models.Song.artist == payload.artist
        )
    )
    if existing is not None:
        raise ConflictError("Song with this title and artist already exists.")

    song = models.Song(
        title=payload.title,
        artist=payload.artist,
        album=payload.album,
        duration_seconds=payload.duration_seconds,
        key=payload.key,
        mode=payload.mode,
        tempo_bpm=payload.tempo_bpm,
        time_signature=payload.time_signature,
        capo=payload.capo,
        tuning=payload.tuning,
        difficulty=payload.difficulty,
        language=payload.language,
        tags=payload.tags,
        owner_id=owner_id,
    )
    db.add(song)
    db.flush()  # populate song.id

    for s in payload.sections:
        db.add(models.Section(song_id=song.id, **s.model_dump()))
    for line in payload.lyrics:
        db.add(models.LyricLine(song_id=song.id, **line.model_dump()))

    # Build chord catalog from all chord events in the lyrics.
    seen: set[str] = set()
    for line in payload.lyrics:
        for ev in line.chords:
            symbol = ev["chord"]
            if symbol in seen:
                continue
            seen.add(symbol)
            _add_chord(db, song.id, symbol)

    db.commit()
    db.refresh(song)
    return _reload(db, song.id)


def update_song(db: Session, song_id: uuid.UUID, payload: SongUpdate) -> models.Song:
    song = db.get(models.Song, song_id)
    if song is None:
        raise NotFoundError("Song not found.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(song, field, value)
    db.add(song)
    db.commit()
    db.refresh(song)
    return _reload(db, song.id)


def get_song(db: Session, song_id: uuid.UUID) -> models.Song:
    song = db.scalar(
        select(models.Song).where(models.Song.id == song_id).options(
            selectinload(models.Song.sections),
            selectinload(models.Song.lyrics),
            selectinload(models.Song.chords),
        )
    )
    if song is None:
        raise NotFoundError("Song not found.")
    return song


def search_songs(
    db: Session,
    *,
    query: str | None = None,
    tags: Sequence[str] | None = None,
    difficulty: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[models.Song], int]:
    stmt = select(models.Song).where(models.Song.is_public.is_(True))
    if query:
        like = f"%{query}%"
        stmt = stmt.where(
            or_(
                models.Song.title.ilike(like),
                models.Song.artist.ilike(like),
                models.Song.album.ilike(like),
            )
        )
    if tags:
        stmt = stmt.where(_tags_match(tags, db.get_bind().dialect.name))
    if difficulty:
        stmt = stmt.where(models.Song.difficulty == difficulty)

    total = len(db.scalars(stmt).all())
    rows = db.scalars(stmt.order_by(models.Song.title).limit(limit).offset(offset)).all()
    return list(rows), total


def delete_song(db: Session, song_id: uuid.UUID) -> None:
    song = db.get(models.Song, song_id)
    if song is None:
        raise NotFoundError("Song not found.")
    db.delete(song)
    db.commit()


def transpose_song(
    db: Session,
    song_id: uuid.UUID,
    *,
    semitones: int,
    prefer_flats: bool = False,
) -> dict:
    song = get_song(db, song_id)
    new_key = transpose_key(song.key or "C", semitones, prefer_flats=prefer_flats) if song.key else None
    capo = suggest_capo(song.key or "C", "C") if song.key else None
    # Collect unique chords from lyrics for the result preview.
    seen: set[str] = set()
    unique: list[str] = []
    for line in song.lyrics:
        for ev in line.chords:
            sym = ev.get("chord", "")
            if sym and sym not in seen:
                seen.add(sym)
                unique.append(sym)
    return {
        "original_key": song.key,
        "new_key": new_key,
        "suggested_capo": capo,
        "semitones": semitones,
        "transposed_chords": [transpose_symbol(c, semitones, prefer_flats=prefer_flats) for c in unique],
    }


# ----- helpers -----


def _tags_match(tags: Sequence[str], dialect_name: str):
    """Build a filter matching songs carrying any of ``tags``.

    PostgreSQL stores ``songs.tags`` as ``varchar[]`` and supports the array
    overlap operator. SQLite stores JSON text, where ``&&`` is not valid SQL, so
    fall back to matching whole quoted elements.
    """
    if dialect_name == "postgresql":
        return models.Song.tags.op("&&")(list(tags))
    return or_(*[models.Song.tags.like(f'%"{t}"%') for t in tags])


def _add_chord(db: Session, song_id: uuid.UUID, symbol: str) -> models.Chord:
    parsed = parse_chord(symbol)
    fingering = get_guitar_fingering(symbol)
    if fingering:
        base_fret, frets = fingering
    else:
        base_fret, frets = 1, [0, 0, 0, 0, 0, 0]
    chord = models.Chord(
        song_id=song_id,
        symbol=symbol,
        root=parsed.root,
        quality=parsed.quality,
        guitar_frets=frets,
        guitar_fingers=[],
        guitar_base_fret=base_fret,
        piano_notes=[
            {"midi": n, "hand": "left" if n < 60 else "right"} for n in piano_notes(symbol)
        ],
    )
    db.add(chord)
    return chord


def _reload(db: Session, song_id: uuid.UUID) -> models.Song:
    return get_song(db, song_id)
