from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import get_settings
import os

settings = get_settings()

# Set Oracle environment variables if using Oracle
if settings.database_url.startswith("oracle"):
    if not os.environ.get('TNS_ADMIN'):
        os.environ['TNS_ADMIN'] = '/app/wallet'
    if not os.environ.get('LD_LIBRARY_PATH'):
        os.environ['LD_LIBRARY_PATH'] = '/opt/oracle'

# Create engine with appropriate configuration for Oracle or SQLite
if settings.database_url.startswith("oracle"):
    engine = create_engine(
        settings.database_url,
        pool_pre_ping=True,
        pool_recycle=300,
        pool_size=5,
        max_overflow=10,
        echo=False,
        connect_args={"events": True}
    )
else:
    engine = create_engine(
        settings.database_url,
        pool_pre_ping=True,
        pool_recycle=300,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def test_connection():
    """Test database connection and return status."""
    try:
        with engine.connect() as conn:
            if settings.database_url.startswith("oracle"):
                conn.execute("SELECT 1 FROM dual")
            else:
                conn.execute("SELECT 1")
        print("✅ Database connection successful")
        return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False