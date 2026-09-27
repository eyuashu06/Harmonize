# HarmonyHub

> A production-ready platform that helps musicians learn, perform, and practice songs with synchronized lyrics, chord charts, audio analysis, and an AI-powered practice studio.

## Stack

| Layer    | Technology                                                                  |
|----------|------------------------------------------------------------------------------|
| Frontend | Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS · shadcn/ui   |
| Backend  | FastAPI · Python 3.11 · SQLAlchemy 2 · Alembic · PostgreSQL 16 · Redis 7     |
| Auth     | Firebase Authentication (Email/Password, Google, Apple) + JWT session bridge |
| ML/Audio | librosa · Basic Pitch (Spotify) · Music21 · PrettyMIDI · Essentia · Demucs   |
| Infra    | Docker · Docker Compose · GitHub Actions                                     |

## Repository layout

```
harmonyhub/
├── apps/
│   ├── web/                     # Next.js frontend
│   │   ├── src/app/             # App Router routes
│   │   ├── src/components/      # Reusable UI primitives
│   │   ├── src/features/        # Feature-based modules
│   │   ├── src/lib/             # API client, utils
│   │   └── src/hooks/           # React hooks
│   └── api/                     # FastAPI backend
│       ├── app/                 # Application code (feature-based)
│       │   ├── core/            # Settings, security, logging, errors
│       │   ├── db/              # SQLAlchemy session, base
│       │   ├── auth/            # Firebase + JWT
│       │   ├── users/           # User profile, roles
│       │   ├── songs/           # Songs, lyrics, chords, transposition
│       │   ├── playlists/       # Favorites & playlists
│       │   ├── practice/        # Practice sessions, history
│       │   ├── audio/           # Audio upload, ML analysis
│       │   └── api/             # Routers aggregation
│       ├── alembic/             # DB migrations
│       ├── tests/               # Pytest suite
│       └── scripts/             # Dev helpers
├── docs/                        # MkDocs-style documentation
├── scripts/                     # One-off ops scripts
├── .github/workflows/           # CI/CD
├── docker-compose.yml
├── Makefile
└── README.md
```

## Quick start

### 1. Prerequisites

* Docker 24+ & Docker Compose v2
* Node.js 20+ (for local frontend dev)
* Python 3.11+ (for local backend dev)
* A Firebase project with Email/Password, Google, and Apple providers enabled

### 2. Configure environment

```bash
cp .env.example .env
# edit .env with your Firebase web config and service-account JSON path
```

### 3. Run with Docker Compose

```bash
make up           # build + start api, web, postgres, redis
make logs         # tail logs
make migrate      # run Alembic migrations
make seed         # (optional) seed demo songs
```

Open:
* Web → http://localhost:3000
* API → http://localhost:8001
* OpenAPI docs → http://localhost:8001/docs
* ReDoc → http://localhost:8001/redoc

### 4. Local development (without Docker)

```bash
# Backend
cd apps/api
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8001

# Frontend (separate terminal)
cd apps/web
pnpm install
pnpm dev
```

## Documentation

* [docs/architecture.md](docs/architecture.md) – system design
* [docs/auth.md](docs/auth.md) – authentication flow
* [docs/audio-analysis.md](docs/audio-analysis.md) – ML pipeline
* [docs/practice-mode.md](docs/practice-mode.md) – practice features
* [docs/deployment.md](docs/deployment.md) – production deploy

## License

MIT
