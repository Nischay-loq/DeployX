#!/usr/bin/env python3
"""
Script to check current table schema and add missing columns
"""
import sys
import os
sys.path.append('backend')

from backend.app.auth.database import engine
from sqlalchemy import text, inspect

def check_schema():
    print("Checking current database schema...")
    
    with engine.connect() as connection:
        inspector = inspect(connection)
        
        # Check device_groups table structure
        if 'device_groups' in inspector.get_table_names():
            print("\n📋 device_groups table columns:")
            columns = inspector.get_columns('device_groups')
            for col in columns:
                print(f"  - {col['name']}: {col['type']}")
        else:
            print("❌ device_groups table doesn't exist")
            
        # Check devices table structure
        if 'devices' in inspector.get_table_names():
            print("\n📋 devices table columns:")
            columns = inspector.get_columns('devices')
            for col in columns:
                print(f"  - {col['name']}: {col['type']}")
        else:
            print("❌ devices table doesn't exist")

def add_missing_columns():
    print("\n🔧 Adding missing columns...")
    
    with engine.connect() as connection:
        try:
            # Add user_id column to device_groups table
            connection.execute(text("""
                ALTER TABLE device_groups 
                ADD COLUMN user_id INTEGER
            """))
            connection.commit()
            print("✅ Added user_id column to device_groups")
            
            # Add foreign key constraint
            connection.execute(text("""
                ALTER TABLE device_groups 
                ADD CONSTRAINT fk_device_groups_user_id 
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            """))
            connection.commit()
            print("✅ Added foreign key constraint for user_id")
            
        except Exception as e:
            print(f"⚠️ Error adding columns: {e}")
            # If column already exists, that's okay
            if "already exists" in str(e):
                print("Column already exists, continuing...")

if __name__ == "__main__":
    check_schema()
    add_missing_columns()
    print("\n🎉 Schema update completed!")