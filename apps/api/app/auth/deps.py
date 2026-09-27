"""FastAPI authentication dependencies.

The client sends a Bearer token (JWT) issued by the backend. To populate
that JWT, the client first authenticates with Firebase (Email/Password,
Google, or Apple) and POSTs the resulting ID token to /auth/session, which
returns a backend-issued JWT. Subsequent requests use that JWT.
"""
from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated

from fastapi import Depends, Header
from sqlalchemy.orm import Session

from app.auth.firebase import verify_firebase_id_token
from app.core.errors import AuthError, ForbiddenError
from app.core.security import decode_token
from app.db import get_db
from app.users import models as user_models


def _extract_bearer(authorization: str | None) -> str:
    """Extract the Bearer token from the Authorization header value."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise AuthError("Missing or malformed Authorization header.")
    return authorization.split(" ", 1)[1].strip()


def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
    db: Annotated[Session, Depends(get_db)] = None,  # type: ignore[assignment]
) -> user_models.User:
    """Resolve the current user from a backend-issued JWT."""
    token = _extract_bearer(authorization)
    try:
        payload = decode_token(token)
    except AuthError as e:
        raise e
    sub = payload.get("sub")
    if not sub:
        raise AuthError("Token missing subject.")
    user = db.get(user_models.User, sub)
    if user is None:
        raise AuthError("User no longer exists.")
    if not user.is_active:
        raise ForbiddenError("User account is disabled.")
    return user


CurrentUser = Annotated[user_models.User, Depends(get_current_user)]


def require_role(*roles: str):
    """Dependency factory enforcing role membership."""

    def _check(user: CurrentUser) -> user_models.User:
        if user.role not in roles:
            raise ForbiddenError(f"Requires one of: {', '.join(roles)}")
        return user

    return _check


def issue_session_for_firebase(id_token: str, db: Session) -> user_models.User:
    """Verify a Firebase ID token and return the local user, creating one
    on first login.

    Returns the User; caller is responsible for issuing a backend JWT.
    """
    claims = verify_firebase_id_token(id_token)
    firebase_uid = claims.get("uid") or claims.get("user_id") or claims.get("sub")
    email = claims.get("email")
    name = claims.get("name") or (email or "").split("@")[0]
    picture = claims.get("picture")
    provider = claims.get("firebase", {}).get("sign_in_provider", "firebase")

    if not firebase_uid:
        raise AuthError("Firebase token missing user identifier.")

    now = datetime.now(tz=UTC)
    user = db.query(user_models.User).filter(user_models.User.firebase_uid == firebase_uid).one_or_none()
    if user is None and email:
        user = db.query(user_models.User).filter(user_models.User.email == email).one_or_none()
        if user is not None:
            user.firebase_uid = firebase_uid

    if user is None:
        user = user_models.User(
            firebase_uid=firebase_uid,
            email=email,
            display_name=name or "Musician",
            avatar_url=picture,
            auth_provider=provider.split(".")[-1] if provider else "firebase",
            role="user",
            is_active=True,
            last_seen_at=now,
        )
        db.add(user)
    else:
        user.last_seen_at = now
    db.commit()
    db.refresh(user)
    return user
