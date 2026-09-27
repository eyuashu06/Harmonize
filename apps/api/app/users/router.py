"""User routes: read/update the current user's profile."""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import CurrentUser
from app.db import get_db
from app.users import models
from app.users.schemas import UserOut, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserOut, summary="Get the current user")
def get_me(user: CurrentUser) -> models.User:
    return user


@router.patch("/me", response_model=UserOut, summary="Update the current user profile")
def update_me(
    payload: UserUpdate,
    db: Annotated[Session, Depends(get_db)],
    user: CurrentUser,
) -> models.User:
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(user, field, value)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
