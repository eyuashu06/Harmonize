"""Security primitives: password hashing and JWT."""
from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings
from app.core.errors import AuthError

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    """Return a bcrypt hash of the given password."""
    return _pwd.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """Return True if the password matches the hash."""
    return _pwd.verify(plain, hashed)


def create_access_token(
    subject: str,
    *,
    claims: dict[str, Any] | None = None,
    expires_minutes: int | None = None,
) -> str:
    """Create a signed JWT for the given subject (typically user id or email)."""
    settings = get_settings()
    minutes = expires_minutes or settings.jwt_expires_minutes
    now = datetime.now(tz=UTC)
    payload: dict[str, Any] = {
        "sub": subject,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=minutes)).timestamp()),
    }
    if claims:
        payload.update(claims)
    return jwt.encode(payload, settings.jwt_secret.get_secret_value(), algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict[str, Any]:
    """Decode and verify a JWT, raising AuthError on failure."""
    settings = get_settings()
    try:
        return jwt.decode(
            token,
            settings.jwt_secret.get_secret_value(),
            algorithms=[settings.jwt_algorithm],
        )
    except JWTError as e:
        raise AuthError("Invalid or expired token.") from e
