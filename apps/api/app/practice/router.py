"""Practice routes."""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.auth import CurrentUser
from app.db import get_db
from app.practice import service
from app.practice.schemas import PracticeSessionIn, PracticeSessionOut, PracticeStats

router = APIRouter(prefix="/practice", tags=["practice"])


@router.get("/sessions", response_model=list[PracticeSessionOut], summary="List recent practice sessions")
def list_sessions(
    db: Annotated[Session, Depends(get_db)],
    user: CurrentUser,
    limit: int = Query(default=50, ge=1, le=200),
) -> list[PracticeSessionOut]:
    return [PracticeSessionOut.model_validate(s) for s in service.list_sessions(db, user.id, limit)]


@router.post(
    "/sessions",
    response_model=PracticeSessionOut,
    status_code=status.HTTP_201_CREATED,
    summary="Record a practice session",
)
def create_session(
    payload: PracticeSessionIn,
    db: Annotated[Session, Depends(get_db)],
    user: CurrentUser,
) -> PracticeSessionOut:
    s = service.create_session(db, user.id, payload)
    return PracticeSessionOut.model_validate(s)


@router.get("/stats", response_model=PracticeStats, summary="Get the user's practice stats")
def get_stats(
    db: Annotated[Session, Depends(get_db)], user: CurrentUser
) -> PracticeStats:
    return service.get_stats(db, user.id)
