# Deployment

This guide covers deploying HarmonyHub to a Linux host (Ubuntu 22.04+ assumed) using Docker Compose. For Kubernetes, use the published GHCR images and adapt the compose file.

## 1. Build the images

The repo ships with `Dockerfile` for both apps. You can build them locally or pull from GHCR on tagged releases.

```bash
# Local builds
docker compose build

# Or from the registry (after pushing a tag)
docker pull ghcr.io/<owner>/harmonyhub-api:latest
docker pull ghcr.io/<owner>/harmonyhub-web:latest
```

## 2. Configure environment

Copy `.env.example` to `.env` and fill in real values. Key production-only concerns:

* `ENVIRONMENT=production` — disables verbose error responses and enables JSON logging.
* `JWT_SECRET` — generate with `openssl rand -base64 48`. Rotate quarterly.
* `FIREBASE_CREDENTIALS_PATH` — set to the path of your service-account JSON (mount as a secret).
* `DATABASE_URL` — point at a managed Postgres. Use the `postgresql+psycopg://` URL form.
* `REDIS_URL` — point at a managed Redis (Upstash, ElastiCache, etc.).
* `CORS_ORIGINS` — comma-separated list of allowed origins.

## 3. Required secrets

| Secret                  | Where to set it                            |
|-------------------------|---------------------------------------------|
| `JWT_SECRET`            | `.env` (or k8s `Secret`)                    |
| Firebase service account | `secrets/firebase-service-account.json`     |
| `DATABASE_URL` password | Inside `DATABASE_URL` itself                |
| `REDIS_URL` password    | Inside `REDIS_URL`                          |

## 4. Boot the stack

```bash
docker compose --env-file .env.production up -d
docker compose exec api alembic upgrade head
docker compose exec api python -m scripts.seed
```

Verify:

* `curl http://localhost:8000/healthz` → `{"status":"ok"}`
* `curl http://localhost:3000/` → 200 with the app HTML

## 5. Reverse proxy & TLS

Terminate TLS at nginx, Caddy, or a managed load balancer. Example Caddyfile:

```
api.yourdomain.com {
  reverse_proxy harmonyhub-api:8000
}
app.yourdomain.com {
  reverse_proxy harmonyhub-web:3000
}
```

Make sure the proxy sets `X-Forwarded-Proto` and `X-Real-IP` so FastAPI's `ProxyHeadersMiddleware` can trust them. The default uvicorn command includes `--proxy-headers` and `--forwarded-allow-ips=*`.

## 6. Backups

* **Postgres**: enable automated daily snapshots via your provider. We use WAL-G in production.
* **Uploads**: the `api_data` volume holds user uploads. Sync to S3 with `rclone sync /data/uploads s3://bucket/`.

## 7. Observability

* **Logs** — already structured via structlog. Ship to your log aggregator (CloudWatch, Loki, Datadog).
* **Metrics** — add `prometheus-fastapi-instrumentator` and scrape `:8000/metrics`.
* **Tracing** — add OpenTelemetry to FastAPI and the browser. Set `OTEL_EXPORTER_OTLP_ENDPOINT` in `.env`.

## 8. CI/CD

Two workflows ship with the repo:

* `.github/workflows/ci.yml` — runs on every push & PR. Tests backend and frontend, builds images.
* `.github/workflows/deploy.yml` — runs on version tags (`v*.*.*`). Builds and pushes images to GHCR.

Add the following secrets to enable deploys:

| Secret                | Purpose                                |
|-----------------------|------------------------------------------|
| `GITHUB_TOKEN`        | (auto) push to GHCR                     |

## 9. Scaling

* The web tier is stateless — scale horizontally behind a load balancer.
* The API can also scale horizontally as long as it has a writable Postgres and a shared Redis. Beware: the audio analyzer holds Python in memory; for high concurrency, run it in a dedicated worker pool (Celery).
* Postgres read replicas can serve the song catalog. Use SQLAlchemy with `read_write_splitting` or a custom routing session.

## 10. Security checklist

- [ ] `ENVIRONMENT=production` and `JWT_SECRET` is high-entropy
- [ ] Firebase service-account JSON is mounted read-only
- [ ] All secrets are in env, never in code
- [ ] Postgres is on a private network
- [ ] TLS is terminated at the proxy with HSTS enabled
- [ ] Rate limiting is on (add `slowapi` or run behind Cloudflare)
- [ ] CORS is restricted to your domains
- [ ] Firebase authorized domains include only your production hostname
- [ ] Backups are tested monthly
