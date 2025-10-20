"""Check MAC addresses in database"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.auth.database import SessionLocal
from app.grouping.models import Device

db = SessionLocal()
try:
    devices = db.query(Device).all()
    print(f"\nTotal devices: {len(devices)}\n")
    
    for device in devices:
        mac_status = "✓ " + device.mac_address if device.mac_address else "✗ NULL"
        print(f"{device.device_name}: {mac_status}")
    
    with_mac = sum(1 for d in devices if d.mac_address)
    print(f"\n✓ WITH MAC: {with_mac}")
    print(f"✗ WITHOUT MAC: {len(devices) - with_mac}")
finally:
    db.close()
