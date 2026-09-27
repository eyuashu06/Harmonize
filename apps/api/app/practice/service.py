"""Practice service."""
from __future__ import annotations

import uuid
from collections import defaultdict
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.practice import models
from app.practice.schemas import PracticeSessionIn, PracticeStats


def create_session(
    db: Session, user_id: uuid.UUID, payload: PracticeSessionIn
) -> models.PracticeSession:
    now = datetime.now(tz=UTC)
    duration = payload.duration_seconds
    sess = models.PracticeSession(
        user_id=user_id,
        song_id=payload.song_id,
        started_at=now,
        ended_at=now,
        duration_seconds=duration,
        sections_completed=payload.sections_completed,
        average_tempo_bpm=payload.average_tempo_bpm,
        pitch_accuracy=payload.pitch_accuracy,
        timing_accuracy=payload.timing_accuracy,
        notes=payload.notes,
        recording_url=payload.recording_url,
        extra=payload.extra,
    )
    db.add(sess)
    db.commit()
    db.refresh(sess)
    return sess


def list_sessions(db: Session, user_id: uuid.UUID, limit: int = 50) -> list[models.PracticeSession]:
    return list(
        db.scalars(
            select(models.PracticeSession)
            .where(models.PracticeSession.user_id == user_id)
            .order_by(models.PracticeSession.started_at.desc())
            .limit(limit)
        )
    )


def get_stats(db: Session, user_id: uuid.UUID) -> PracticeStats:
    sessions = list_sessions(db, user_id, limit=1000)
    total = len(sessions)
    total_minutes = sum(s.duration_seconds for s in sessions) // 60
    pitches = [s.pitch_accuracy for s in sessions if s.pitch_accuracy is not None]
    timings = [s.timing_accuracy for s in sessions if s.timing_accuracy is not None]
    by_day: dict[str, int] = defaultdict(int)
    for s in sessions:
        day = s.started_at.date().isoformat()
        by_day[day] += s.duration_seconds // 60
    last7 = sorted(
        ({"date": d, "minutes": m} for d, m in by_day.items()),
        key=lambda x: x["date"],
        reverse=True,
    )[:7]
    return PracticeStats(
        total_sessions=total,
        total_minutes=total_minutes,
        average_pitch_accuracy=sum(pitches) / len(pitches) if pitches else None,
        average_timing_accuracy=sum(timings) / len(timings) if timings else None,
        last_7_days=last7,
    )
