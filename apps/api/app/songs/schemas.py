"""Song schemas (API request/response)."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

# ----- Chord shapes -----


class ChordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    symbol: str
    root: str
    quality: str
    guitar_frets: list[int]
    guitar_fingers: list[int]
    guitar_base_fret: int
    piano_notes: list[dict]


# ----- Lyrics & sections -----


class LyricLineOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    line_index: int
    text: str
    chords: list[dict]  # [{chord, beat}]
    start_seconds: float | None = None
    end_seconds: float | None = None


class SectionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    type: str
    order_index: int
    start_seconds: float | None
    end_seconds: float | None
    repeat: int


# ----- Songs -----


class SongSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    artist: str
    album: str | None
    duration_seconds: int | None
    key: str | None
    mode: str | None
    tempo_bpm: int | None
    time_signature: str | None
    difficulty: str
    tags: list[str]


class SongOut(SongSummary):
    capo: int
    tuning: str | None
    language: str
    is_public: bool
    sections: list[SectionOut] = Field(default_factory=list)
    lyrics: list[LyricLineOut] = Field(default_factory=list)
    chords: list[ChordOut] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


# ----- Create / update payloads -----


class SectionIn(BaseModel):
    name: str
    type: Literal["intro", "verse", "pre_chorus", "chorus", "bridge", "instrumental", "solo", "outro"] = "verse"
    order_index: int
    start_seconds: float | None = None
    end_seconds: float | None = None
    repeat: int = 1


class LyricLineIn(BaseModel):
    line_index: int
    text: str = ""
    chords: list[dict] = Field(default_factory=list)
    start_seconds: float | None = None
    end_seconds: float | None = None

    @field_validator("chords")
    @classmethod
    def _validate_chord(cls, v: list[dict]) -> list[dict]:
        for c in v:
            if "chord" not in c or not isinstance(c["chord"], str):
                raise ValueError("Each chord event must have a 'chord' string")
        return v


class SongCreate(BaseModel):
    title: str = Field(min_length=1, max_length=240)
    artist: str = Field(min_length=1, max_length=240)
    album: str | None = Field(default=None, max_length=240)
    duration_seconds: int | None = None
    key: str | None = None
    mode: Literal["major", "minor", "dorian", "mixolydian"] | None = None
    tempo_bpm: int | None = Field(default=None, ge=20, le=400)
    time_signature: str | None = Field(default=None, pattern=r"^\d+/\d+$")
    capo: int = Field(default=0, ge=0, le=12)
    tuning: str | None = None
    difficulty: Literal["beginner", "intermediate", "advanced"] = "intermediate"
    language: str = "en"
    tags: list[str] = Field(default_factory=list)
    sections: list[SectionIn] = Field(default_factory=list)
    lyrics: list[LyricLineIn] = Field(default_factory=list)


class SongUpdate(BaseModel):
    title: str | None = None
    artist: str | None = None
    album: str | None = None
    duration_seconds: int | None = None
    key: str | None = None
    mode: str | None = None
    tempo_bpm: int | None = Field(default=None, ge=20, le=400)
    time_signature: str | None = None
    capo: int | None = Field(default=None, ge=0, le=12)
    tuning: str | None = None
    difficulty: str | None = None
    tags: list[str] | None = None


# ----- Transposition -----


class TransposeRequest(BaseModel):
    semitones: int = Field(ge=-11, le=11)
    prefer_flats: bool = False


class TransposeResponse(BaseModel):
    original_key: str | None
    new_key: str | None
    suggested_capo: int | None
    semitones: int
    transposed_chords: list[str]


# ----- Search -----


class SongSearchResponse(BaseModel):
    items: list[SongSummary]
    total: int
    query: str
