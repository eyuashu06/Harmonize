# Architecture

## High-level

```
                ┌─────────────────┐
   Browser ───▶ │  Next.js (web)  │ ───── SWR/REST ─────┐
   (React)      │  shadcn/ui      │                     │
                │  TS + Tailwind  │                     ▼
                └─────────────────┘           ┌────────────────┐
                                              │ FastAPI (api)  │
                                              │  Pydantic v2   │
                                              │  SQLAlchemy 2  │
                                              └────┬──────┬────┘
                                                   │      │
                                            ┌──────▼─┐  ┌─▼──────┐
                                            │Postgres│  │ Redis  │
                                            │ 16     │  │ 7      │
                                            └────────┘  └────────┘
                                                   ▲
                                            ┌──────┴────────┐
                                            │ Firebase Auth │
                                            │ (Email/G/Ap)  │
                                            └───────────────┘
```

## Backend

* **FastAPI** with feature-based modules under `apps/api/app/`. Each feature is a self-contained package with `models.py`, `schemas.py`, `service.py`, `router.py`.
* **SQLAlchemy 2.x** ORM with typed columns. Models use `Mapped[...]` annotations for full type safety.
* **Alembic** for migrations. The initial schema lives at `apps/api/alembic/versions/0001_initial.py`.
* **Pydantic v2** for request/response validation. Settings via `pydantic-settings`.
* **Firebase Admin SDK** verifies ID tokens on the server; the backend issues its own short-lived JWTs to the browser for subsequent API calls.
* **Redis** is used for caching, rate-limiting, and transient job state (audio analysis results).
* **Structlog** for structured logging; JSON output in production, colored console in dev.
* **ML pipeline** is in `app/audio/analyzer.py`. Each stage (tempo, key, chords, melody, harmony, bass, structure, stems) is its own function. The pipeline is defensive: heavy ML deps are imported lazily and fall back to simpler algorithms.

## Frontend

* **Next.js 14 App Router** for SSR, streaming, and per-route code splitting.
* **React Server Components by default**; client components opt in with `"use client"`.
* **Tailwind CSS** with a small set of design tokens (light + dark) defined in `globals.css`.
* **shadcn/ui-style components** in `src/components/ui/` — minimal, copy-pasteable, fully typed.
* **SWR** for client-side data fetching with cache, revalidation, and mutation.
* **React Hook Form + Zod** for typed form validation.
* **Firebase Web SDK** handles the three identity providers. The browser exchanges the Firebase ID token for a backend JWT via `POST /api/v1/auth/session`.
* **Theme** provider reads/writes `localStorage` and respects `prefers-color-scheme` for the default.
* **Audio hooks** in `src/hooks/`: `useMetronome`, `usePitchDetector`, `useRecorder`, `useMidiPlayback`. All use the Web Audio API directly.

## Cross-cutting

* **Auth flow**: Firebase sign-in → ID token → `POST /auth/session` → backend JWT → Authorization header.
* **Validation**: Pydantic on the server, Zod on the client. Schemas are the contract.
* **Error handling**: Application errors extend `AppError`. A single handler converts them to a consistent JSON shape.
* **Logging**: structured logs with `request_id` propagated through the request lifecycle.
* **Testing**: pytest for the backend (unit + integration), Vitest + Testing Library for the frontend.

## Database

PostgreSQL is the source of truth. Schema is migration-driven; new tables go in new revisions.

* `users` — identity
* `songs`, `sections`, `lyric_lines`, `chords` — catalog
* `playlists`, `favorites` — user curation
* `practice_sessions` — history & analytics
* `audio_uploads`, `audio_analyses` — AI pipeline I/O

## Scaling notes

* The audio analyzer is the heaviest workload. It runs synchronously per upload today. For multi-user scale, push it to a Celery/RQ worker.
* The Next.js app is stateless. The Docker image is the deployment artifact.
* Postgres is read-heavy on the song catalog. Add a Redis cache for `/songs?q=...` once traffic warrants it.
* Firebase handles all auth, including password hashing and rate limiting — don't roll your own.
