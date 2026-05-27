from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import settings

ROOT_DATABASE_URL = (
    f"mysql+pymysql://{settings.MYSQL_USER}:{settings.MYSQL_PASSWORD}"
    f"@{settings.MYSQL_HOST}:{settings.MYSQL_PORT}/mysql"
)

DATABASE_URL = (
    f"mysql+pymysql://{settings.MYSQL_USER}:{settings.MYSQL_PASSWORD}"
    f"@{settings.MYSQL_HOST}:{settings.MYSQL_PORT}/{settings.PAYMENT_DB_NAME}"
)

root_engine = create_engine(ROOT_DATABASE_URL, pool_pre_ping=True, pool_recycle=3600)
engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_recycle=3600)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def ensure_database_exists():
    with root_engine.begin() as conn:
        conn.execute(text(f"CREATE DATABASE IF NOT EXISTS `{settings.PAYMENT_DB_NAME}`"))
