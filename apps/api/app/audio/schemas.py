"""Audio schemas."""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AudioUploadOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    song_id: uuid.UUID | None
    filename: str
    file_path: str
    mime_type: str
    size_bytes: int
    duration_seconds: float | None
    created_at: datetime


class AudioAnalysisOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    upload_id: uuid.UUID
    user_id: uuid.UUID
    status: str
    error: str | None
    key: str | None
    scale: str | None
    tempo_bpm: float | None
    time_signature: str | None
    duration_seconds: float | None
    chords: list[dict]
    melody: list[dict]
    harmony: list[dict]
    bass_line: list[dict]
    structure: list[dict]
    created_at: datetime
