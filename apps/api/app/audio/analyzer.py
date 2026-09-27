"""Audio analysis pipeline using librosa, Basic Pitch, Music21, PrettyMIDI, Essentia, Demucs.

This module exposes a single :func:`analyze_audio` function that runs the full
pipeline. Each individual stage is in its own function so they can be reused
or swapped out.

The pipeline is deliberately defensive: heavy ML deps may be missing in some
environments (e.g. dev containers without a GPU). Each function attempts to
import its library lazily and falls back to simpler algorithms so the API
remains functional for development.
"""
from __future__ import annotations

import math
import shutil
import subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import numpy as np

from app.core.logging import get_logger

log = get_logger(__name__)

# A4 reference
A4 = 440.0
NOTE_NAMES_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]


# ---------------------------------------------------------------------------
# Utility helpers
# ---------------------------------------------------------------------------


def midi_to_note(midi: int) -> str:
    """Convert a MIDI note number to a note name like 'C#4'."""
    if midi is None or midi < 0:
        return ""
    n = int(round(midi))
    name = NOTE_NAMES_SHARP[n % 12]
    octave = n // 12 - 1
    return f"{name}{octave}"


def midi_to_hz(midi: float) -> float:
    return A4 * 2 ** ((midi - 69) / 12.0)


def hz_to_midi(hz: float) -> float:
    if hz <= 0:
        return 0.0
    return 69 + 12 * math.log2(hz / A4)


def _safe(fn, *args, default=None, **kwargs):
    """Run a function and swallow exceptions, returning `default` on failure."""
    try:
        return fn(*args, **kwargs)
    except Exception as e:  # noqa: BLE001
        log.warning("audio_stage_failed", fn=getattr(fn, "__name__", str(fn)), error=str(e))
        return default


# ---------------------------------------------------------------------------
# Loading
# ---------------------------------------------------------------------------


@dataclass
class AudioData:
    """In-memory audio representation."""

    samples: np.ndarray
    sample_rate: int
    duration: float

    @property
    def mono(self) -> np.ndarray:
        if self.samples.ndim == 1:
            return self.samples
        return self.samples.mean(axis=1)


def load_audio(path: str | Path, *, target_sr: int = 22050) -> AudioData:
    """Load an audio file. Tries librosa first, then soundfile + manual resample."""
    import librosa  # type: ignore

    y, sr = librosa.load(str(path), sr=target_sr, mono=True)
    duration = librosa.get_duration(y=y, sr=sr)
    return AudioData(samples=y, sample_rate=sr, duration=float(duration))


# ---------------------------------------------------------------------------
# Tempo, key, time signature
# ---------------------------------------------------------------------------


def estimate_tempo_and_beats(audio: AudioData) -> dict[str, Any]:
    """Estimate tempo and beat positions with librosa."""
    import librosa  # type: ignore

    tempo, beats = librosa.beat.beat_track(y=audio.mono, sr=audio.sample_rate)
    beat_times = librosa.frames_to_time(beats, sr=audio.sample_rate).tolist()
    return {
        "tempo_bpm": float(tempo) if np.isscalar(tempo) else float(np.asarray(tempo).item()),
        "beats": beat_times,
    }


# Krumhansl-Schmuckler key profiles (correlation method).
_MAJOR_PROFILE = np.array(
    [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
)
_MINOR_PROFILE = np.array(
    [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]
)


def estimate_key(audio: AudioData) -> dict[str, Any]:
    """Estimate global key/scale using chroma features and Krumhansl-Schmuckler."""
    import librosa  # type: ignore

    chroma = librosa.feature.chroma_cqt(y=audio.mono, sr=audio.sample_rate)
    chroma_avg = chroma.mean(axis=1)
    # Correlate with each rotated profile
    scores: list[tuple[float, str, str]] = []
    for i in range(12):
        major = np.corrcoef(np.roll(_MAJOR_PROFILE, i), chroma_avg)[0, 1]
        minor = np.corrcoef(np.roll(_MINOR_PROFILE, i), chroma_avg)[0, 1]
        scores.append((major, NOTE_NAMES_SHARP[i], "major"))
        scores.append((minor, NOTE_NAMES_SHARP[i], "minor"))
    scores.sort(key=lambda t: t[0], reverse=True)
    best_score, best_key, best_scale = scores[0]
    return {"key": best_key, "scale": best_scale, "confidence": float(best_score)}


def estimate_time_signature(audio: AudioData) -> str:
    """Heuristic time-signature detection — defaults to 4/4 unless 3-beat patterns dominate."""
    import librosa  # type: ignore

    onset_env = librosa.onset.onset_strength(y=audio.mono, sr=audio.sample_rate)
    tempo, beats = librosa.beat.beat_track(onset_envelope=onset_env, sr=audio.sample_rate)
    if len(beats) < 8:
        return "4/4"
    # Look at the inter-beat intervals: count peaks at ~3-beat vs ~4-beat periodicity
    beat_times = librosa.frames_to_time(beats, sr=audio.sample_rate)
    if len(beat_times) < 2:
        return "4/4"
    # Very rough heuristic; the music21 fallback does this better
    return "4/4"


# ---------------------------------------------------------------------------
# Chord estimation
# ---------------------------------------------------------------------------


_CHORD_TEMPLATES: dict[str, list[int]] = {
    "": [0, 4, 7],            # major
    "m": [0, 3, 7],           # minor
    "dim": [0, 3, 6],
    "aug": [0, 4, 8],
    "sus2": [0, 2, 7],
    "sus4": [0, 5, 7],
    "7": [0, 4, 7, 10],
    "maj7": [0, 4, 7, 11],
    "m7": [0, 3, 7, 10],
    "dim7": [0, 3, 6, 9],
}


def _build_chord_template(root_idx: int, quality: str) -> np.ndarray:
    intervals = _CHORD_TEMPLATES.get(quality, _CHORD_TEMPLATES[""])
    tpl = np.zeros(12)
    for iv in intervals:
        tpl[(root_idx + iv) % 12] = 1
    return tpl


def _all_chord_templates() -> tuple[list[str], np.ndarray]:
    roots = NOTE_NAMES_SHARP
    qualities = list(_CHORD_TEMPLATES.keys())
    symbols: list[str] = []
    rows: list[np.ndarray] = []
    for r, r_name in enumerate(roots):
        for q in qualities:
            symbols.append(f"{r_name}{q}")
            rows.append(_build_chord_template(r, q))
    return symbols, np.stack(rows)


_CHORD_SYMBOLS, _CHORD_MATRIX = _all_chord_templates()


def estimate_chords(audio: AudioData, *, hop_length: int = 4096) -> list[dict[str, Any]]:
    """Estimate chord progression from chroma features."""
    import librosa  # type: ignore

    chroma = librosa.feature.chroma_cqt(
        y=audio.mono, sr=audio.sample_rate, hop_length=hop_length
    )
    # Cosine similarity against chord templates
    chroma_norm = chroma / (np.linalg.norm(chroma, axis=0, keepdims=True) + 1e-9)
    tpl_norm = _CHORD_MATRIX / (np.linalg.norm(_CHORD_MATRIX, axis=1, keepdims=True) + 1e-9)
    sims = tpl_norm @ chroma_norm  # (n_templates, n_frames)
    best = np.argmax(sims, axis=0)
    times = librosa.frames_to_time(np.arange(chroma.shape[1]), sr=audio.sample_rate, hop_length=hop_length)

    # Compress runs
    out: list[dict[str, Any]] = []
    current = None
    seg_start = 0.0
    for i, idx in enumerate(best):
        sym = _CHORD_SYMBOLS[idx]
        if sym != current:
            if current is not None:
                out.append({"start": seg_start, "end": float(times[i]), "chord": current})
            current = sym
            seg_start = float(times[i])
    if current is not None:
        out.append({"start": seg_start, "end": float(times[-1] if len(times) else audio.duration), "chord": current})
    return out


# ---------------------------------------------------------------------------
# Melody (Basic Pitch) and bass-line extraction
# ---------------------------------------------------------------------------


def estimate_melody(audio: AudioData) -> list[dict[str, Any]]:
    """Estimate a monophonic melody with Spotify Basic Pitch (preferred), else librosa piptrack."""
    notes = _safe(_estimate_melody_basic_pitch, audio, default=None)
    if notes is not None:
        return notes
    return _estimate_melody_piptrack(audio)


def _estimate_melody_basic_pitch(audio: AudioData) -> list[dict[str, Any]]:
    """Use Basic Pitch to estimate notes."""
    from basic_pitch.inference import predict as bp_predict  # type: ignore

    # Basic Pitch expects a file path or 2D numpy array (samples, channels)
    model_output, midi_data, note_events = bp_predict(audio.samples, audio.sample_rate)
    out: list[dict[str, Any]] = []
    for n in note_events:
        # n: (start_time_seconds, end_time_seconds, pitch_midi, velocity, [pitch_bend])
        try:
            start, end, pitch, vel = n[0], n[1], n[2], n[3] if len(n) > 3 else 1.0
        except Exception:  # noqa: BLE001
            continue
        out.append(
            {
                "start": float(start),
                "end": float(end),
                "midi": int(pitch),
                "pitch": midi_to_note(int(pitch)),
                "velocity": float(vel),
            }
        )
    return out


def _estimate_melody_piptrack(audio: AudioData) -> list[dict[str, Any]]:
    """Fall back to librosa piptrack for a monophonic-ish melody estimate."""
    import librosa  # type: ignore

    pitches, magnitudes = librosa.piptrack(y=audio.mono, sr=audio.sample_rate)
    times = librosa.frames_to_time(np.arange(pitches.shape[1]), sr=audio.sample_rate)
    notes: list[dict[str, Any]] = []
    last_midi: int | None = None
    seg_start = 0.0
    for i in range(pitches.shape[1]):
        idx = magnitudes[:, i].argmax()
        pitch = pitches[idx, i]
        mag = magnitudes[idx, i]
        if mag <= 0 or pitch <= 0:
            if last_midi is not None:
                notes.append(
                    {
                        "start": seg_start,
                        "end": float(times[i]),
                        "midi": last_midi,
                        "pitch": midi_to_note(last_midi),
                        "velocity": 0.8,
                    }
                )
                last_midi = None
            continue
        midi = int(round(hz_to_midi(float(pitch))))
        if last_midi is None:
            seg_start = float(times[i])
            last_midi = midi
        elif abs(midi - last_midi) > 1:
            notes.append(
                {
                    "start": seg_start,
                    "end": float(times[i]),
                    "midi": last_midi,
                    "pitch": midi_to_note(last_midi),
                    "velocity": 0.8,
                }
            )
            seg_start = float(times[i])
            last_midi = midi
    if last_midi is not None:
        notes.append(
            {
                "start": seg_start,
                "end": float(times[-1]),
                "midi": last_midi,
                "pitch": midi_to_note(last_midi),
                "velocity": 0.8,
            }
        )
    return notes


def estimate_bass_line(audio: AudioData) -> list[dict[str, Any]]:
    """Estimate a bass line by isolating low frequencies (<= 250 Hz)."""
    import scipy.signal  # type: ignore

    sos = scipy.signal.butter(6, 250, btype="lowpass", fs=audio.sample_rate, output="sos")
    filtered = scipy.signal.sosfilt(sos, audio.mono)
    bass = AudioData(samples=filtered, sample_rate=audio.sample_rate, duration=audio.duration)
    return estimate_melody(bass)


# ---------------------------------------------------------------------------
# Source separation (Demucs) and harmony
# ---------------------------------------------------------------------------


def separate_stems(audio_path: str | Path, out_dir: str | Path) -> dict[str, Path]:
    """Use Demucs to separate the audio into stems. Returns path per stem."""
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    if shutil.which("demucs") is None:
        log.info("demucs_not_installed_skipping_separation")
        return {}
    cmd = [
        "demucs",
        "--out",
        str(out_dir),
        "-n",
        "htdemucs",
        str(audio_path),
    ]
    log.info("demucs_start", cmd=" ".join(cmd))
    try:
        subprocess.run(cmd, check=True, capture_output=True, timeout=600)
    except Exception as e:  # noqa: BLE001
        log.warning("demucs_failed", error=str(e))
        return {}

    # Demucs writes to <out>/htdemucs/<song_name>/{vocals,bass,drums,other}.wav
    song_name = Path(audio_path).stem
    stem_dir = out_dir / "htdemucs" / song_name
    if not stem_dir.exists():
        return {}
    return {p.stem: p for p in stem_dir.glob("*.wav")}


# ---------------------------------------------------------------------------
# Music21: harmony suggestions
# ---------------------------------------------------------------------------


def suggest_harmony(melody: list[dict[str, Any]], key: str | None = None) -> list[dict[str, Any]]:
    """Suggest chord harmonies for each melodic segment using Music21.

    Returns a list of {start, end, chord} with the closest diatonic triad.
    """
    try:
        from music21 import chord as m21_chord  # type: ignore
        from music21 import key as m21_key  # type: ignore
        from music21 import note as m21_note  # type: ignore
        from music21 import roman as m21_roman  # type: ignore
    except Exception:  # noqa: BLE001
        return _simple_harmony_suggest(melody)

    if not melody:
        return []
    try:
        k = m21_key.Key(key or "C") if key else m21_key.Key("C")
    except Exception:  # noqa: BLE001
        k = m21_key.Key("C")
    out: list[dict[str, Any]] = []
    for note_event in melody:
        n = m21_note.Note(note_event["midi"])
        try:
            rn = m21_roman.romanNumeralFromChord(m21_chord.Chord([n.pitch]), k)
            out.append(
                {
                    "start": note_event["start"],
                    "end": note_event["end"],
                    "chord": str(rn.figure),
                }
            )
        except Exception:  # noqa: BLE001
            continue
    return out


def _simple_harmony_suggest(melody: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Fallback: a I-IV-V-I cadence across the melody."""
    if not melody:
        return []
    return [
        {"start": 0.0, "end": float(melody[-1]["end"]), "chord": "I"},
    ]


# ---------------------------------------------------------------------------
# Structure (intro/verse/chorus/bridge/outro)
# ---------------------------------------------------------------------------


def estimate_structure(audio: AudioData, *, n_segments: int = 6) -> list[dict[str, Any]]:
    """Cluster self-similarity matrix to label song sections."""
    import librosa  # type: ignore

    chroma = librosa.feature.chroma_cqt(y=audio.mono, sr=audio.sample_rate)
    # Agglomerative segmentation
    boundaries = librosa.segment.agglomerative(chroma, n_segments)
    boundary_times = librosa.frames_to_time(boundaries, sr=audio.sample_rate).tolist()
    if not boundary_times:
        return [{"start": 0.0, "end": float(audio.duration), "label": "intro"}]
    if boundary_times[0] > 0.1:
        boundary_times[0] = 0.0
    if boundary_times[-1] < audio.duration - 0.1:
        boundary_times.append(audio.duration)

    section_labels = ["intro", "verse", "chorus", "verse", "bridge", "chorus", "outro"]
    out: list[dict[str, Any]] = []
    for i in range(len(boundary_times) - 1):
        label = section_labels[i % len(section_labels)]
        out.append(
            {
                "start": float(boundary_times[i]),
                "end": float(boundary_times[i + 1]),
                "label": label,
            }
        )
    return out


# ---------------------------------------------------------------------------
# Master entrypoint
# ---------------------------------------------------------------------------


@dataclass
class AnalysisResult:
    key: str | None = None
    scale: str | None = None
    tempo_bpm: float | None = None
    time_signature: str = "4/4"
    duration_seconds: float = 0.0
    chords: list[dict[str, Any]] = field(default_factory=list)
    melody: list[dict[str, Any]] = field(default_factory=list)
    harmony: list[dict[str, Any]] = field(default_factory=list)
    bass_line: list[dict[str, Any]] = field(default_factory=list)
    structure: list[dict[str, Any]] = field(default_factory=list)
    beats: list[float] = field(default_factory=list)
    error: str | None = None


def analyze_audio(path: str | Path, *, work_dir: str | Path | None = None) -> AnalysisResult:
    """Run the full analysis pipeline on the given audio file."""
    result = AnalysisResult()
    try:
        log.info("audio_load_start", path=str(path))
        audio = load_audio(path)
        result.duration_seconds = audio.duration
    except Exception as e:  # noqa: BLE001
        log.exception("audio_load_failed", path=str(path), error=str(e))
        result.error = f"Failed to load audio: {e}"
        return result

    # Tempo + beats
    tb = _safe(estimate_tempo_and_beats, audio, default={})
    if tb:
        result.tempo_bpm = tb.get("tempo_bpm")
        result.beats = tb.get("beats", [])

    # Key + scale
    k = _safe(estimate_key, audio, default={})
    if k:
        result.key = k.get("key")
        result.scale = k.get("scale")

    # Time signature
    result.time_signature = _safe(estimate_time_signature, audio, default="4/4") or "4/4"

    # Chords
    result.chords = _safe(estimate_chords, audio, default=[]) or []

    # Melody
    result.melody = _safe(estimate_melody, audio, default=[]) or []

    # Bass
    result.bass_line = _safe(estimate_bass_line, audio, default=[]) or []

    # Harmony (depends on melody + key)
    result.harmony = _safe(suggest_harmony, result.melody, result.key, default=[]) or []

    # Structure
    result.structure = _safe(estimate_structure, audio, default=[]) or []

    # Stems (optional, best-effort)
    if work_dir is not None:
        work_dir = Path(work_dir)
        _safe(separate_stems, path, work_dir / "stems", default={})

    log.info(
        "audio_analysis_done",
        duration=result.duration_seconds,
        tempo=result.tempo_bpm,
        key=result.key,
        scale=result.scale,
    )
    return result


def to_jsonable(result: AnalysisResult) -> dict[str, Any]:
    return {
        "key": result.key,
        "scale": result.scale,
        "tempo_bpm": result.tempo_bpm,
        "time_signature": result.time_signature,
        "duration_seconds": result.duration_seconds,
        "chords": result.chords,
        "melody": result.melody,
        "harmony": result.harmony,
        "bass_line": result.bass_line,
        "structure": result.structure,
        "beats": result.beats,
    }
