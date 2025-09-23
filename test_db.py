#!/usr/bin/env python3
"""
Simple script to test database connectivity and table creation
"""
import sys
import os
sys.path.append('backend')

from backend.app.auth.database import engine, SessionLocal
from backend.app.auth.models import User
from backend.app.grouping.models import DeviceGroup, Device, DeviceGroupMap
from backend.app.Deployments.models import Deployment, DeploymentTarget, Checkpoint
from sqlalchemy import text

def test_database():
    print("Testing database connectivity...")
    
    # Test basic connection
    try:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            print("✅ Database connection successful")
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False
    
    # Test if tables exist
    try:
        with SessionLocal() as db:
            # Test users table
            users = db.query(User).count()
            print(f"✅ Users table exists with {users} records")
            
            # Test device_groups table
            groups = db.query(DeviceGroup).count()
            print(f"✅ Device groups table exists with {groups} records")
            
            # Test devices table
            devices = db.query(Device).count()
            print(f"✅ Devices table exists with {devices} records")
            
            # Test device_group_map table
            mappings = db.query(DeviceGroupMap).count()
            print(f"✅ Device group mappings table exists with {mappings} records")
            
            # Test deployments table
            deployments = db.query(Deployment).count()
            print(f"✅ Deployments table exists with {deployments} records")
            
            # Test deployment_targets table
            targets = db.query(DeploymentTarget).count()
            print(f"✅ Deployment targets table exists with {targets} records")
            
            # Test checkpoints table
            checkpoints = db.query(Checkpoint).count()
            print(f"✅ Checkpoints table exists with {checkpoints} records")
            
    except Exception as e:
        print(f"❌ Table access failed: {e}")
        return False
    
    return True

if __name__ == "__main__":
    success = test_database()
    if success:
        print("\n🎉 All database tests passed!")
    else:
        print("\n💥 Database tests failed!")
    sys.exit(0 if success else 1)