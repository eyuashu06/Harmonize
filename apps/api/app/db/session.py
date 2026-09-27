"""SQLAlchemy engine, session factory, and Base."""
from __future__ import annotations

from collections.abc import Iterator
from typing import Any

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""

    type_annotation_map: dict[Any, Any] = {}


def _build_engine() -> Any:
    s = get_settings()
    kwargs: dict[str, Any] = {
        "echo": s.db_echo,
        "future": True,
    }
    # Pool tuning only applies to pool-based dialects (PostgreSQL, MySQL).
    # SQLite uses SingletonThreadPool and does not accept these arguments.
    if not s.database_url.startswith("sqlite:"):
        kwargs["pool_pre_ping"] = True
        kwargs["pool_size"] = s.db_pool_size
        kwargs["max_overflow"] = s.db_max_overflow
    return create_engine(s.database_url, **kwargs)


engine: Any = _build_engine()
SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
    class_=Session,
)


def get_db() -> Iterator[Session]:
    """FastAPI dependency that yields a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
