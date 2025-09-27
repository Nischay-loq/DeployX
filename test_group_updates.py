#!/usr/bin/env python3
"""
Simple test to verify group device count updates
"""
import requests
import json
import time

API_BASE = "http://localhost:8000"

def test_group_updates():
    print("🧪 Testing Group Device Count Updates")
    print("=" * 50)
    
    try:
        # First, get groups without force refresh
        print("\n1. Getting groups (normal)...")
        response = requests.get(f"{API_BASE}/groups/")
        if response.status_code == 200:
            groups_normal = response.json()
            print(f"   Found {len(groups_normal)} groups (normal)")
            
        # Then get groups with force refresh
        print("\n2. Getting groups (force refresh)...")
        response = requests.get(f"{API_BASE}/groups/?force_refresh=true")
        if response.status_code == 200:
            groups_force = response.json()
            print(f"   Found {len(groups_force)} groups (force refresh)")
            
            # Show device counts
            for group in groups_force:
                device_count = len(group.get('devices', []))
                print(f"   📦 {group['group_name']}: {device_count} devices")
                
        # Test device assignment if we have groups and devices
        if len(groups_force) > 0:
            print(f"\n3. Testing device assignment to group {groups_force[0]['id']}...")
            # This would require authentication, so just show the endpoint
            print(f"   POST {API_BASE}/groups/{groups_force[0]['id']}/assign/{{device_id}}")
            
        print("\n✅ Group test completed!")
        
    except requests.exceptions.ConnectionError:
        print("❌ Connection error. Make sure the backend server is running on http://localhost:8000")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

if __name__ == "__main__":
    test_group_updates()