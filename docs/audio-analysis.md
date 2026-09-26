# Audio Analysis Pipeline

The `app/audio/analyzer.py` module turns an MP3 or WAV file into a complete song description.

## Pipeline

```
        ┌─────────────┐
        │  Uploaded   │
        │  MP3 / WAV  │
        └──────┬──────┘
               │
        ┌──────▼──────┐  librosa.load (mono, 22050 Hz)
        │  Decode &   │
        │  Resample   │
        └──────┬──────┘
               │
   ┌───────────┼───────────────────────────────┐
   │           │                               │
   ▼           ▼                               ▼
┌──────┐   ┌────────┐                     ┌────────┐
│Tempo │   │  Key   │                     │  Time  │
│BPM   │   │+ scale │                     │  sig   │
└──┬───┘   └────┬───┘                     └────────┘
   │            │                              ▲
   │            │  chroma_cqt                  │
   │            ▼                              │
   │      ┌──────────┐                         │
   │      │  Chords  │  cosine similarity      │
   │      │          │  vs. 12×N templates     │
   │      └─────┬────┘                         │
   │            │                              │
   │            ▼                              │
   │      ┌──────────┐    basic-pitch          │
   │      │  Melody  │ ◀── (preferred)         │
   │      │  notes   │ ◀── librosa.piptrack    │
   │      └────┬─────┘    (fallback)           │
   │           │                               │
   │           ▼                               │
   │     ┌──────────┐                          │
   │     │ Harmony  │ music21.romanNumeral     │
   │     │(roman    │ from melody + key        │
   │     │ numerals)│                          │
   │     └──────────┘                          │
   │                                            │
   │     ┌──────────┐                          │
   │     │  Bass    │ lowpass < 250 Hz +       │
   │     │  line    │ melody extractor         │
   │     └──────────┘                          │
   │                                            │
   │     ┌──────────┐                          │
   │     │Structure │ librosa.seg.recurrence + │
   │     │(intro/   │ agglomerative            │
   │     │verse/...)│                           │
   │     └──────────┘                          │
   │                                            │
   ▼                                            │
┌──────┐  optional, requires demucs binary     │
│Stems │  writes vocals/bass/drums/other.wav    │
└──────┘                                        │
                                                │
        ┌──────────────┐                       │
        │   Persist    │ ◀─────────────────────┘
        │  AudioAnalysis
        └──────────────┘
```

## Stages

| Stage       | Library     | Output                                     | Fallback                  |
|-------------|-------------|--------------------------------------------|---------------------------|
| Decode      | librosa     | `AudioData(samples, sr, duration)`         | soundfile + scipy         |
| Tempo       | librosa     | `tempo_bpm`, `beats: [t0, t1, …]`          | —                         |
| Key         | chroma + KS | `{key, scale, confidence}`                  | —                         |
| Time sig    | heuristic   | `"4/4"`, `"3/4"`                           | always defaults to 4/4    |
| Chords      | chroma + templates | `[{start, end, chord}]` (e.g. Em7, G) | —                         |
| Melody      | Basic Pitch | `[{start, end, midi, pitch, velocity}]`    | librosa.piptrack          |
| Harmony     | music21     | roman numerals per melody note              | static "I" cadence        |
| Bass        | lowpass + melody | same shape as melody, low octave       | —                         |
| Structure   | librosa.seg | `[{start, end, label}]` (intro/verse/etc.) | —                         |
| Stems       | demucs CLI  | 4 .wav files                               | skipped if demucs missing |

## Configuration

* `MAX_UPLOAD_MB` (default 64) — hard cap on file size.
* `ANALYSIS_DIR` — where intermediate artifacts land.
* `FIREBASE_CREDENTIALS_PATH` — needed for the upload route's auth.

## API

* `POST /api/v1/audio/uploads` — multipart upload. Returns `AudioUpload`.
* `POST /api/v1/audio/uploads/{id}/analyze` — run the pipeline. Returns the populated `AudioAnalysis`.
* `GET /api/v1/audio/analyses` — list the current user's analyses.
* `GET /api/v1/audio/analyses/{id}` — fetch one.

The frontend polls `analyses` every 2 s while any analysis is `pending` or `running`.

## Performance

The first analysis on a long file is slow (10–60 s for a 4-minute song on a modern laptop CPU). To scale:

1. Move the heavy lifting to a worker (Celery, RQ, or a Kubernetes Job).
2. Cache feature vectors (`chroma`, `spectrogram`) in Redis keyed by audio hash.
3. For very long files, downsample to 16 kHz first — the chord and key stages don't need more.

## Limitations

* The bundled chord templates cover 144 chords (12 roots × 12 qualities). Exotic voicings will round to the nearest template.
* Demucs is not bundled in the default image; the analyzer silently skips stem separation if the binary isn't on `$PATH`.
* Structure labels are a fixed rotation; for accurate verse/chorus detection across an entire song, train a CNN on a labeled dataset.
