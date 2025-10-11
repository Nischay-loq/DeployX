"""
EMERGENCY FIX: Directly update MAC addresses from system_info
This bypasses the CRUD and directly extracts MAC from existing system_info
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.auth.database import SessionLocal
from app.grouping.models import Device
import json

print("=" * 70)
print("EMERGENCY MAC ADDRESS FIX")
print("=" * 70)

db = SessionLocal()
updated_count = 0

try:
    devices = db.query(Device).all()
    
    for device in devices:
        if not device.mac_address and device.system_info:
            # Parse system_info
            if isinstance(device.system_info, str):
                sys_info = json.loads(device.system_info)
            else:
                sys_info = device.system_info
            
            mac_address = sys_info.get('mac_address')
            
            if mac_address and mac_address != '00:00:00:00:00:00':
                device.mac_address = mac_address
                print(f"✓ {device.device_name}: {mac_address}")
                updated_count += 1
    
    if updated_count > 0:
        db.commit()
        print(f"\n✓ Updated {updated_count} devices")
    else:
        print("\nNo MAC addresses to extract")
    
finally:
    db.close()

print("=" * 70)
print("DONE")
print("=" * 70)

# Verify
db = SessionLocal()
try:
    devices = db.query(Device).all()
    with_mac = sum(1 for d in devices if d.mac_address)
    print(f"\n✓ Devices WITH MAC: {with_mac}/{len(devices)}")
    
    for device in devices:
        if device.mac_address:
            print(f"  ✓ {device.device_name}: {device.mac_address}")
        else:
            print(f"  ✗ {device.device_name}: NULL")
finally:
    db.close()
