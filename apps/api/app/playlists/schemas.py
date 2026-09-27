"""Playlist schemas."""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PlaylistBase(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=500)
    is_public: bool = False


class PlaylistCreate(PlaylistBase):
    song_ids: list[uuid.UUID] = Field(default_factory=list)


class PlaylistUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    is_public: bool | None = None
    song_ids: list[uuid.UUID] | None = None


class PlaylistOut(PlaylistBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    song_ids: list[uuid.UUID]
    created_at: datetime
    updated_at: datetime


class FavoriteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    song_id: uuid.UUID
    created_at: datetime
