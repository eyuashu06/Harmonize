"""Practice session models."""
from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.db.types import CompatUUID, JsonDictList, JsonList


def _utcnow() -> datetime:
    return datetime.now(tz=UTC)


def _uuid() -> uuid.UUID:
    return uuid.uuid4()


class PracticeSession(Base):
    __tablename__ = "practice_sessions"

    id: Mapped[uuid.UUID] = mapped_column(CompatUUID(), primary_key=True, default=_uuid)
    user_id: Mapped[uuid.UUID] = mapped_column(
        CompatUUID(), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    song_id: Mapped[uuid.UUID | None] = mapped_column(
        CompatUUID(), ForeignKey("songs.id", ondelete="SET NULL"), nullable=True
    )

    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Progress & quality signals
    sections_completed: Mapped[list[str]] = mapped_column(JsonList(), default=list, nullable=False)
    average_tempo_bpm: Mapped[float | None] = mapped_column(Float, nullable=True)
    pitch_accuracy: Mapped[float | None] = mapped_column(Float, nullable=True)  # 0..1
    timing_accuracy: Mapped[float | None] = mapped_column(Float, nullable=True)  # 0..1
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    recording_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    extra: Mapped[dict] = mapped_column(JsonDictList(), default=dict, nullable=False)
