"""Songs package."""
from app.songs.router import router as songs_router
from app.songs.theory import (
    chord_notes,
    detect_key_from_chords,
    get_guitar_fingering,
    parse_chord,
    piano_notes,
    suggest_capo,
    transpose_key,
    transpose_symbol,
)

__all__ = [
    "songs_router",
    "parse_chord",
    "transpose_symbol",
    "transpose_key",
    "suggest_capo",
    "chord_notes",
    "get_guitar_fingering",
    "piano_notes",
    "detect_key_from_chords",
]
