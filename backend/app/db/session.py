from contextlib import contextmanager

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    echo=True,
    future=True
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def translate_integrity_error(db: Session, message: str):
    """Roll back and raise a 409 with `message` if the wrapped block hits a DB constraint violation."""
    try:
        yield
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, message) from exc