"""
Script to restart the backend server
"""
import subprocess
import sys
import time
import psutil
import os

def find_backend_process():
    """Find the backend server process"""
    for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
        try:
            cmdline = proc.info['cmdline']
            if cmdline and any('start_server.py' in str(cmd) or 'uvicorn' in str(cmd) for cmd in cmdline):
                return proc
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            pass
    return None

def restart_backend():
    """Restart the backend server"""
    print("🔍 Looking for backend server process...")
    
    proc = find_backend_process()
    
    if proc:
        print(f"✓ Found backend server process (PID: {proc.pid})")
        print("⏸  Stopping backend server...")
        
        try:
            proc.terminate()
            proc.wait(timeout=10)
            print("✓ Backend server stopped successfully")
        except psutil.TimeoutExpired:
            print("⚠  Process didn't stop gracefully, forcing...")
            proc.kill()
            print("✓ Backend server force stopped")
        
        # Wait a moment for port to be released
        time.sleep(2)
    else:
        print("ℹ  No backend server process found")
    
    print("\n🚀 Starting backend server...")
    print("=" * 50)
    
    # Start the backend server
    # Note: This will run in the foreground. Press Ctrl+C to stop.
    os.chdir(r'D:\DeployX\backend')
    subprocess.run([sys.executable, 'start_server.py'])

if __name__ == "__main__":
    try:
        restart_backend()
    except KeyboardInterrupt:
        print("\n\n⏸  Server stopped by user")
    except Exception as e:
        print(f"\n❌ Error: {e}")
