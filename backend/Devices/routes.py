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

# Devices/routes.py
@router.post("/", response_model=DeviceResponse)
def update_device_status(device: DeviceCreate, db: Session = Depends(get_db)):
    """Update or create device with status and connection info"""
    try:
        print(f"=== RECEIVED DEVICE UPDATE: {device.dict()} ===")
        
        existing = db.query(Device).filter(Device.mac_address == device.mac_address).first()
        
        if existing:
            print(f"=== UPDATING EXISTING DEVICE ID: {existing.id} ===")
            old_status = existing.status
            
            # Update existing device
            for key, value in device.dict().items():
                if value is not None:  # Only update non-None values
                    setattr(existing, key, value)
            existing.last_seen = datetime.utcnow()
            
            print(f"=== STATUS CHANGE: {old_status} -> {device.status} ===")
            
            # Commit the device update first
            db.commit()
            db.refresh(existing)
            
            # Then handle cascade effects (but don't let them break the main update)
            try:
                if old_status != device.status:
                    if device.status == "offline":
                        print("=== CALLING handle_device_offline ===")
                        handle_device_offline(existing, db)
                    elif device.status == "online":
                        print("=== CALLING handle_device_online ===")
                        handle_device_online(existing, db)
            except Exception as cascade_error:
                print(f"=== CASCADE ERROR (non-critical): {cascade_error} ===")
                # Don't let cascade errors break the main update
            
            print(f"=== DEVICE UPDATED SUCCESSFULLY ===")
            return existing
        else:
            print("=== CREATING NEW DEVICE ===")
            # Handle None values in device creation
            device_data = device.dict()
            # Convert last_seen to datetime if it's a string
            last_seen_value = device_data.get("last_seen")
            if last_seen_value:
                try:
                    # Try to parse ISO string to datetime
                    last_seen_dt = datetime.fromisoformat(last_seen_value)
                except Exception:
                    last_seen_dt = datetime.utcnow()
                device_data["last_seen"] = last_seen_dt
            db_device = Device(**device_data)
            db.add(db_device)
            db.commit()
            db.refresh(db_device)
            print(f"=== NEW DEVICE CREATED SUCCESSFULLY ===")
            return db_device
            
    except Exception as e:
        print(f"=== ERROR IN UPDATE_DEVICE_STATUS: {e} ===")
        print(f"=== ERROR TYPE: {type(e)} ===")
        import traceback
        traceback.print_exc()
        db.rollback()  # Rollback on error
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

def handle_device_offline(device: Device, db: Session):
    """Handle when device goes offline"""
    try:
        print(f"Device {device.device_name} went OFFLINE")
        # Add your cascade logic here - make sure it doesn't cause errors
        # For now, just log it
        pass
    except Exception as e:
        print(f"Error in handle_device_offline: {e}")
        # Don't raise the exception

def handle_device_online(device: Device, db: Session):
    """Handle when device comes online"""
    try:
        print(f"Device {device.device_name} came ONLINE")
        # Add your cascade logic here - make sure it doesn't cause errors
        # For now, just log it
        pass
    except Exception as e:
        print(f"Error in handle_device_online: {e}")
        # Don't raise the exception
        # Just log it