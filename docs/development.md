# Development

## Repo layout

```
harmonyhub/
├── apps/
│   ├── api/                # FastAPI backend
│   │   ├── app/            # Application code
│   │   │   ├── api/        # Router aggregation
│   │   │   ├── auth/       # Firebase + JWT
│   │   │   ├── audio/      # Upload + ML pipeline
│   │   │   ├── core/       # Settings, security, logging, errors
│   │   │   ├── db/         # SQLAlchemy, Redis
│   │   │   ├── playlists/  # Favorites + playlists
│   │   │   ├── practice/   # Practice history
│   │   │   ├── songs/      # Songs, lyrics, chords, music theory
│   │   │   └── users/      # Profiles
│   │   ├── alembic/        # Migrations
│   │   ├── scripts/        # Seed + ops
│   │   └── tests/          # Pytest
│   └── web/                # Next.js frontend
│       └── src/
│           ├── app/        # App Router routes
│           ├── components/ # UI primitives + providers
│           ├── hooks/      # Web Audio / mic / recorder
│           ├── lib/        # API client, theory, format, firebase
│           ├── styles/     # Tailwind globals
│           └── types/      # Shared TS types
├── docs/                   # This directory
├── .github/workflows/      # CI/CD
├── docker-compose.yml
├── Makefile
└── README.md
```

## Day-to-day commands

```bash
# Bring everything up
make up

# Tail logs
make logs

# Apply migrations
make migrate

# Create a new migration (after editing models)
make revision msg="add audio column"

# Reset the database (DESTRUCTIVE)
make resetdb

# Run the test suites
make api-test
make web-test
```

## Conventions

### Python (backend)

* Type hints **everywhere**. The CI step `ruff` and `mypy` enforce this.
* Public functions get a docstring (one line is fine).
* Errors: raise `AppError` subclasses (`NotFoundError`, `ConflictError`, `AuthError`, `ForbiddenError`, `ValidationError`, `RateLimitError`). The global handler renders them.
* Database access lives in `service.py` per feature. Routers are thin wrappers.
* New features get a `models.py`, `schemas.py`, `service.py`, `router.py`, and `__init__.py`. Register the router in `app/api/__init__.py`.

### TypeScript (frontend)

* `"use client"` is opt-in. Default to server components.
* Forms: **react-hook-form + zod**. Validation schemas live next to the form.
* API calls go through `@/lib/api`. Never `fetch` directly.
* Tailwind utility classes for layout. CSS variables for theme tokens.
* Avoid barrel files (e.g. `index.ts` re-exports) in component folders — they hurt tree-shaking and TS speed.
* Hooks in `src/hooks/` start with `use` and are pure functions of their arguments.

### Database

* All schema changes go in Alembic revisions. Don't `Base.metadata.create_all` in production code.
* Use `selectinload(...)` to eager-load relationships — saves N+1 queries.
* For new columns with non-null data, add them nullable, backfill, then add the constraint in a follow-up migration.

## Adding a feature

Let's say you want to add **tags** to favorites (so users can categorize their favorite songs).

1. **Backend**
   * Add a column `tag` to `Favorite` in `apps/api/app/playlists/models.py`.
   * Create a migration: `make revision msg="add tag to favorites"` then edit the generated file.
   * Add a `Tag` enum to `schemas.py` and a `list_by_tag` function to `service.py`.
   * Wire a route in `router.py` and register it.
   * Add tests in `tests/test_playlists.py`.

2. **Frontend**
   * Add `tag?: string` to `Favorite` in `src/types/index.ts`.
   * Build a `TagFilter` component in `src/features/favorites/`.
   * Wire it into `src/app/favorites/page.tsx`.

3. **CI**
   * Push. The CI workflow will run tests on both backend and frontend. If green, open a PR.

## Testing

### Backend

* `apps/api/tests/test_theory.py` — pure unit tests for the music theory engine.
* `apps/api/tests/test_songs.py` — end-to-end via the FastAPI test client + SQLite in-memory.
* `apps/api/tests/test_auth.py` — JWT roundtrip, route protection, role enforcement.
* `apps/api/tests/test_playlists.py` — favorites + playlist CRUD.
* `apps/api/tests/test_practice.py` — session creation + stats.

Tests use SQLite in-memory; Postgres-specific features (JSONB operators, ARRAY) are abstracted away by SQLAlchemy in the model layer where possible.

### Frontend

We scaffold `vitest` for the web app. Add component tests in `src/components/__tests__/`.

## Debugging tips

* **Logs**: `docker compose logs -f api` for structured JSON; pipe through `jq` for readability.
* **DB shell**: `make db-shell`.
* **Redis shell**: `make redis-shell`.
* **Alembic head**: `docker compose exec api alembic current`.
* **Reset the audio analysis state**: delete the `audio_analyses` rows in Postgres.
