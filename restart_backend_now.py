"""
Quick Backend Restart Script
Stops the current backend and starts a new one with updated code
"""
import subprocess
import sys
import psutil
import time

print("=" * 70)
print("BACKEND RESTART SCRIPT")
print("=" * 70)

# Find and stop backend
print("\n[1/2] Stopping old backend...")
backend_found = False

for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
    try:
        cmdline = proc.info['cmdline']
        if cmdline and 'start_server.py' in ' '.join(cmdline):
            print(f"  Found backend (PID: {proc.pid})")
            proc.terminate()
            proc.wait(timeout=10)
            print(f"  ✓ Backend stopped")
            backend_found = True
            break
    except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.TimeoutExpired) as e:
        if isinstance(e, psutil.TimeoutExpired):
            proc.kill()
            print(f"  ✓ Backend force stopped")

if not backend_found:
    print("  No running backend found (OK)")

time.sleep(2)

# Start new backend
print("\n[2/2] Starting backend with updated code...")
print("  Opening new console window...")

import os
os.chdir(r'D:\DeployX\backend')

# Start in new console
if sys.platform == 'win32':
    subprocess.Popen(
        [sys.executable, 'start_server.py'],
        creationflags=subprocess.CREATE_NEW_CONSOLE
    )
else:
    subprocess.Popen([sys.executable, 'start_server.py'])

print("  ✓ Backend started in new window")

print("\n" + "=" * 70)
print("✓ RESTART COMPLETE!")
print("=" * 70)
print("\nBackend is now running with updated code.")
print("New agent registrations will include MAC addresses automatically.")
print("\nVerify after 5 seconds:")
print("  cd D:\\DeployX\\backend")
print("  python check_mac_in_db.py")
