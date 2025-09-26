#!/usr/bin/env python3
"""
Create test data for groups and devices
"""
import sys
import os
sys.path.append('backend')

from backend.app.auth.database import SessionLocal
from backend.app.grouping.models import DeviceGroup
from backend.app.Devices.models import Device
from backend.app.auth.models import User
from sqlalchemy import text

def create_test_data():
    print("Creating test data...")
    
    try:
        with SessionLocal() as db:
            # Create a test user first
            existing_user = db.query(User).filter(User.username == "testuser").first()
            if not existing_user:
                test_user = User(
                    username="testuser",
                    email="test@example.com",
                    password="$2b$12$LQv3c1yqBwVHxkd0LHAkCOYz6TtxMQJqhN8/LewCMdS3dZVF0oBt."  # "password" hashed
                )
                db.add(test_user)
                db.commit()
                print("✅ Created test user")
            else:
                test_user = existing_user
                print("✅ Test user already exists")
            
            # Create test groups
            existing_groups = db.query(DeviceGroup).count()
            if existing_groups == 0:
                groups = [
                    DeviceGroup(
                        name="Production Servers",
                        description="Production environment servers",
                        device_ids="[]",
                        created_by=test_user.id
                    ),
                    DeviceGroup(
                        name="Development Servers",
                        description="Development environment servers", 
                        device_ids="[]",
                        created_by=test_user.id
                    ),
                    DeviceGroup(
                        name="Database Servers",
                        description="Database servers cluster",
                        device_ids="[]",
                        created_by=test_user.id
                    )
                ]
                
                for group in groups:
                    db.add(group)
                
                db.commit()
                print("✅ Created test groups")
            else:
                print("✅ Groups already exist")
            
            # Create test devices
            existing_devices = db.query(Device).count()
            if existing_devices == 0:
                devices = [
                    Device(
                        name="Web Server 01",
                        ip_address="192.168.1.100",
                        hostname="web01.example.com",
                        status="online",
                        os_type="Linux",
                        arch="x86_64"
                    ),
                    Device(
                        name="Web Server 02", 
                        ip_address="192.168.1.101",
                        hostname="web02.example.com",
                        status="online",
                        os_type="Linux",
                        arch="x86_64"
                    ),
                    Device(
                        name="Database Server",
                        ip_address="192.168.1.200",
                        hostname="db01.example.com", 
                        status="online",
                        os_type="Linux",
                        arch="x86_64"
                    ),
                    Device(
                        name="Dev Server",
                        ip_address="192.168.1.150",
                        hostname="dev01.example.com",
                        status="online", 
                        os_type="Linux",
                        arch="x86_64"
                    )
                ]
                
                for device in devices:
                    db.add(device)
                
                db.commit()
                print("✅ Created test devices")
            else:
                print("✅ Devices already exist")
            
            # Print summary
            total_groups = db.query(DeviceGroup).count()
            total_devices = db.query(Device).count()
            print(f"📊 Total groups: {total_groups}")
            print(f"📊 Total devices: {total_devices}")
            
    except Exception as e:
        print(f"❌ Failed to create test data: {e}")
        return False
    
    return True

if __name__ == "__main__":
    create_test_data()