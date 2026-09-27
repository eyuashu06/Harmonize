"""Cross-dialect type helpers for SQLite/PostgreSQL compatibility.

PostgreSQL's SQLAlchemy psycopg dialect renders an explicit ``::TYPE`` cast for
every bound parameter (``render_bind_cast``), so the *dialect* type produced by
each decorator decides whether the statement is accepted. Each helper therefore
maps to its native PostgreSQL type on PostgreSQL and to TEXT on SQLite.
"""
from __future__ import annotations

import json
import uuid
from typing import Any

from sqlalchemy import String, TypeDecorator, types
from sqlalchemy.dialects import postgresql


def _as_uuid(value: Any) -> uuid.UUID:
    return value if isinstance(value, uuid.UUID) else uuid.UUID(str(value))


class CompatUUID(TypeDecorator):
    """UUID type that works on both PostgreSQL and SQLite.

    On PostgreSQL it maps to the native ``uuid`` column type and binds a real
    ``uuid.UUID``. Binding a plain ``str`` instead makes SQLAlchemy cast the
    parameter to ``character varying``, which PostgreSQL then refuses to assign
    to a ``uuid`` column. On SQLite it stores as a 36-char string.
    """

    impl = String(36)
    cache_ok = True

    def load_dialect_impl(self, dialect: Any) -> types.TypeEngine[Any]:
        if dialect.name == "postgresql":
            return dialect.type_descriptor(postgresql.UUID(as_uuid=True))
        return dialect.type_descriptor(String(36))

    def process_bind_param(self, value: Any, dialect: Any) -> Any:
        if value is None:
            return None
        value = _as_uuid(value)
        return value if dialect.name == "postgresql" else str(value)

    def process_result_value(self, value: Any, dialect: Any) -> uuid.UUID | None:
        if value is None:
            return None
        return _as_uuid(value)


class _JsonBase(TypeDecorator):
    """Shared implementation for JSON document columns (``jsonb`` on PostgreSQL)."""

    impl = String
    cache_ok = True

    def load_dialect_impl(self, dialect: Any) -> types.TypeEngine[Any]:
        if dialect.name == "postgresql":
            return dialect.type_descriptor(postgresql.JSONB())
        return dialect.type_descriptor(String)

    def process_bind_param(self, value: Any, dialect: Any) -> str | None:
        if value is None:
            return None
        return json.dumps(value)

    @staticmethod
    def _decode(value: Any) -> Any:
        # PostgreSQL drivers may already decode jsonb into a Python object.
        if isinstance(value, list | dict):
            return value
        return json.loads(value)


class JsonList(_JsonBase):
    """Stores a list as JSON. Works on both SQLite and PostgreSQL."""

    def process_result_value(self, value: Any, dialect: Any) -> list | None:
        if value is None:
            return None
        return self._decode(value)


class JsonDictList(_JsonBase):
    """Stores a list of dicts (or a single dict) as JSON. Works on SQLite and PostgreSQL."""

    def process_result_value(self, value: Any, dialect: Any) -> list | dict | None:
        if value is None:
            return None
        return self._decode(value)


class _JsonArrayBase(TypeDecorator):
    """Ordered collection stored as TEXT/JSON on SQLite and ARRAY on PostgreSQL."""

    impl = String
    cache_ok = True
    item_type: types.TypeEngine[Any] = String()

    def load_dialect_impl(self, dialect: Any) -> types.TypeEngine[Any]:
        if dialect.name == "postgresql":
            return dialect.type_descriptor(postgresql.ARRAY(self.item_type))
        return dialect.type_descriptor(String)

    @staticmethod
    def _decode(value: Any) -> list[Any]:
        if isinstance(value, str):
            return json.loads(value)
        return list(value)


class CompatTextArray(_JsonArrayBase):
    """Array of strings: ``varchar[]`` on PostgreSQL, JSON text on SQLite."""

    item_type = String()

    def process_bind_param(self, value: Any, dialect: Any) -> Any:
        if value is None:
            return None
        if dialect.name == "postgresql":
            return [str(v) for v in value]
        return json.dumps([str(v) for v in value])

    def process_result_value(self, value: Any, dialect: Any) -> list[str] | None:
        if value is None:
            return None
        return [str(v) for v in self._decode(value)]


class CompatIntArray(_JsonArrayBase):
    """Array of integers: ``integer[]`` on PostgreSQL, JSON text on SQLite."""

    item_type = types.Integer()

    def process_bind_param(self, value: Any, dialect: Any) -> Any:
        if value is None:
            return None
        if dialect.name == "postgresql":
            return [int(v) for v in value]
        return json.dumps([int(v) for v in value])

    def process_result_value(self, value: Any, dialect: Any) -> list[int] | None:
        if value is None:
            return None
        return [int(v) for v in self._decode(value)]


class CompatUuidArray(_JsonArrayBase):
    """Array of UUIDs: ``uuid[]`` on PostgreSQL, JSON text on SQLite."""

    item_type = postgresql.UUID(as_uuid=True)

    def process_bind_param(self, value: Any, dialect: Any) -> Any:
        if value is None:
            return None
        if dialect.name == "postgresql":
            return [_as_uuid(v) for v in value]
        return json.dumps([str(_as_uuid(v)) for v in value])

    def process_result_value(self, value: Any, dialect: Any) -> list[uuid.UUID] | None:
        if value is None:
            return None
        return [_as_uuid(v) for v in self._decode(value)]
