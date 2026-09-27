"""User schemas."""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserBase(BaseModel):
    display_name: str = Field(min_length=1, max_length=120)
    primary_instrument: str | None = Field(default=None, max_length=32)
    skill_level: str | None = Field(default=None, max_length=16)


class UserCreate(UserBase):
    email: EmailStr


class UserUpdate(BaseModel):
    display_name: str | None = Field(default=None, max_length=120)
    avatar_url: str | None = Field(default=None, max_length=500)
    primary_instrument: str | None = Field(default=None, max_length=32)
    skill_level: str | None = Field(default=None, max_length=16)


class UserOut(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str | None
    avatar_url: str | None
    role: str
    is_active: bool
    created_at: datetime
    last_seen_at: datetime | None
