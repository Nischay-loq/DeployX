#!/usr/bin/env python3
import sys
import os
sys.path.append('.')

def test_user_model():
    try:
        from app.auth.database import SessionLocal
        from app.auth.models import User
        
        # Test creating a session and querying
        db = SessionLocal()
        
        # Get all users and show their usernames
        users = db.query(User).all()
        print(f"✅ User model works. Found {len(users)} existing users:")
        for user in users:
            print(f"  - {user.username} ({user.email})")
        
        db.close()
        return True
        
    except Exception as e:
        print(f"❌ User model error: {e}")
        return False

if __name__ == "__main__":
    test_user_model()