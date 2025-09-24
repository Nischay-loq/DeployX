#!/usr/bin/env python3
"""
Script to fix the agent table column types from integer to bigint
to handle large memory and disk values.
"""

import os
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def fix_agent_table_columns():
    """Fix the agent table column types"""
    db_url = os.getenv('DB_URL')
    if not db_url:
        print("Error: DB_URL not found in environment variables")
        return False
    
    try:
        # Connect to the database
        print("Connecting to database...")
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        
        # Check if the agents table exists
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'agents'
            );
        """)
        
        if not cur.fetchone()[0]:
            print("Agents table does not exist. Creating new table with correct column types.")
            conn.close()
            return True
        
        print("Agents table exists. Checking current column types...")
        
        # Check current column types
        cur.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'agents' 
            AND column_name IN ('memory_total', 'memory_available', 'disk_total', 'disk_free');
        """)
        
        columns = cur.fetchall()
        print(f"Current column types: {columns}")
        
        # Check if any columns need to be changed
        columns_to_change = []
        for column_name, data_type in columns:
            if data_type == 'integer':
                columns_to_change.append(column_name)
        
        if not columns_to_change:
            print("All columns are already the correct type (bigint).")
            conn.close()
            return True
        
        print(f"Columns that need to be changed: {columns_to_change}")
        
        # Begin transaction
        print("Starting transaction to alter table...")
        
        # Alter each column from integer to bigint
        for column in columns_to_change:
            print(f"Altering column {column} from integer to bigint...")
            cur.execute(f"ALTER TABLE agents ALTER COLUMN {column} TYPE BIGINT;")
        
        # Commit the transaction
        conn.commit()
        print("Successfully altered table columns to bigint.")
        
        # Verify the changes
        cur.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'agents' 
            AND column_name IN ('memory_total', 'memory_available', 'disk_total', 'disk_free');
        """)
        
        new_columns = cur.fetchall()
        print(f"New column types: {new_columns}")
        
        conn.close()
        return True
        
    except psycopg2.Error as e:
        print(f"Database error: {e}")
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        return False
    except Exception as e:
        print(f"Unexpected error: {e}")
        if 'conn' in locals():
            conn.close()
        return False

if __name__ == "__main__":
    print("Fixing agent table column types...")
    success = fix_agent_table_columns()
    if success:
        print("✅ Column types fixed successfully!")
        print("You can now restart your backend server.")
    else:
        print("❌ Failed to fix column types.")
        print("Please check the error messages above.")