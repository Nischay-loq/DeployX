"""
Quick Test: Verify Software Deployment Fix

This script checks if the deployment infrastructure is working correctly.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

def main():
    from app.auth.database import SessionLocal
    from app.grouping.models import Device
    from app.software.models import Software
    
    db = SessionLocal()
    try:
        print("\n" + "="*60)
        print("SOFTWARE DEPLOYMENT READINESS CHECK")
        print("="*60)
        
        # Check 1: Online Devices
        print("\n[1] Checking for online devices...")
        devices = db.query(Device).filter(Device.status == "online").all()
        if devices:
            print(f"✅ Found {len(devices)} online device(s):")
            for d in devices:
                print(f"   - {d.device_name} (agent_id: {d.agent_id})")
        else:
            print("❌ No online devices found!")
            print("   → Start an agent: python agent/main.py --server http://localhost:8000")
            return False
        
        # Check 2: Available Software
        print("\n[2] Checking for available software...")
        software = db.query(Software).filter(Software.is_active == True).limit(5).all()
        if software:
            print(f"✅ Found {db.query(Software).filter(Software.is_active == True).count()} software package(s)")
            print("   Sample packages:")
            for sw in software:
                print(f"   - {sw.name} v{sw.version}")
        else:
            print("❌ No software packages available!")
            print("   → Add software via the /software API endpoint")
            return False
        
        # Check 3: Installation Commands
        print("\n[3] Checking installation commands...")
        missing_commands = []
        for sw in software:
            if not sw.install_command_windows and not sw.install_command_linux:
                missing_commands.append(sw.name)
        
        if missing_commands:
            print(f"⚠️  {len(missing_commands)} package(s) missing install commands:")
            for name in missing_commands[:3]:
                print(f"   - {name}")
        else:
            print("✅ All packages have installation commands")
        
        # Check 4: Download URLs
        print("\n[4] Checking download URLs...")
        invalid_urls = []
        for sw in software:
            if not sw.download_url or not sw.download_url.startswith('http'):
                invalid_urls.append(sw.name)
        
        if invalid_urls:
            print(f"⚠️  {len(invalid_urls)} package(s) have invalid download URLs:")
            for name in invalid_urls[:3]:
                print(f"   - {name}")
        else:
            print("✅ All packages have valid download URLs")
        
        # Summary
        print("\n" + "="*60)
        print("READINESS SUMMARY")
        print("="*60)
        
        all_good = len(devices) > 0 and len(software) > 0
        
        if all_good:
            print("✅ System is ready for software deployment!")
            print("\nNext steps:")
            print("1. Make sure backend is running: python backend/start_server.py")
            print("2. Make sure agent is running: python agent/main.py --server http://localhost:8000")
            print("3. Use the frontend to trigger a deployment")
            print("4. Monitor logs in both backend and agent terminals")
        else:
            print("❌ System is NOT ready for deployment")
            print("   Fix the issues above before deploying")
        
        print("="*60 + "\n")
        return all_good
        
    finally:
        db.close()

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
