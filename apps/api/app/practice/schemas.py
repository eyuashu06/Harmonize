"""Practice schemas."""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PracticeSessionIn(BaseModel):
    song_id: uuid.UUID | None = None
    duration_seconds: int = Field(ge=0, default=0)
    sections_completed: list[str] = Field(default_factory=list)
    average_tempo_bpm: float | None = Field(default=None, ge=0, le=400)
    pitch_accuracy: float | None = Field(default=None, ge=0, le=1)
    timing_accuracy: float | None = Field(default=None, ge=0, le=1)
    notes: str | None = None
    recording_url: str | None = None
    extra: dict = Field(default_factory=dict)


class PracticeSessionOut(PracticeSessionIn):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    started_at: datetime
    ended_at: datetime | None


class PracticeStats(BaseModel):
    total_sessions: int
    total_minutes: int
    average_pitch_accuracy: float | None
    average_timing_accuracy: float | None
    last_7_days: list[dict]  # [{date: "2025-01-01", minutes: 12}]
