"""
Debug script to check what data the agent sends during registration
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agent.utils.machine_id import get_system_info, get_mac_address, generate_agent_id
import json

print("=" * 70)
print("AGENT REGISTRATION DATA DEBUG")
print("=" * 70)

# Get agent ID
agent_id = generate_agent_id()
print(f"\n1. Agent ID: {agent_id}")

# Get system info
system_info = get_system_info()
print(f"\n2. System Info MAC Address: {system_info.get('mac_address', 'NOT FOUND')}")

# Simulate registration data (as it would be sent)
registration_data = {
    'agent_id': agent_id,
    'machine_id': system_info.get('machine_id'),
    'device_name': system_info.get('hostname'),
    'ip_address': system_info.get('ip_address', '0.0.0.0'),
    'mac_address': system_info.get('mac_address', '00:00:00:00:00:00'),
    'os': system_info.get('os'),
    'shells': ['cmd', 'powershell'],  # Example
    'system_info': system_info
}

print("\n3. Complete Registration Data:")
print("=" * 70)
print(json.dumps(registration_data, indent=2, default=str))
print("=" * 70)

# Check specifically for mac_address
print(f"\n4. MAC Address in registration_data: {registration_data.get('mac_address')}")
print(f"5. MAC Address in system_info: {registration_data['system_info'].get('mac_address')}")

if registration_data.get('mac_address') and registration_data['mac_address'] != '00:00:00:00:00:00':
    print("\n✓ SUCCESS: MAC address is present in registration data!")
else:
    print("\n✗ ERROR: MAC address is missing or default!")
