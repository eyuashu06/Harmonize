"""Pytest configuration and shared fixtures."""
from __future__ import annotations

import os
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Ensure tests use the test environment before any settings are loaded.
os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/15")
os.environ.setdefault("JWT_SECRET", "test-secret-do-not-use-in-prod-please-32chars")
os.environ.setdefault("FIREBASE_CREDENTIALS_PATH", "")

from app.core.config import get_settings  # noqa: E402
from app.core.security import create_access_token  # noqa: E402
from app.db.session import Base, get_db  # noqa: E402
from app.main import create_app  # noqa: E402
from app.users import models as user_models  # noqa: E402

get_settings.cache_clear()  # type: ignore[attr-defined]


# ----- Test DB -----

engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    future=True,
)
TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def _override_get_db() -> Iterator:
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


# ----- Fixtures -----


@pytest.fixture(autouse=True)
def _create_tables():
    # Import models so SQLAlchemy registers them on the metadata.
    from app.db import base  # noqa: F401

    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db() -> Iterator:
    s = TestingSessionLocal()
    try:
        yield s
    finally:
        s.close()


@pytest.fixture
def app():
    application = create_app()
    application.dependency_overrides[get_db] = _override_get_db
    return application


@pytest.fixture
def client(app) -> TestClient:
    return TestClient(app)


@pytest.fixture
def user(db) -> user_models.User:
    u = user_models.User(
        firebase_uid="test-uid",
        email="test@example.com",
        display_name="Tester",
        role="user",
        is_active=True,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


@pytest.fixture
def auth_headers(user) -> dict[str, str]:
    token = create_access_token(subject=str(user.id), claims={"email": user.email, "role": user.role})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_user(db) -> user_models.User:
    u = user_models.User(
        firebase_uid="admin-uid",
        email="admin@example.com",
        display_name="Admin",
        role="admin",
        is_active=True,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


@pytest.fixture
def admin_headers(admin_user) -> dict[str, str]:
    token = create_access_token(subject=str(admin_user.id), claims={"role": "admin"})
    return {"Authorization": f"Bearer {token}"}
