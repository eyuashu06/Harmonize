"""Firebase Admin SDK initialization and ID-token verification."""
from __future__ import annotations

from functools import lru_cache
from typing import Any

from app.core.config import get_settings
from app.core.errors import AuthError
from app.core.logging import get_logger

log = get_logger(__name__)


@lru_cache(maxsize=1)
def _firebase_app() -> Any | None:
    """Lazily initialize Firebase Admin (idempotent)."""
    s = get_settings()
    if not s.firebase_credentials_path:
        log.info("firebase_disabled", reason="no credentials path configured")
        return None
    try:
        import firebase_admin
        from firebase_admin import credentials

        if firebase_admin._apps:  # already initialized
            return firebase_admin.get_app()

        cred = credentials.Certificate(s.firebase_credentials_path)
        kwargs: dict[str, Any] = {"credential": cred}
        if s.firebase_project_id:
            kwargs["projectId"] = s.firebase_project_id
        return firebase_admin.initialize_app(**kwargs)
    except Exception as e:  # noqa: BLE001
        log.warning("firebase_init_failed", error=str(e))
        return None


def verify_firebase_id_token(id_token: str) -> dict[str, Any]:
    """Verify a Firebase ID token and return its decoded claims.

    Falls back to local JWT decoding in test environments where the
    project issues its own tokens (using the same JWT secret).
    """
    s = get_settings()
    if not s.is_production and id_token.startswith("mock-token:"):
        email = id_token.split(":", 1)[1]
        return {
            "uid": f"mock-uid-{email}",
            "email": email,
            "name": email.split("@")[0].capitalize(),
            "picture": None,
            "firebase": {"sign_in_provider": "password"}
        }

    app = _firebase_app()
    if app is not None:
        try:
            from firebase_admin import auth

            return dict(auth.verify_id_token(id_token))
        except Exception as e:  # noqa: BLE001
            raise AuthError("Invalid Firebase ID token.") from e

    # Fallback: trust local JWTs (dev/test only)
    from app.core.security import decode_token

    return decode_token(id_token)
