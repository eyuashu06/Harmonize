"""Song routes."""
from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.auth import CurrentUser
from app.db import get_db
from app.songs import service
from app.songs.schemas import (
    SongCreate,
    SongOut,
    SongSearchResponse,
    SongUpdate,
    TransposeRequest,
    TransposeResponse,
)

router = APIRouter(prefix="/songs", tags=["songs"])


@router.get("", response_model=SongSearchResponse, summary="Search songs")
def search(
    db: Annotated[Session, Depends(get_db)],
    q: str | None = Query(default=None, description="Title / artist / album substring"),
    tag: list[str] | None = Query(default=None),
    difficulty: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> SongSearchResponse:
    items, total = service.search_songs(
        db, query=q, tags=tag, difficulty=difficulty, limit=limit, offset=offset
    )
    return SongSearchResponse(
        items=[_summary(s) for s in items], total=total, query=q or ""
    )


@router.get("/{song_id}", response_model=SongOut, summary="Get a song with all sections, lyrics, chords")
def retrieve(
    song_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
) -> SongOut:
    song = service.get_song(db, song_id)
    return _to_out(song)


@router.post("", response_model=SongOut, status_code=status.HTTP_201_CREATED, summary="Create a song")
def create(
    payload: SongCreate,
    db: Annotated[Session, Depends(get_db)],
    user: CurrentUser,
) -> SongOut:
    song = service.create_song(db, payload, owner_id=user.id)
    return _to_out(song)


@router.patch("/{song_id}", response_model=SongOut, summary="Update a song")
def update(
    song_id: uuid.UUID,
    payload: SongUpdate,
    db: Annotated[Session, Depends(get_db)],
    user: CurrentUser,
) -> SongOut:
    song = service.update_song(db, song_id, payload)
    return _to_out(song)


@router.delete("/{song_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a song")
def delete(
    song_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    user: CurrentUser,
) -> None:
    service.delete_song(db, song_id)


@router.post(
    "/{song_id}/transpose",
    response_model=TransposeResponse,
    summary="Transpose a song into a new key",
)
def transpose(
    song_id: uuid.UUID,
    payload: TransposeRequest,
    db: Annotated[Session, Depends(get_db)],
) -> TransposeResponse:
    data = service.transpose_song(
        db, song_id, semitones=payload.semitones, prefer_flats=payload.prefer_flats
    )
    return TransposeResponse(**data)


# ----- mappers -----


def _summary(s) -> dict:
    return {
        "id": s.id,
        "title": s.title,
        "artist": s.artist,
        "album": s.album,
        "duration_seconds": s.duration_seconds,
        "key": s.key,
        "mode": s.mode,
        "tempo_bpm": s.tempo_bpm,
        "time_signature": s.time_signature,
        "difficulty": s.difficulty,
        "tags": s.tags,
    }


def _to_out(s) -> SongOut:
    return SongOut(
        id=s.id,
        title=s.title,
        artist=s.artist,
        album=s.album,
        duration_seconds=s.duration_seconds,
        key=s.key,
        mode=s.mode,
        tempo_bpm=s.tempo_bpm,
        time_signature=s.time_signature,
        capo=s.capo,
        tuning=s.tuning,
        difficulty=s.difficulty,
        language=s.language,
        is_public=s.is_public,
        tags=s.tags,
        sections=[  # type: ignore[list-item]
            {
                "id": sec.id,
                "name": sec.name,
                "type": sec.type,
                "order_index": sec.order_index,
                "start_seconds": sec.start_seconds,
                "end_seconds": sec.end_seconds,
                "repeat": sec.repeat,
            }
            for sec in s.sections
        ],
        lyrics=[
            {
                "id": ln.id,
                "line_index": ln.line_index,
                "text": ln.text,
                "chords": ln.chords,
                "start_seconds": ln.start_seconds,
                "end_seconds": ln.end_seconds,
            }
            for ln in s.lyrics
        ],
        chords=[
            {
                "id": c.id,
                "symbol": c.symbol,
                "root": c.root,
                "quality": c.quality,
                "guitar_frets": c.guitar_frets,
                "guitar_fingers": c.guitar_fingers,
                "guitar_base_fret": c.guitar_base_fret,
                "piano_notes": c.piano_notes,
            }
            for c in s.chords
        ],
        created_at=s.created_at,
        updated_at=s.updated_at,
    )
