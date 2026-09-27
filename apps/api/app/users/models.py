"""User ORM model."""
from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.db.types import CompatUUID


def _utcnow() -> datetime:
    return datetime.now(tz=UTC)


def _new_uuid() -> uuid.UUID:
    return uuid.uuid4()


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(CompatUUID(), primary_key=True, default=_new_uuid)
    firebase_uid: Mapped[str | None] = mapped_column(String(128), unique=True, index=True, nullable=True)
    email: Mapped[str | None] = mapped_column(String(254), unique=True, index=True, nullable=True)
    display_name: Mapped[str] = mapped_column(String(120), default="Musician")
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    auth_provider: Mapped[str] = mapped_column(String(32), default="password")
    role: Mapped[str] = mapped_column(String(16), default="user")  # user | artist | admin
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Musical preferences
    primary_instrument: Mapped[str | None] = mapped_column(String(32), nullable=True)
    skill_level: Mapped[str | None] = mapped_column(String(16), nullable=True)  # beginner | intermediate | advanced

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    def __repr__(self) -> str:  # pragma: no cover
        return f"<User id={self.id} email={self.email} role={self.role}>"
