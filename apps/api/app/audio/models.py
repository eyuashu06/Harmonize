"""Audio upload & analysis models."""
from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.db.types import CompatUUID, JsonDictList


def _utcnow() -> datetime:
    return datetime.now(tz=UTC)


def _uuid() -> uuid.UUID:
    return uuid.uuid4()


class AudioUpload(Base):
    __tablename__ = "audio_uploads"

    id: Mapped[uuid.UUID] = mapped_column(CompatUUID(), primary_key=True, default=_uuid)
    user_id: Mapped[uuid.UUID] = mapped_column(
        CompatUUID(), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    song_id: Mapped[uuid.UUID | None] = mapped_column(
        CompatUUID(), ForeignKey("songs.id", ondelete="SET NULL"), nullable=True
    )

    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(64), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    duration_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)


class AudioAnalysis(Base):
    __tablename__ = "audio_analyses"

    id: Mapped[uuid.UUID] = mapped_column(CompatUUID(), primary_key=True, default=_uuid)
    upload_id: Mapped[uuid.UUID] = mapped_column(
        CompatUUID(), ForeignKey("audio_uploads.id", ondelete="CASCADE"), index=True, nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        CompatUUID(), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )

    status: Mapped[str] = mapped_column(String(16), default="pending")  # pending | running | done | failed
    error: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # High-level results
    key: Mapped[str | None] = mapped_column(String(8), nullable=True)
    scale: Mapped[str | None] = mapped_column(String(16), nullable=True)
    tempo_bpm: Mapped[float | None] = mapped_column(Float, nullable=True)
    time_signature: Mapped[str | None] = mapped_column(String(8), nullable=True)
    duration_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Detailed results (JSON)
    chords: Mapped[list] = mapped_column(JsonDictList(), default=list, nullable=False)        # [{start, end, chord}]
    melody: Mapped[list] = mapped_column(JsonDictList(), default=list, nullable=False)       # [{start, end, midi, pitch, velocity}]
    harmony: Mapped[list] = mapped_column(JsonDictList(), default=list, nullable=False)       # [{start, end, notes:[midi]}]
    bass_line: Mapped[list] = mapped_column(JsonDictList(), default=list, nullable=False)     # [{start, end, midi}]
    structure: Mapped[list] = mapped_column(JsonDictList(), default=list, nullable=False)     # [{start, end, label}]

    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)
