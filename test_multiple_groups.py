#!/usr/bin/env python3
"""
Test script to verify that devices can belong to multiple groups properly
"""
import requests
import json

# API Base URL
API_BASE = "http://localhost:8000"

def test_multiple_groups():
    print("🧪 Testing Multiple Group Membership")
    print("=" * 50)
    
    try:
        # Test the groups endpoint
        print("\n1. Fetching current groups...")
        response = requests.get(f"{API_BASE}/groups/")
        if response.status_code == 200:
            groups = response.json()
            print(f"   Found {len(groups)} groups")
            for group in groups:
                device_count = len(group.get('devices', []))
                print(f"   📦 {group['group_name']}: {device_count} devices")
                for device in group.get('devices', []):
                    print(f"      - {device['device_name']} ({device['ip_address']})")
        else:
            print(f"   ❌ Error fetching groups: {response.status_code}")
            print(f"   Response: {response.text}")
            return
            
        # Test test endpoint
        print("\n2. Testing /test/deployments endpoint...")
        response = requests.get(f"{API_BASE}/test/deployments")
        if response.status_code == 200:
            deployments = response.json()
            print(f"   ✅ Test endpoint working: {len(deployments)} deployments")
        else:
            print(f"   ❌ Test endpoint error: {response.status_code}")
            print(f"   Response: {response.text}")
            
        # Test devices endpoint
        print("\n3. Fetching devices...")
        response = requests.get(f"{API_BASE}/devices/")
        if response.status_code == 200:
            devices = response.json()
            print(f"   Found {len(devices)} devices")
            for device in devices[:3]:  # Show first 3
                print(f"   💻 {device['device_name']} ({device['ip_address']})")
        else:
            print(f"   ❌ Error fetching devices: {response.status_code}")
            
        print("\n✅ Multiple group membership test completed!")
        
    except requests.exceptions.ConnectionError:
        print("❌ Connection error. Make sure the backend server is running on http://localhost:8000")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

if __name__ == "__main__":
    test_multiple_groups()