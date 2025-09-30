#!/usr/bin/env python3
"""
Debug script to test shell detection and connection flow
"""
import sys
import os
import logging

# Add the agent directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from agent.utils.shell_detector import detect_shells
from agent.utils.machine_id import get_system_info

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_shell_detection():
    """Test shell detection functionality"""
    print("=" * 50)
    print("TESTING SHELL DETECTION")
    print("=" * 50)
    
    try:
        shells = detect_shells()
        print(f"Detected shells: {shells}")
        print(f"Shell count: {len(shells) if shells else 0}")
        print(f"Shell type: {type(shells)}")
        
        if shells:
            print("\nShell details:")
            for name, path in shells.items():
                print(f"  - {name}: {path}")
                # Test if the shell executable exists
                if os.path.exists(path):
                    print(f"    ✓ Executable exists")
                else:
                    print(f"    ✗ Executable NOT found")
        else:
            print("⚠️  No shells detected!")
            
    except Exception as e:
        print(f"❌ Error detecting shells: {e}")
        import traceback
        traceback.print_exc()

def test_system_info():
    """Test system info retrieval"""
    print("\n" + "=" * 50)
    print("TESTING SYSTEM INFO")
    print("=" * 50)
    
    try:
        system_info = get_system_info()
        print(f"System info: {system_info}")
        print(f"Hostname: {system_info.get('hostname')}")
        print(f"OS: {system_info.get('os')}")
        print(f"Machine ID: {system_info.get('machine_id')}")
    except Exception as e:
        print(f"❌ Error getting system info: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_shell_detection()
    test_system_info()
    
    print("\n" + "=" * 50)
    print("DEBUG COMPLETE")
    print("=" * 50)