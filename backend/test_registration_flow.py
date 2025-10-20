"""
Test to verify what data the backend receives during agent registration
This will simulate a registration and show exactly what data is being processed
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.agents.schemas import DeviceRegistrationRequest
from app.agents.crud import register_or_update_device
from app.auth.database import SessionLocal
import json

print("=" * 70)
print("BACKEND REGISTRATION TEST")
print("=" * 70)

# Simulate agent registration data (as sent by updated agent)
test_registration_data = {
    'agent_id': 'test_agent_123',
    'machine_id': 'test-machine-id-456',
    'device_name': 'Test-Device',
    'ip_address': '192.168.1.100',
    'mac_address': 'AA:BB:CC:DD:EE:FF',  # Direct MAC address
    'os': 'Windows',
    'shells': ['cmd', 'powershell'],
    'system_info': {
        'hostname': 'Test-Device',
        'os': 'Windows',
        'ip_address': '192.168.1.100',
        'mac_address': 'AA:BB:CC:DD:EE:FF',  # Also in system_info
        'os_version': '10.0.19041',
        'cpu_count': 8,
        'memory_total': 16000000000
    }
}

print("\n[Step 1] Testing schema validation...")
print("-" * 70)
try:
    reg_request = DeviceRegistrationRequest(**test_registration_data)
    print(f"✓ Schema validation PASSED")
    print(f"  agent_id: {reg_request.agent_id}")
    print(f"  device_name: {reg_request.device_name}")
    print(f"  mac_address: {reg_request.mac_address}")
    print(f"  system_info has mac_address: {reg_request.system_info.get('mac_address')}")
except Exception as e:
    print(f"✗ Schema validation FAILED: {e}")
    sys.exit(1)

print("\n[Step 2] Testing database registration...")
print("-" * 70)

db = SessionLocal()
try:
    # Register the test device
    device = register_or_update_device(db, reg_request)
    
    print(f"✓ Registration SUCCESSFUL")
    print(f"  Device ID: {device.id}")
    print(f"  Device Name: {device.device_name}")
    print(f"  Agent ID: {device.agent_id}")
    print(f"  IP Address: {device.ip_address}")
    print(f"  MAC Address: {device.mac_address}")
    
    if device.mac_address == 'AA:BB:CC:DD:EE:FF':
        print("\n✓ SUCCESS: MAC address was correctly saved to database!")
    else:
        print(f"\n✗ ERROR: MAC address is '{device.mac_address}' instead of 'AA:BB:CC:DD:EE:FF'")
    
    # Clean up test device
    db.delete(device)
    db.commit()
    print("\n(Test device cleaned up)")
    
except Exception as e:
    print(f"✗ Registration FAILED: {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()

print("\n" + "=" * 70)
print("TEST COMPLETED")
print("=" * 70)
print("\nConclusion:")
print("If the test passed, the backend code is correct.")
print("If new agents still don't get MAC address, the backend server")
print("needs to be restarted to load the updated code.")
