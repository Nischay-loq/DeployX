"""Test script to verify MAC address collection."""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agent.utils.machine_id import get_mac_address, get_system_info

print("=" * 60)
print("Testing MAC Address Collection")
print("=" * 60)

# Test MAC address function
mac = get_mac_address()
print(f"\nMAC Address: {mac}")

# Test system info
print("\n" + "=" * 60)
print("Full System Info:")
print("=" * 60)
sys_info = get_system_info()
for key, value in sys_info.items():
    if key == "mac_address":
        print(f"✓ {key}: {value}")
    else:
        print(f"  {key}: {value}")

print("\n" + "=" * 60)
if sys_info.get("mac_address") and sys_info["mac_address"] != "00:00:00:00:00:00":
    print("✓ SUCCESS: MAC address successfully collected!")
else:
    print("✗ WARNING: MAC address is default or missing!")
print("=" * 60)
