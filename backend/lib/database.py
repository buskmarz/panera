import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

def _default_sqlite_url():
    if os.getenv("NETLIFY") or os.getenv("AWS_LAMBDA_FUNCTION_NAME"):
        # Lambda/Netlify filesystem is read-only except /tmp.
        return "sqlite:////tmp/panera.db"
    return "sqlite:///./panera.db"

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", _default_sqlite_url())

if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    # PostgreSQL
    if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
        SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
