#!/usr/bin/env python3
import sys
import os
sys.path.append('.')

from sqlalchemy import create_engine, text

def check_users():
    try:
        # Connect to database directly
        engine = create_engine('sqlite:///./users.db')
        with engine.connect() as conn:
            result = conn.execute(text('SELECT * FROM users'))
            users = [dict(row._mapping) for row in result]
            print(f"Users found: {len(users)}")
            for user in users:
                print(f"  - {user['username']} ({user['email']})")
            return users
    except Exception as e:
        print(f"Error: {e}")
        return []

if __name__ == "__main__":
    check_users()