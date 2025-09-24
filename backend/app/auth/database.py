from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv
import os

# Load .env file - try multiple paths to be flexible
# First try from current working directory, then try relative to this file
load_dotenv()  # Try current directory first
if not os.getenv('DB_URL'):
    # If not found, try from the backend directory (where this app structure suggests .env should be)
    current_file = os.path.abspath(__file__)
    backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(current_file)))
    env_path = os.path.join(backend_dir, '.env')
    load_dotenv(env_path)

DATABASE_URL = os.getenv('DB_URL')
connect_args = {
    "sslmode": "require",
    "keepalives": 1,
    "keepalives_idle": 30,
    "keepalives_interval": 10,
    "keepalives_count": 5,
    # Disable channel binding to avoid issues with some poolers
    "channel_binding": "disable",
}

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=5,
    max_overflow=10,
    connect_args=connect_args,
)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base = declarative_base()

def get_db():
    from fastapi import Depends
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
