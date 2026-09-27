"""Song-related ORM models: Song, Section, LyricLine, Chord, Favorite."""
from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.db.types import CompatIntArray, CompatTextArray, CompatUUID, JsonDictList


def _utcnow() -> datetime:
    return datetime.now(tz=UTC)


def _uuid() -> uuid.UUID:
    return uuid.uuid4()


SECTION_TYPES = (
    "intro",
    "verse",
    "pre_chorus",
    "chorus",
    "bridge",
    "instrumental",
    "solo",
    "outro",
)


class Song(Base):
    __tablename__ = "songs"

    id: Mapped[uuid.UUID] = mapped_column(CompatUUID(), primary_key=True, default=_uuid)
    title: Mapped[str] = mapped_column(String(240), index=True, nullable=False)
    artist: Mapped[str] = mapped_column(String(240), index=True, nullable=False)
    album: Mapped[str | None] = mapped_column(String(240), nullable=True)
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Musical metadata
    key: Mapped[str | None] = mapped_column(String(8), nullable=True)         # e.g. "C", "G#m"
    mode: Mapped[str | None] = mapped_column(String(16), nullable=True)       # major / minor
    tempo_bpm: Mapped[int | None] = mapped_column(Integer, nullable=True)
    time_signature: Mapped[str | None] = mapped_column(String(8), nullable=True)  # "4/4"
    capo: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    tuning: Mapped[str | None] = mapped_column(String(32), nullable=True)     # "EADGBE" etc.

    tags: Mapped[list[str]] = mapped_column(CompatTextArray(), default=list, nullable=False)
    difficulty: Mapped[str] = mapped_column(String(16), default="intermediate")  # beginner | intermediate | advanced
    language: Mapped[str] = mapped_column(String(8), default="en")
    is_public: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Owner (uploader). Null for built-in library songs.
    owner_id: Mapped[uuid.UUID | None] = mapped_column(
        CompatUUID(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )

    sections: Mapped[list[Section]] = relationship(
        back_populates="song", cascade="all, delete-orphan", order_by="Section.order_index"
    )
    lyrics: Mapped[list[LyricLine]] = relationship(
        back_populates="song", cascade="all, delete-orphan", order_by="LyricLine.line_index"
    )
    chords: Mapped[list[Chord]] = relationship(back_populates="song", cascade="all, delete-orphan")

    __table_args__ = (UniqueConstraint("title", "artist", name="uq_song_title_artist"),)


class Section(Base):
    __tablename__ = "sections"

    id: Mapped[uuid.UUID] = mapped_column(CompatUUID(), primary_key=True, default=_uuid)
    song_id: Mapped[uuid.UUID] = mapped_column(
        CompatUUID(), ForeignKey("songs.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(64), nullable=False)            # e.g. "Verse 1"
    type: Mapped[str] = mapped_column(String(32), default="verse")
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    start_seconds: Mapped[float | None] = mapped_column(nullable=True)
    end_seconds: Mapped[float | None] = mapped_column(nullable=True)
    repeat: Mapped[int] = mapped_column(Integer, default=1)

    song: Mapped[Song] = relationship(back_populates="sections")


class LyricLine(Base):
    __tablename__ = "lyric_lines"

    id: Mapped[uuid.UUID] = mapped_column(CompatUUID(), primary_key=True, default=_uuid)
    song_id: Mapped[uuid.UUID] = mapped_column(
        CompatUUID(), ForeignKey("songs.id", ondelete="CASCADE"), index=True, nullable=False
    )
    section_id: Mapped[uuid.UUID | None] = mapped_column(
        CompatUUID(), ForeignKey("sections.id", ondelete="SET NULL"), nullable=True
    )
    line_index: Mapped[int] = mapped_column(Integer, nullable=False)
    text: Mapped[str] = mapped_column(Text, default="", nullable=False)

    # Per-chord timing within this line. Example:
    # [{"chord": "C", "beat": 1.0}, {"chord": "G", "beat": 2.5}]
    chords: Mapped[list[dict]] = mapped_column(JsonDictList(), default=list, nullable=False)

    start_seconds: Mapped[float | None] = mapped_column(nullable=True)
    end_seconds: Mapped[float | None] = mapped_column(nullable=True)

    song: Mapped[Song] = relationship(back_populates="lyrics")


class Chord(Base):
    """Chord catalog entry -- diagrams, notes, alternate fingerings."""

    __tablename__ = "chords"

    id: Mapped[uuid.UUID] = mapped_column(CompatUUID(), primary_key=True, default=_uuid)
    song_id: Mapped[uuid.UUID | None] = mapped_column(
        CompatUUID(), ForeignKey("songs.id", ondelete="CASCADE"), nullable=True
    )
    symbol: Mapped[str] = mapped_column(String(16), index=True, nullable=False)  # "Cmaj7", "F#m"
    root: Mapped[str] = mapped_column(String(2), nullable=False)                  # "C", "F#"
    quality: Mapped[str] = mapped_column(String(16), default="")                 # "maj7", "m", "dim"
    # Frets indexed by string (low E to high E for guitar). -1 = muted, 0 = open.
    guitar_frets: Mapped[list[int]] = mapped_column(CompatIntArray(), default=list)
    guitar_fingers: Mapped[list[int]] = mapped_column(CompatIntArray(), default=list)
    guitar_base_fret: Mapped[int] = mapped_column(Integer, default=1)
    # Piano: list of (midi_note, hand) tuples
    piano_notes: Mapped[list[dict]] = mapped_column(JsonDictList(), default=list)

    song: Mapped[Song | None] = relationship(back_populates="chords")
