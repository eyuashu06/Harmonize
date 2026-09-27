"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-01-01 00:00:00
"""
from __future__ import annotations

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0001_initial"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # users
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("firebase_uid", sa.String(128), unique=True, index=True, nullable=True),
        sa.Column("email", sa.String(254), unique=True, index=True, nullable=True),
        sa.Column("display_name", sa.String(120), nullable=False, server_default="Musician"),
        sa.Column("avatar_url", sa.String(500), nullable=True),
        sa.Column("auth_provider", sa.String(32), nullable=False, server_default="password"),
        sa.Column("role", sa.String(16), nullable=False, server_default="user"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("primary_instrument", sa.String(32), nullable=True),
        sa.Column("skill_level", sa.String(16), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
    )

    # songs
    op.create_table(
        "songs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("title", sa.String(240), nullable=False, index=True),
        sa.Column("artist", sa.String(240), nullable=False, index=True),
        sa.Column("album", sa.String(240), nullable=True),
        sa.Column("duration_seconds", sa.Integer(), nullable=True),
        sa.Column("key", sa.String(8), nullable=True),
        sa.Column("mode", sa.String(16), nullable=True),
        sa.Column("tempo_bpm", sa.Integer(), nullable=True),
        sa.Column("time_signature", sa.String(8), nullable=True),
        sa.Column("capo", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("tuning", sa.String(32), nullable=True),
        sa.Column("tags", postgresql.ARRAY(sa.String), nullable=False, server_default="{}"),
        sa.Column("difficulty", sa.String(16), nullable=False, server_default="intermediate"),
        sa.Column("language", sa.String(8), nullable=False, server_default="en"),
        sa.Column("is_public", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "owner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("title", "artist", name="uq_song_title_artist"),
    )

    # sections
    op.create_table(
        "sections",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "song_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("songs.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("name", sa.String(64), nullable=False),
        sa.Column("type", sa.String(32), nullable=False, server_default="verse"),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("start_seconds", sa.Float(), nullable=True),
        sa.Column("end_seconds", sa.Float(), nullable=True),
        sa.Column("repeat", sa.Integer(), nullable=False, server_default="1"),
    )

    # lyric lines
    op.create_table(
        "lyric_lines",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "song_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("songs.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "section_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("sections.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("line_index", sa.Integer(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False, server_default=""),
        sa.Column("chords", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("start_seconds", sa.Float(), nullable=True),
        sa.Column("end_seconds", sa.Float(), nullable=True),
    )

    # chords
    op.create_table(
        "chords",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "song_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("songs.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("symbol", sa.String(16), nullable=False, index=True),
        sa.Column("root", sa.String(2), nullable=False),
        sa.Column("quality", sa.String(16), nullable=False, server_default=""),
        sa.Column("guitar_frets", postgresql.ARRAY(sa.Integer), nullable=False, server_default="{}"),
        sa.Column("guitar_fingers", postgresql.ARRAY(sa.Integer), nullable=False, server_default="{}"),
        sa.Column("guitar_base_fret", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("piano_notes", postgresql.JSONB, nullable=False, server_default="[]"),
    )

    # playlists
    op.create_table(
        "playlists",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column("is_public", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column(
            "song_ids",
            postgresql.ARRAY(postgresql.UUID(as_uuid=True)),
            nullable=False,
            server_default="{}",
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "name", name="uq_playlist_user_name"),
    )

    # favorites
    op.create_table(
        "favorites",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "song_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("songs.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "song_id", name="uq_favorite_user_song"),
    )

    # practice sessions
    op.create_table(
        "practice_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "song_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("songs.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_seconds", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("sections_completed", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("average_tempo_bpm", sa.Float(), nullable=True),
        sa.Column("pitch_accuracy", sa.Float(), nullable=True),
        sa.Column("timing_accuracy", sa.Float(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("recording_url", sa.String(500), nullable=True),
        sa.Column("extra", postgresql.JSONB, nullable=False, server_default="{}"),
    )

    # audio uploads
    op.create_table(
        "audio_uploads",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "song_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("songs.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("file_path", sa.String(500), nullable=False),
        sa.Column("mime_type", sa.String(64), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("duration_seconds", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # audio analyses
    op.create_table(
        "audio_analyses",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "upload_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("audio_uploads.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("status", sa.String(16), nullable=False, server_default="pending"),
        sa.Column("error", sa.String(500), nullable=True),
        sa.Column("key", sa.String(8), nullable=True),
        sa.Column("scale", sa.String(16), nullable=True),
        sa.Column("tempo_bpm", sa.Float(), nullable=True),
        sa.Column("time_signature", sa.String(8), nullable=True),
        sa.Column("duration_seconds", sa.Float(), nullable=True),
        sa.Column("chords", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("melody", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("harmony", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("bass_line", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("structure", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("audio_analyses")
    op.drop_table("audio_uploads")
    op.drop_table("practice_sessions")
    op.drop_table("favorites")
    op.drop_table("playlists")
    op.drop_table("chords")
    op.drop_table("lyric_lines")
    op.drop_table("sections")
    op.drop_table("songs")
    op.drop_table("users")
