"""Redis client (singleton)."""
from __future__ import annotations

from functools import lru_cache

import redis

from app.core.config import get_settings


@lru_cache(maxsize=1)
def get_redis() -> redis.Redis:
    """Return a process-wide Redis client."""
    s = get_settings()
    return redis.Redis.from_url(s.redis_url, decode_responses=True)
