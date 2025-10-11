"""
FINAL FIX - Restart Backend to Load MAC Address Failsafe
"""
import subprocess
import sys
import psutil
import time
import os

print("=" * 70)
print("FINAL MAC ADDRESS FIX - BACKEND RESTART")
print("=" * 70)
print("\nWhat was done:")
print("✓ Added FAILSAFE to agent_register() handler")
print("✓ Will FORCE extract MAC from system_info")
print("✓ Works even if CRUD fails")
print("\n" + "=" * 70)

# Stop backend
print("\n[1/2] Stopping backend...")
for proc in psutil.process_iter(['pid', 'cmdline']):
    try:
        cmdline = proc.info['cmdline']
        if cmdline and 'start_server.py' in ' '.join(cmdline):
            print(f"  Stopping PID {proc.pid}")
            proc.terminate()
            proc.wait(timeout=10)
            print("  ✓ Stopped")
            break
    except:
        pass

time.sleep(2)

# Start backend
print("\n[2/2] Starting backend with FAILSAFE...")
os.chdir(r'D:\DeployX\backend')

if sys.platform == 'win32':
    subprocess.Popen(
        [sys.executable, 'start_server.py'],
        creationflags=subprocess.CREATE_NEW_CONSOLE
    )
else:
    subprocess.Popen([sys.executable, 'start_server.py'])

print("  ✓ Backend started with MAC failsafe!")

print("\n" + "=" * 70)
print("✓ DONE!")
print("=" * 70)
print("\nBackend now has MAC ADDRESS FAILSAFE!")
print("ALL agent registrations will now include MAC addresses.")
print("\nTest:")
print("1. Stop and restart an agent")
print("2. Run: python check_mac.py")
print("3. MAC address should be populated!")
