"""
Real-time monitoring of agent registration data
This will show EXACTLY what data the backend receives from agents
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.auth.database import SessionLocal
from app.grouping.models import Device
import json
from datetime import datetime, timedelta

print("=" * 70)
print("AGENT REGISTRATION DATA MONITOR")
print("=" * 70)

# Get the most recently updated device (likely just registered)
db = SessionLocal()
try:
    # Get devices updated in last 5 minutes
    recent_time = datetime.utcnow() - timedelta(minutes=5)
    recent_devices = db.query(Device).filter(
        Device.last_seen >= recent_time
    ).order_by(Device.last_seen.desc()).all()
    
    if not recent_devices:
        print("\nNo recent registrations in the last 5 minutes.")
        print("Run the agent now, then run this script again.")
    else:
        for device in recent_devices:
            print(f"\n{'='*70}")
            print(f"Device: {device.device_name}")
            print(f"Agent ID: {device.agent_id}")
            print(f"Last Seen: {device.last_seen}")
            print(f"Status: {device.status}")
            print("-" * 70)
            print(f"IP Address: {device.ip_address}")
            print(f"MAC Address (DB field): {device.mac_address if device.mac_address else '❌ NULL'}")
            print("-" * 70)
            
            if device.system_info:
                if isinstance(device.system_info, str):
                    sys_info = json.loads(device.system_info)
                else:
                    sys_info = device.system_info
                
                print("System Info Contents:")
                for key, value in sys_info.items():
                    if key == 'mac_address':
                        print(f"  ✓ mac_address: {value}")
                    else:
                        print(f"    {key}: {value if len(str(value)) < 50 else str(value)[:47] + '...'}")
                
                if 'mac_address' not in sys_info:
                    print("  ❌ mac_address: NOT IN SYSTEM_INFO")
            else:
                print("System Info: ❌ NULL or EMPTY")
            
            print(f"\n{'='*70}")
            
            # Diagnosis
            if device.mac_address:
                print("✓ STATUS: MAC address is properly saved!")
            elif device.system_info and sys_info.get('mac_address'):
                print("⚠️  STATUS: MAC in system_info but NOT extracted to mac_address field!")
                print("   → CRUD extraction logic is not working")
            else:
                print("❌ STATUS: Agent is NOT sending MAC address!")
                print("   → Agent code issue or not updated")
    
finally:
    db.close()

print("\n" + "=" * 70)
