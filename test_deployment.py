"""Test script to verify software deployment functionality"""
import asyncio
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

async def test_deployment():
    """Test the deployment flow"""
    from app.auth.database import SessionLocal
    from app.grouping.models import Device
    from app.software.models import Software
    from app.Deployments.models import Deployment, DeploymentTarget
    from datetime import datetime
    
    db = SessionLocal()
    try:
        # Check for online devices
        devices = db.query(Device).filter(Device.status == "online").all()
        print(f"\n=== Online Devices ===")
        for device in devices:
            print(f"ID: {device.id}, Name: {device.device_name}, Agent ID: {device.agent_id}, Status: {device.status}")
        
        if not devices:
            print("❌ No online devices found!")
            return
        
        # Check for available software
        software_list = db.query(Software).filter(Software.is_active == True).all()
        print(f"\n=== Available Software ===")
        for sw in software_list:
            print(f"ID: {sw.id}, Name: {sw.name}, Version: {sw.version}")
            print(f"  Download URL: {sw.download_url}")
            print(f"  Install Command (Windows): {sw.install_command_windows}")
        
        if not software_list:
            print("❌ No software packages found!")
            print("\n💡 You need to add software to the database first.")
            print("   Use the /software API endpoint to add software packages.")
            return
        
        # Check recent deployments
        deployments = db.query(Deployment).order_by(Deployment.started_at.desc()).limit(5).all()
        print(f"\n=== Recent Deployments ===")
        for dep in deployments:
            targets = db.query(DeploymentTarget).filter(DeploymentTarget.deployment_id == dep.id).all()
            print(f"ID: {dep.id}, Name: {dep.deployment_name}, Status: {dep.status}")
            print(f"  Started: {dep.started_at}")
            print(f"  Targets: {len(targets)}")
            for target in targets:
                device = db.query(Device).filter(Device.id == target.device_id).first()
                print(f"    - Device: {device.device_name if device else target.device_id}, Status: {target.status}, Progress: {target.progress_percent}%")
                if target.error_message:
                    print(f"      Error: {target.error_message}")
        
    finally:
        db.close()
    
    print("\n=== Test Complete ===")

if __name__ == "__main__":
    asyncio.run(test_deployment())
