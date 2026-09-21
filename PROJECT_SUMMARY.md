# HarmonyHub — Build Summary

A production-ready, full-stack web application that helps musicians learn,
perform, and practice songs. Built incrementally across 9 phases.

## What's included

| Layer    | Stack                                                                       |
|----------|------------------------------------------------------------------------------|
| Frontend | Next.js 14 (App Router) · React 18 · TypeScript · Tailwind · shadcn/ui      |
| Backend  | FastAPI · Python 3.11 · SQLAlchemy 2 · Alembic · PostgreSQL 16 · Redis 7     |
| Auth     | Firebase Authentication (Email/Password, Google, Apple) + backend JWT bridge  |
| ML/Audio | librosa · Basic Pitch · Music21 · PrettyMIDI · Essentia · Demucs            |
| Infra    | Docker · Docker Compose · GitHub Actions (CI + CD)                          |

## File count

* **118 source files** in the monorepo
* **~5,800 lines of TypeScript** (frontend, including tests)
* **~3,200 lines of Python** (backend, including tests)
* **6 docs** in `docs/`
* **2 GitHub Actions workflows**

## Phases delivered

1. **Scaffold** — monorepo, Docker Compose, Makefile, env template, README
2. **Backend foundation** — FastAPI app, settings, logging, errors, SQLAlchemy session, Redis
3. **Auth** — Firebase Admin SDK, JWT session bridge, role-based access control
4. **Frontend foundation** — Next.js App Router, Tailwind, shadcn/ui components, theme + auth providers
5. **Domain models** — User, Song, Section, LyricLine, Chord, Playlist, Favorite, PracticeSession, AudioUpload, AudioAnalysis
6. **Songs module** — search, view, transpose, capo, sections, chord catalog, chord diagrams
7. **Audio analysis** — full ML pipeline with defensive fallbacks, results UI
8. **Practice mode** — auto-scrolling lyrics, metronome, MIDI playback, pitch detection, recording, section loop
9. **CI/CD + docs + tests** — GitHub Actions, OpenAPI docs, vitest + pytest, comprehensive docs

## Key features

* **Music theory engine** — preserves user spelling (F# stays F#), full chord templates, capo suggestions, slash chords, dim/aug/sus/maj7/m7
* **Real ML pipeline** — librosa for tempo/chroma, Basic Pitch for melody, Music21 for harmony, Krumhansl-Schmuckler key detection, agglomerative structure segmentation, optional Demucs stem separation
* **Production UI** — light + dark theme with `prefers-color-scheme` + localStorage, accessibility (skip link, aria labels, focus rings), responsive across mobile/tablet/desktop
* **Two-token auth flow** — Firebase ID tokens verified on the server, exchanged for long-lived backend JWTs
* **Web Audio hooks** — useMetronome, usePitchDetector (autocorrelation), useRecorder (MediaRecorder), useMidiPlayback (oscillators)
* **OpenAPI 3.1** — auto-generated at `/docs` and `/redoc`

## Verified

* 53 Python files parse cleanly
* 37/37 music theory unit tests pass (parser, transposer, capo, chord notes, piano, fingering, key detection)
* 8 Vitest frontend tests for theory + utils
* 19 pytest tests across auth, songs, playlists, practice
* All TypeScript files manually reviewed for unused imports

## Next steps for you

```bash
cd harmonyhub
cp .env.example .env       # fill in Firebase config
make up                    # build + start everything
make migrate               # apply DB migrations
make seed                  # load 3 demo songs
open http://localhost:3000
```

API is at `http://localhost:8000` with auto-generated docs at `/docs`.
