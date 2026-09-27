"""Audio routes: upload, analyze, fetch results."""
from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.audio import service
from app.audio.schemas import AudioAnalysisOut, AudioUploadOut
from app.auth import CurrentUser
from app.db import get_db

router = APIRouter(prefix="/audio", tags=["audio"])


@router.post(
    "/uploads",
    response_model=AudioUploadOut,
    status_code=status.HTTP_201_CREATED,
    summary="Upload an audio file for analysis",
)
async def upload_audio(
    db: Annotated[Session, Depends(get_db)],
    user: CurrentUser,
    file: UploadFile = File(...),
    song_id: Annotated[uuid.UUID | None, Form()] = None,
) -> AudioUploadOut:
    contents = await file.read()
    upload = service.save_upload(
        db,
        user.id,
        filename=file.filename or "audio",
        contents=contents,
        mime_type=file.content_type or "application/octet-stream",
        song_id=song_id,
    )
    return AudioUploadOut.model_validate(upload)


@router.post(
    "/uploads/{upload_id}/analyze",
    response_model=AudioAnalysisOut,
    summary="Run the AI analysis pipeline on an uploaded file",
)
def analyze_upload(
    upload_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    user: CurrentUser,
) -> AudioAnalysisOut:
    analysis = service.run_analysis(db, user.id, upload_id)
    return AudioAnalysisOut.model_validate(analysis)


@router.get(
    "/analyses",
    response_model=list[AudioAnalysisOut],
    summary="List the current user's analyses",
)
def list_analyses(
    db: Annotated[Session, Depends(get_db)],
    user: CurrentUser,
    limit: int = Query(default=50, ge=1, le=200),
) -> list[AudioAnalysisOut]:
    return [AudioAnalysisOut.model_validate(a) for a in service.list_analyses(db, user.id, limit)]


@router.get(
    "/analyses/{analysis_id}",
    response_model=AudioAnalysisOut,
    summary="Get a specific analysis result",
)
def get_analysis(
    analysis_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    user: CurrentUser,
) -> AudioAnalysisOut:
    a = service.get_analysis(db, user.id, analysis_id)
    return AudioAnalysisOut.model_validate(a)
