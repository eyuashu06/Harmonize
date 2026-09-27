"""API router aggregation."""
from fastapi import APIRouter

from app.audio import audio_router
from app.auth import auth_router
from app.playlists import fav_router, pl_router
from app.practice import practice_router
from app.songs import songs_router
from app.users.router import router as users_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(songs_router)
api_router.include_router(pl_router)
api_router.include_router(fav_router)
api_router.include_router(practice_router)
api_router.include_router(audio_router)
