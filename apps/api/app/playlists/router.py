"""Playlist & Favorite routes."""
from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.auth import CurrentUser
from app.db import get_db
from app.playlists import service
from app.playlists.schemas import (
    FavoriteOut,
    PlaylistCreate,
    PlaylistOut,
    PlaylistUpdate,
)

router = APIRouter(tags=["playlists"])

# Playlists
pl_router = APIRouter(prefix="/playlists", tags=["playlists"])


@pl_router.get("", response_model=list[PlaylistOut], summary="List the current user's playlists")
def list_playlists(db: Annotated[Session, Depends(get_db)], user: CurrentUser) -> list[PlaylistOut]:
    return [PlaylistOut.model_validate(p) for p in service.list_user_playlists(db, user.id)]


@pl_router.post("", response_model=PlaylistOut, status_code=status.HTTP_201_CREATED, summary="Create a playlist")
def create_playlist(
    payload: PlaylistCreate,
    db: Annotated[Session, Depends(get_db)],
    user: CurrentUser,
) -> PlaylistOut:
    pl = service.create_playlist(db, user.id, payload)
    return PlaylistOut.model_validate(pl)


@pl_router.get("/{playlist_id}", response_model=PlaylistOut, summary="Get a playlist")
def get_playlist(
    playlist_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    user: CurrentUser,
) -> PlaylistOut:
    pl = service.get_playlist(db, user.id, playlist_id)
    return PlaylistOut.model_validate(pl)


@pl_router.patch("/{playlist_id}", response_model=PlaylistOut, summary="Update a playlist")
def update_playlist(
    playlist_id: uuid.UUID,
    payload: PlaylistUpdate,
    db: Annotated[Session, Depends(get_db)],
    user: CurrentUser,
) -> PlaylistOut:
    pl = service.update_playlist(db, user.id, playlist_id, payload)
    return PlaylistOut.model_validate(pl)


@pl_router.delete("/{playlist_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a playlist")
def delete_playlist(
    playlist_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    user: CurrentUser,
) -> None:
    service.delete_playlist(db, user.id, playlist_id)


@pl_router.post(
    "/{playlist_id}/songs/{song_id}",
    response_model=PlaylistOut,
    summary="Add a song to a playlist",
)
def add_song(
    playlist_id: uuid.UUID,
    song_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    user: CurrentUser,
) -> PlaylistOut:
    pl = service.add_song(db, user.id, playlist_id, song_id)
    return PlaylistOut.model_validate(pl)


@pl_router.delete(
    "/{playlist_id}/songs/{song_id}",
    response_model=PlaylistOut,
    summary="Remove a song from a playlist",
)
def remove_song(
    playlist_id: uuid.UUID,
    song_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    user: CurrentUser,
) -> PlaylistOut:
    pl = service.remove_song(db, user.id, playlist_id, song_id)
    return PlaylistOut.model_validate(pl)


# Favorites
fav_router = APIRouter(prefix="/favorites", tags=["favorites"])


@fav_router.get("", response_model=list[FavoriteOut], summary="List the current user's favorite songs")
def list_favorites(
    db: Annotated[Session, Depends(get_db)], user: CurrentUser
) -> list[FavoriteOut]:
    return [FavoriteOut.model_validate(f) for f in service.list_favorites(db, user.id)]


@fav_router.post(
    "/{song_id}",
    response_model=FavoriteOut,
    status_code=status.HTTP_201_CREATED,
    summary="Favorite a song",
)
def add_favorite(
    song_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    user: CurrentUser,
) -> FavoriteOut:
    fav = service.add_favorite(db, user.id, song_id)
    return FavoriteOut.model_validate(fav)


@fav_router.delete(
    "/{song_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Unfavorite a song"
)
def remove_favorite(
    song_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    user: CurrentUser,
) -> None:
    service.remove_favorite(db, user.id, song_id)
