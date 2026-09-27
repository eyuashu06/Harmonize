"""Authentication routes."""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.auth.deps import issue_session_for_firebase
from app.core.security import create_access_token
from app.db import get_db

router = APIRouter(prefix="/auth", tags=["auth"])


class FirebaseSessionIn(BaseModel):
    id_token: str = Field(..., description="Firebase ID token from the client SDK")
    remember_me: bool = True


class SessionOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: EmailStr | None = None


@router.post("/session", response_model=SessionOut, summary="Exchange a Firebase ID token for a backend JWT")
def create_session(
    payload: FirebaseSessionIn,
    db: Annotated[Session, Depends(get_db)],
) -> SessionOut:
    """Frontend calls this after Firebase sign-in (any provider).

    Returns a backend JWT to use for subsequent API calls.
    """
    user = issue_session_for_firebase(payload.id_token, db)
    token = create_access_token(
        subject=str(user.id),
        claims={"email": user.email, "role": user.role},
    )
    return SessionOut(access_token=token, user_id=str(user.id), email=user.email)
