"""Re-export Base for Alembic autogeneration."""
from app.audio.models import AudioAnalysis, AudioUpload  # noqa: F401
from app.db.session import Base  # noqa: F401
from app.playlists.models import Favorite, Playlist  # noqa: F401
from app.practice.models import PracticeSession  # noqa: F401
from app.songs.models import Chord, LyricLine, Section, Song  # noqa: F401

# Import all models here so Alembic picks them up.
from app.users.models import User  # noqa: F401
