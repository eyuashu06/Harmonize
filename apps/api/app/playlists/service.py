"""Playlist & Favorite services."""
from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import ConflictError, ForbiddenError, NotFoundError
from app.playlists import models
from app.playlists.schemas import PlaylistCreate, PlaylistUpdate

# ----- Playlists -----


def create_playlist(db: Session, user_id: uuid.UUID, payload: PlaylistCreate) -> models.Playlist:
    exists = db.scalar(
        select(models.Playlist).where(
            models.Playlist.user_id == user_id, models.Playlist.name == payload.name
        )
    )
    if exists is not None:
        raise ConflictError("You already have a playlist with that name.")
    pl = models.Playlist(
        user_id=user_id,
        name=payload.name,
        description=payload.description,
        is_public=payload.is_public,
        song_ids=payload.song_ids,
    )
    db.add(pl)
    db.commit()
    db.refresh(pl)
    return pl


def list_user_playlists(db: Session, user_id: uuid.UUID) -> list[models.Playlist]:
    return list(
        db.scalars(
            select(models.Playlist)
            .where(models.Playlist.user_id == user_id)
            .order_by(models.Playlist.updated_at.desc())
        )
    )


def get_playlist(db: Session, user_id: uuid.UUID, playlist_id: uuid.UUID) -> models.Playlist:
    pl = db.get(models.Playlist, playlist_id)
    if pl is None:
        raise NotFoundError("Playlist not found.")
    if pl.user_id != user_id and not pl.is_public:
        raise ForbiddenError("You do not have access to this playlist.")
    return pl


def update_playlist(
    db: Session, user_id: uuid.UUID, playlist_id: uuid.UUID, payload: PlaylistUpdate
) -> models.Playlist:
    pl = get_playlist(db, user_id, playlist_id)
    if pl.user_id != user_id:
        raise ForbiddenError("Only the owner can edit this playlist.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(pl, field, value)
    db.add(pl)
    db.commit()
    db.refresh(pl)
    return pl


def delete_playlist(db: Session, user_id: uuid.UUID, playlist_id: uuid.UUID) -> None:
    pl = get_playlist(db, user_id, playlist_id)
    if pl.user_id != user_id:
        raise ForbiddenError("Only the owner can delete this playlist.")
    db.delete(pl)
    db.commit()


def add_song(db: Session, user_id: uuid.UUID, playlist_id: uuid.UUID, song_id: uuid.UUID) -> models.Playlist:
    pl = get_playlist(db, user_id, playlist_id)
    if pl.user_id != user_id:
        raise ForbiddenError("Only the owner can edit this playlist.")
    if song_id not in pl.song_ids:
        pl.song_ids = [*pl.song_ids, song_id]
        db.add(pl)
        db.commit()
        db.refresh(pl)
    return pl


def remove_song(db: Session, user_id: uuid.UUID, playlist_id: uuid.UUID, song_id: uuid.UUID) -> models.Playlist:
    pl = get_playlist(db, user_id, playlist_id)
    if pl.user_id != user_id:
        raise ForbiddenError("Only the owner can edit this playlist.")
    pl.song_ids = [s for s in pl.song_ids if s != song_id]
    db.add(pl)
    db.commit()
    db.refresh(pl)
    return pl


# ----- Favorites -----


def add_favorite(db: Session, user_id: uuid.UUID, song_id: uuid.UUID) -> models.Favorite:
    exists = db.scalar(
        select(models.Favorite).where(
            models.Favorite.user_id == user_id, models.Favorite.song_id == song_id
        )
    )
    if exists is not None:
        return exists
    fav = models.Favorite(user_id=user_id, song_id=song_id)
    db.add(fav)
    db.commit()
    db.refresh(fav)
    return fav


def remove_favorite(db: Session, user_id: uuid.UUID, song_id: uuid.UUID) -> None:
    fav = db.scalar(
        select(models.Favorite).where(
            models.Favorite.user_id == user_id, models.Favorite.song_id == song_id
        )
    )
    if fav is None:
        return
    db.delete(fav)
    db.commit()


def list_favorites(db: Session, user_id: uuid.UUID) -> list[models.Favorite]:
    return list(
        db.scalars(
            select(models.Favorite)
            .where(models.Favorite.user_id == user_id)
            .order_by(models.Favorite.created_at.desc())
        )
    )
