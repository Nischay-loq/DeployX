#!/usr/bin/env python3
"""
Database migration script to add password reset tokens table
Run this script to update your database schema
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.auth.database import engine
from app.auth.models import Base

def migrate_database():
    """Create the password reset tokens table"""
    try:
        # Create all tables (this will only create new ones)
        Base.metadata.create_all(bind=engine)
        print("✅ Database migration completed successfully!")
        print("📋 Created table: password_reset_tokens")
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        return False
    return True

if __name__ == "__main__":
    print("🔄 Starting database migration...")
    success = migrate_database()
    if success:
        print("🎉 Migration completed successfully!")
    else:
        print("💥 Migration failed!")
        sys.exit(1)
