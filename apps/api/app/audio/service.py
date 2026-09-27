"""Audio service: upload + async analysis."""
from __future__ import annotations

import uuid
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.audio import analyzer, models
from app.core.config import get_settings
from app.core.errors import NotFoundError, ValidationError


def save_upload(
    db: Session,
    user_id: uuid.UUID,
    *,
    filename: str,
    contents: bytes,
    mime_type: str,
    song_id: uuid.UUID | None = None,
) -> models.AudioUpload:
    settings = get_settings()
    max_bytes = settings.max_upload_mb * 1024 * 1024
    if len(contents) > max_bytes:
        raise ValidationError(f"File exceeds max upload size of {settings.max_upload_mb} MB.")
    if not _is_audio_mime(mime_type) and not _is_audio_filename(filename):
        raise ValidationError("Only audio files (mp3, wav, flac, m4a, ogg) are accepted.")

    upload_id = uuid.uuid4()
    target_dir = Path(settings.upload_dir) / str(user_id)
    target_dir.mkdir(parents=True, exist_ok=True)
    safe_name = _safe_filename(filename)
    file_path = target_dir / f"{upload_id}_{safe_name}"
    file_path.write_bytes(contents)

    upload = models.AudioUpload(
        id=upload_id,
        user_id=user_id,
        song_id=song_id,
        filename=filename,
        file_path=str(file_path),
        mime_type=mime_type,
        size_bytes=len(contents),
    )
    db.add(upload)
    db.commit()
    db.refresh(upload)
    return upload


def run_analysis(db: Session, user_id: uuid.UUID, upload_id: uuid.UUID) -> models.AudioAnalysis:
    upload = db.get(models.AudioUpload, upload_id)
    if upload is None or upload.user_id != user_id:
        raise NotFoundError("Audio upload not found.")
    analysis = models.AudioAnalysis(upload_id=upload.id, user_id=user_id, status="running")
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    try:
        result = analyzer.analyze_audio(upload.file_path, work_dir=Path(upload.file_path).parent)
        analysis.key = result.key
        analysis.scale = result.scale
        analysis.tempo_bpm = result.tempo_bpm
        analysis.time_signature = result.time_signature
        analysis.duration_seconds = result.duration_seconds
        analysis.chords = result.chords
        analysis.melody = result.melody
        analysis.harmony = result.harmony
        analysis.bass_line = result.bass_line
        analysis.structure = result.structure
        upload.duration_seconds = result.duration_seconds
        db.add(analysis)
        db.add(upload)
        analysis.status = "done"
        db.commit()
        db.refresh(analysis)
    except Exception as e:  # noqa: BLE001
        analysis.status = "failed"
        analysis.error = str(e)
        db.add(analysis)
        db.commit()
        db.refresh(analysis)
    return analysis


def get_analysis(db: Session, user_id: uuid.UUID, analysis_id: uuid.UUID) -> models.AudioAnalysis:
    a = db.get(models.AudioAnalysis, analysis_id)
    if a is None or a.user_id != user_id:
        raise NotFoundError("Analysis not found.")
    return a


def list_analyses(db: Session, user_id: uuid.UUID, limit: int = 50) -> list[models.AudioAnalysis]:
    return list(
        db.scalars(
            select(models.AudioAnalysis)
            .where(models.AudioAnalysis.user_id == user_id)
            .order_by(models.AudioAnalysis.created_at.desc())
            .limit(limit)
        )
    )


# ----- helpers -----


_AUDIO_MIMES = {
    "audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav",
    "audio/flac", "audio/x-flac", "audio/m4a", "audio/x-m4a",
    "audio/ogg", "audio/aac",
}
_AUDIO_EXTS = {".mp3", ".wav", ".flac", ".m4a", ".ogg", ".aac"}


def _is_audio_mime(mime: str) -> bool:
    return mime.lower() in _AUDIO_MIMES


def _is_audio_filename(name: str) -> bool:
    return Path(name).suffix.lower() in _AUDIO_EXTS


def _safe_filename(name: str) -> str:
    keep = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._-"
    return "".join(c if c in keep else "_" for c in name)
