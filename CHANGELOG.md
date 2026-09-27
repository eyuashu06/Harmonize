# Changelog

All notable changes to HarmonyHub are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- `POST /api/v1/auth/session` and `GET /api/v1/users/me` returned `500` when the
  identity provider reported a reserved email domain (`.test`, `.local`,
  `.invalid`, `localhost`); response schemas now echo the stored address instead
  of re-validating it.
- `users.last_seen_at` was never written: the returning-user path assigned the
  class-level SQLAlchemy attribute back onto the instance. It is now stamped on
  both the create and refresh paths.
- Deriving a display name crashed with `AttributeError` when a provider returned
  no `email` claim.
- The API client's fallback base URL was `http://localhost:8000`; the stack
  serves the api on `8001`, so a checkout without `NEXT_PUBLIC_API_URL` failed
  every browser request.
- Removed an unused-variable ESLint warning from `src/lib/theory.ts` so
  `next lint` and `next build` run clean.
- Removed stale `Makefile` entries from `.PHONY`.
- Corrected the documented api port in `README.md`, `PROJECT_SUMMARY.md`, and
  `docs/deployment.md`.

## [0.1.0] — 2026-07-15

### Added

#### Backend (FastAPI)
- Feature-based monorepo layout (`app/<feature>/`)
- Pydantic v2 settings with environment-driven config
- Structured logging via `structlog` (JSON in prod, colored in dev)
- Custom application error hierarchy with global handlers
- SQLAlchemy 2.x ORM with typed `Mapped[...]` columns
- Alembic migrations (initial schema with all 9 tables)
- Redis client (singleton, `lru_cache`)
- Firebase Admin SDK integration with local-JWT fallback
- Two-token auth flow (Firebase ID token → backend JWT)
- Role-based access control via `require_role(...)` dependency
- Music theory engine: parse, transpose, capo, chord notes, fingering
- Open chord catalog for 20+ guitar chord shapes
- Songs API: search, CRUD, transpose with capo suggestion
- Playlists & favorites: full CRUD with per-user access control
- Practice sessions: create, list, aggregate stats
- Audio upload with validation (size, MIME type)
- Audio analysis pipeline: tempo, key, time signature, chords, melody,
  harmony, bass, structure, stems (all defensive with fallbacks)
- Demo seed data (3 songs)
- Pytest suite: theory, songs, auth, playlists, practice

#### Frontend (Next.js 14)
- App Router with server components by default
- Tailwind CSS with light + dark theme tokens
- shadcn/ui-style components: Button, Input, Card, Tabs, Dialog, Slider, Switch, Badge
- SWR for client-side data fetching
- React Hook Form + Zod for typed forms
- Firebase Web SDK integration (Email/Password, Google, Apple)
- Theme provider with `localStorage` persistence + `prefers-color-scheme`
- Auth provider with sign-in / sign-up / sign-out flows
- API client with typed errors and bearer-token injection
- Landing page with feature highlights
- Sign-in / sign-up page (Firebase + social providers)
- Songs listing with search and tag/difficulty filters
- Song detail with synchronized lyrics, chord charts, sections, transpose controls
- Practice mode with auto-scrolling lyrics, metronome, MIDI playback,
  pitch detection, recording, section loop, tempo slider
- Audio analysis page with upload, polling, structure timeline, chord
  progression, melody piano roll, harmony suggestions
- Favorites page
- Profile page with stats, recent sessions, edit form
- Error boundary, loading, and not-found pages
- Accessibility: skip-to-content link, aria-labels, focus-visible ring
- Vitest tests for theory and utils

#### Infrastructure
- Docker Compose for development (api, web, postgres, redis)
- Dockerfiles for both apps (multi-stage builds)
- GitHub Actions CI (lint, typecheck, test, build images)
- GitHub Actions CD on tags (push to GHCR)
- `.env.example` with all required variables
- `Makefile` with common dev commands
- Documentation: architecture, auth, audio analysis, practice mode,
  development, deployment

### Security
- HTTPS-only headers (X-Content-Type-Options, X-Frame-Options, etc.)
- Server-side input validation on every endpoint
- Firebase ID tokens verified with the Admin SDK
- Backend JWTs with configurable expiry and rotation
- File upload size limits and MIME validation
- Role-based route protection
- CORS allowlist driven by env

[Unreleased]: https://github.com/eyuashu06/Harmonize/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/eyuashu06/Harmonize/releases/tag/v0.1.0
