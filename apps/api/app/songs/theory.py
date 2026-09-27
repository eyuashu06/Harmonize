"""Music theory primitives: notes, scales, chords, transposition.

This module is pure Python (no I/O, no FastAPI) so it can be reused in
practice mode, audio analysis, and the frontend (eventually via WASM).
"""
from __future__ import annotations

import re
from dataclasses import dataclass

# 12 chromatic pitch classes. Sharps by default; we convert to flats on demand.
NOTE_NAMES_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
NOTE_NAMES_FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]

# Common enharmonic spellings, keyed on the sharp/flat form.
ENHARMONIC = {
    "C#": "Db", "Db": "C#",
    "D#": "Eb", "Eb": "D#",
    "F#": "Gb", "Gb": "F#",
    "G#": "Ab", "Ab": "G#",
    "A#": "Bb", "Bb": "A#",
}

# Diatonic key -> offset (semitones from C)
KEY_TO_SEMITONE = {
    "C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3,
    "E": 4, "F": 5, "F#": 6, "Gb": 6, "G": 7, "G#": 8,
    "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11,
}

# Open chord shapes (guitar, EADGBE) for a comprehensive dictionary. Each shape is
# (base_fret, [fret_for_each_string_e_to_e]) with -1 = muted, 0 = open.
OPEN_CHORDS: dict[str, tuple[int, list[int]]] = {
    "C":   (1, [-1, 3, 2, 0, 1, 0]),
    "D":   (1, [-1, -1, 0, 2, 3, 2]),
    "D7":  (1, [-1, -1, 0, 2, 1, 2]),
    "Dm":  (1, [-1, -1, 0, 2, 3, 1]),
    "Dm7": (1, [-1, -1, 0, 2, 1, 1]),
    "E":   (1, [0, 2, 2, 1, 0, 0]),
    "Em":  (1, [0, 2, 2, 0, 0, 0]),
    "Em7": (1, [0, 2, 2, 0, 3, 3]),
    "E7":  (1, [0, 2, 2, 1, 3, 0]),
    "F":   (1, [1, 3, 3, 2, 1, 1]),
    "Fm":  (1, [1, 3, 3, 1, 1, 1]),
    "G":   (1, [3, 2, 0, 0, 0, 3]),
    "G7":  (1, [3, 2, 0, 0, 0, 1]),
    "Gm":  (3, [3, 5, 5, 3, 3, 3]),
    "A":   (1, [-1, 0, 2, 2, 2, 0]),
    "Am":  (1, [-1, 0, 2, 2, 1, 0]),
    "Am7": (1, [-1, 0, 2, 0, 1, 0]),
    "A7":  (1, [-1, 0, 2, 0, 2, 0]),
    "B":   (2, [-1, 2, 4, 4, 4, 2]),
    "Bm":  (2, [-1, 2, 4, 4, 3, 2]),
    "B7":  (1, [-1, 2, 1, 2, 0, 2]),
    "Bb":  (1, [-1, 1, 3, 3, 3, 1]),
    "Bbm": (1, [-1, 1, 3, 3, 2, 1]),
}

# Capo-friendly keys (most common guitar keys)
COMMON_KEYS = [
    "C", "G", "D", "A", "E", "F", "Bb", "Eb", "Ab", "Db",
    "F#", "B", "E", "A", "D", "G", "C",
]

CHORD_REGEX = re.compile(
    r"^([A-G])([#b]?)(m(?:aj)?(?:7|9|11|13)?|7|9|11|13|dim|aug|sus[24]|add9|6)?(/[A-G][#b]?)?$"
)


@dataclass(frozen=True)
class ParsedChord:
    """Parsed chord with root note, quality suffix, and optional bass slash."""

    symbol: str
    root: str          # original spelling, e.g. "C#", "Bb"
    quality: str       # e.g. "m", "maj7", "7", "dim"
    bass: str | None   # original spelling of the bass note
    matched: bool = True  # False if the symbol didn't look like a chord


def parse_chord(symbol: str) -> ParsedChord:
    """Parse a chord symbol into its components.

    Preserves the user's original spelling (F# stays F#) while still being
    usable for semitone math via `KEY_TO_SEMITONE`.

    Examples
    --------
    >>> parse_chord("Cmaj7")
    ParsedChord(symbol='Cmaj7', root='C', quality='maj7', bass=None, matched=True)
    >>> parse_chord("F#m7/A#")
    ParsedChord(symbol='F#m7/A#', root='F#', quality='m7', bass='A#', matched=True)
    >>> parse_chord("Hwat")
    ParsedChord(symbol='Hwat', root='', quality='', bass=None, matched=False)
    """
    m = CHORD_REGEX.match(symbol.strip())
    if not m:
        return ParsedChord(symbol=symbol, root="", quality="", bass=None, matched=False)
    letter, accidental, quality, bass = m.groups()
    quality = quality or ""
    # Preserve the user's spelling — e.g. F# stays F#, Bb stays Bb.
    # We only need the canonical form for semitone lookups (see `semitone_for`).
    root = letter + (accidental or "")
    bass_norm = bass.lstrip("/") if bass else None
    return ParsedChord(symbol=symbol, root=root, quality=quality, bass=bass_norm, matched=True)


def _semitone_for(note: str) -> int:
    """Map a note spelling (sharp or flat) to its semitone (0-11)."""
    if note in KEY_TO_SEMITONE:
        return KEY_TO_SEMITONE[note]
    canon = ENHARMONIC.get(note)
    return KEY_TO_SEMITONE.get(canon or "", 0)


def transpose_symbol(symbol: str, semitones: int, *, prefer_flats: bool = False) -> str:
    """Transpose a chord symbol by `semitones` (can be negative).

    The output uses sharps unless `prefer_flats` is True.
    """
    parsed = parse_chord(symbol)
    if not parsed.matched or not parsed.root:
        return symbol  # unknown — return as-is

    names = NOTE_NAMES_FLAT if prefer_flats else NOTE_NAMES_SHARP
    new_idx = (_semitone_for(parsed.root) + semitones) % 12
    new_root = names[new_idx]
    new_bass = None
    if parsed.bass and _semitone_for(parsed.bass) is not None:
        new_bass = names[(_semitone_for(parsed.bass) + semitones) % 12]
    return f"{new_root}{parsed.quality}" + (f"/{new_bass}" if new_bass else "")


def transpose_key(key: str, semitones: int, *, prefer_flats: bool = False) -> str:
    """Transpose a key string (e.g. "G", "F#m", "Bbm") by semitones."""
    parsed = parse_chord(key)
    if not parsed.matched or not parsed.root:
        return key
    names = NOTE_NAMES_FLAT if prefer_flats else NOTE_NAMES_SHARP
    new_idx = (_semitone_for(parsed.root) + semitones) % 12
    return f"{names[new_idx]}{parsed.quality}"


def suggest_capo(original_key: str, target_key: str = "C") -> int | None:
    """Suggest a capo fret to play in `original_key` using shapes for `target_key`.

    Returns the capo position (0 = no capo), or None if not possible.
    """
    pa, pb = parse_chord(original_key), parse_chord(target_key)
    if not pa.matched or not pb.matched or not pa.root or not pb.root:
        return None
    delta = (_semitone_for(pa.root) - _semitone_for(pb.root)) % 12
    # Capo on fret N + open chord for target = original key
    return delta if 0 <= delta <= 7 else None


def chord_notes(symbol: str) -> list[str]:
    """Return the 12-tone-agnostic note names in a chord (e.g. C E G for C major)."""
    parsed = parse_chord(symbol)
    if not parsed.matched or not parsed.root:
        return []
    idx = _semitone_for(parsed.root)
    names = NOTE_NAMES_SHARP
    intervals = _intervals(parsed.quality)
    return [names[(idx + iv) % 12] for iv in intervals]


def get_guitar_fingering(symbol: str) -> tuple[int, list[int]] | None:
    """Look up a guitar fingering for a chord symbol. Returns (base_fret, frets)."""
    p = parse_chord(symbol)
    if not p.matched:
        return None
    candidates = [p.symbol, p.root, ENHARMONIC.get(p.root, p.root)]
    for c in candidates:
        if c in OPEN_CHORDS:
            return OPEN_CHORDS[c]
    return None


def piano_notes(symbol: str, *, octave: int = 4) -> list[int]:
    """Return the MIDI note numbers for a chord, starting from the given octave."""
    parsed = parse_chord(symbol)
    if not parsed.matched or not parsed.root:
        return []
    root_midi = (octave + 1) * 12 + _semitone_for(parsed.root)
    return [root_midi + iv for iv in _intervals(parsed.quality)]


_SIMPLE_QUALITY_INTERVALS: dict[str, list[int]] = {
    "aug": [0, 4, 8],
    "sus2": [0, 2, 7],
    "sus4": [0, 5, 7],
}


def _intervals(quality: str) -> list[int]:
    if quality.startswith("m") and not quality.startswith("maj"):
        return [0, 3, 7, 10] if "7" in quality else [0, 3, 7]
    if quality.startswith("dim"):
        return [0, 3, 6, 9] if "7" in quality else [0, 3, 6]
    for prefix, intervals in _SIMPLE_QUALITY_INTERVALS.items():
        if quality.startswith(prefix):
            return intervals
    if "maj7" in quality:
        return [0, 4, 7, 11]
    return [0, 4, 7, 10] if "7" in quality else [0, 4, 7]


def detect_key_from_chords(chords: list[str]) -> str | None:
    """Crude key detection from a list of chord symbols (returns the root only)."""
    if not chords:
        return None
    counts: dict[str, int] = {}
    for c in chords:
        p = parse_chord(c)
        if p.root and p.root in KEY_TO_SEMITONE:
            counts[p.root] = counts.get(p.root, 0) + 1
    if not counts:
        return None
    return max(counts, key=counts.get)
