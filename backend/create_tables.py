#!/usr/bin/env python3
import sys
import os
sys.path.append('.')

from app.auth.database import engine, Base
from app.auth.models import User

def create_tables():
    print("Creating database tables...")
    try:
        # Create all tables
        Base.metadata.create_all(bind=engine)
        print("✅ Tables created successfully")
        
        # Check if tables exist (PostgreSQL syntax)
        from sqlalchemy import text
        with engine.connect() as conn:
            result = conn.execute(text("SELECT tablename FROM pg_tables WHERE schemaname = 'public'"))
            tables = [row[0] for row in result]
            print(f"Tables found: {tables}")
            
    except Exception as e:
        print(f"❌ Error creating tables: {e}")

if __name__ == "__main__":
    create_tables()