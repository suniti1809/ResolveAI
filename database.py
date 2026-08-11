"""
AIVOA CCMS – database.py
SQLAlchemy async engine + session factory wired to the DATABASE_URL in .env
"""
from __future__ import annotations

import os
from typing import AsyncGenerator

from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

load_dotenv()

DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./qms_complaints.db")

# SQLite async driver requires the +aiosqlite dialect prefix
if DATABASE_URL.startswith("sqlite:///"):
    DATABASE_URL = DATABASE_URL.replace("sqlite:///", "sqlite+aiosqlite:///", 1)

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


class Base(DeclarativeBase):
    """Common declarative base for all ORM models."""


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency: yields an async DB session per request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def init_db() -> None:
    """Create all tables on startup (idempotent) and auto-migrate missing columns."""
    async with engine.begin() as conn:
        from app import models  # noqa: F401 – ensure models are imported
        await conn.run_sync(Base.metadata.create_all)

        # Auto-migrate missing columns for SQLite if DB pre-existed
        if "sqlite" in str(engine.url):
            from sqlalchemy import text
            res = await conn.execute(text("PRAGMA table_info(complaints);"))
            existing_cols = {row[1] for row in res.fetchall()}

            if "origin_site" not in existing_cols:
                await conn.execute(text("ALTER TABLE complaints ADD COLUMN origin_site VARCHAR(200);"))
            if "batch_number" not in existing_cols:
                await conn.execute(text("ALTER TABLE complaints ADD COLUMN batch_number VARCHAR(100);"))
            if "detection_date" not in existing_cols:
                await conn.execute(text("ALTER TABLE complaints ADD COLUMN detection_date DATE;"))

