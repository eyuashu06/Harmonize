# syntax=docker/dockerfile:1.7
FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# System deps for audio libs and madmom
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        gcc \
        libsndfile1 \
        ffmpeg \
        git \
        curl \
        libasound2-dev \
        libjack-dev \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
COPY . .
RUN pip install --timeout 120 --retries 10 -e ".[dev]" --no-build-isolation

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=5 \
  CMD python -c "import urllib.request,sys; \
    r=urllib.request.urlopen('http://localhost:8000/healthz'); \
    sys.exit(0 if r.status==200 else 1)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips=*"]
