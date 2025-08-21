from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from auth.database import get_db
from grouping.models import Device
from Devices.schemas import DeviceCreate, DeviceResponse
from typing import List

router = APIRouter(prefix="/devices", tags=["Devices"])

@router.get("/", response_model=List[DeviceResponse])
def get_devices(db: Session = Depends(get_db)):
    """Get all devices"""
    devices = db.query(Device).all()
    return devices

@router.post("/", response_model=DeviceResponse)
def update_device_status(device: DeviceCreate, db: Session = Depends(get_db)):
    """Update or create device with status and connection info"""
    print(f"=== RECEIVED DEVICE UPDATE: {device.dict()} ===")  # Debug
    
    existing = db.query(Device).filter(Device.mac_address == device.mac_address).first()
    
    if existing:
        print(f"=== UPDATING EXISTING DEVICE ID: {existing.id} ===")  # Debug
        old_status = existing.status
        
        # Update existing device
        for key, value in device.dict().items():
            setattr(existing, key, value)
        existing.last_seen = datetime.utcnow()
        
        print(f"=== STATUS CHANGE: {old_status} -> {device.status} ===")  # Debug
        
        # Handle cascade effects based on status change
        if old_status != device.status:
            if device.status == "offline":
                handle_device_offline(existing, db)
            elif device.status == "online":
                handle_device_online(existing, db)
        
        db.commit()
        db.refresh(existing)
        return existing
    else:
        print("=== CREATING NEW DEVICE ===")  # Debug
        # Create new device
        db_device = Device(**device.dict(), last_seen=datetime.utcnow())
        db.add(db_device)
        db.commit()
        db.refresh(db_device)
        return db_device

@router.get("/{device_id}/status")
def get_device_status(device_id: int, db: Session = Depends(get_db)):
    """Get specific device status for real-time updates"""
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    return {
        "id": device.id,
        "status": device.status,
        "connection_type": device.connection_type,
        "last_seen": device.last_seen,
        "device_name": device.device_name
    }

def handle_device_offline(device: Device, db: Session):
    """Handle cascade effects when device goes offline"""
    print(f"Device {device.device_name} went offline")
    
    # Update any related deployments
    # Example: Mark deployments as failed/paused
    # from grouping.models import Deployment
    # deployments = db.query(Deployment).filter(Deployment.device_id == device.id).all()
    # for deployment in deployments:
    #     deployment.status = "paused"
    
    # Update group status if needed
    # if device.group_id:
    #     from grouping.models import Group
    #     group = db.query(Group).filter(Group.id == device.group_id).first()
    #     if group:
    #         check_group_health(group, db)

def handle_device_online(device: Device, db: Session):
    """Handle cascade effects when device comes online"""
    print(f"Device {device.device_name} came online")
    
    # Resume paused deployments
    # Example: Resume deployments that were paused
    # from grouping.models import Deployment
    # deployments = db.query(Deployment).filter(
    #     Deployment.device_id == device.id,
    #     Deployment.status == "paused"
    # ).all()
    # for deployment in deployments:
    #     deployment.status = "running"

def check_group_health(group, db: Session):
    """Check if group has any online devices and update group status"""
    online_devices = db.query(Device).filter(
        Device.group_id == group.id,
        Device.status == "online"
    ).count()
    
    # Update group health status based on online devices
    # group.health_status = "healthy" if online_devices > 0 else "unhealthy"
    # db.commit()