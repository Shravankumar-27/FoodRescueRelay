"""Persistent time offset shared by the API and dispatch worker in demo mode."""

from contextlib import contextmanager
from contextvars import ContextVar
from datetime import timedelta

from sqlalchemy import Column, Integer, Table, select, update

from app.db.base import Base

clock = Table(
    "demo_clock", Base.metadata,
    Column("id", Integer, primary_key=True),
    Column("minutes", Integer, nullable=False),
)
offset = ContextVar("demo_clock_offset", default=timedelta())


def enabled(settings):
    return settings.DEMO_MODE and settings.DEMO_CLOCK_ENABLED


def clock_minutes(db):
    return db.scalar(select(clock.c.minutes).where(clock.c.id == 1)) or 0


@contextmanager
def use_demo_clock(db):
    minutes = clock_minutes(db)
    token = offset.set(timedelta(minutes=minutes))
    try:
        yield
    finally:
        offset.reset(token)


def advance(db, minutes):
    result = db.execute(update(clock).where(clock.c.id == 1).values(minutes=clock.c.minutes + minutes))
    if result.rowcount == 0:
        db.execute(clock.insert().values(id=1, minutes=minutes))
