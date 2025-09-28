from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.auth.database import get_db
from app.grouping.models import Device
from app.Devices.schemas import DeviceCreate, DeviceResponse
from typing import List, Optional
import json

# Simple in-memory cache
_devices_cache = {
    "data": None,
    "timestamp": None,
    "ttl_seconds": 30  # Cache for 30 seconds
}

router = APIRouter(prefix="/devices", tags=["Devices"])

def _is_cache_valid() -> bool:
    """Check if cache is still valid"""
    if _devices_cache["data"] is None or _devices_cache["timestamp"] is None:
        return False
    
    cache_age = datetime.now() - _devices_cache["timestamp"]
    return cache_age.total_seconds() < _devices_cache["ttl_seconds"]

def _update_cache(data):
    """Update the cache with new data"""
    _devices_cache["data"] = data
    _devices_cache["timestamp"] = datetime.now()

@router.get("/")
def get_devices(db: Session = Depends(get_db), force_refresh: bool = False):
    """Get all devices with their group information - OPTIMIZED with CACHING"""
    from app.grouping.models import DeviceGroupMap, DeviceGroup
    from sqlalchemy.orm import joinedload, selectinload
    from sqlalchemy import and_
    
    # Return cached data if valid and not force refresh
    if not force_refresh and _is_cache_valid():
        print("Returning cached devices data")
        return _devices_cache["data"]
    
    print("Fetching fresh devices data from database")
    
    try:
        # Single optimized query with all relationships preloaded
        devices = db.query(Device).options(
            joinedload(Device.group),  # Eager load direct group
            selectinload(Device.device_group_mappings).joinedload(DeviceGroupMap.group)  # Preload mapping groups
        ).all()
        
        # Fast in-memory processing - no additional DB queries
        result = []
        for device in devices:
            # Build device dict with preloaded data
            device_dict = {
                "id": device.id,
                "device_name": device.device_name,
                "ip_address": device.ip_address,
                "mac_address": device.mac_address,
                "os": device.os,
                "status": device.status,
                "connection_type": device.connection_type,
                "last_seen": device.last_seen,
                "group": device.group,  # Direct group relationship (already loaded)
                "groups": []  # Additional groups from mapping table
            }
            
            # Process preloaded group mappings (no DB query)
            if hasattr(device, 'device_group_mappings') and device.device_group_mappings:
                additional_groups = []
                for mapping in device.device_group_mappings:
                    if mapping.group:
                        additional_groups.append({
                            "id": mapping.group.id,
                            "group_name": mapping.group.group_name,
                            "description": mapping.group.description,
                            "color": mapping.group.color
                        })
                device_dict["groups"] = additional_groups
            
            result.append(device_dict)
        
        # Update cache before returning
        _update_cache(result)
        return result
        
    except Exception as e:
        print(f"Error in optimized get_devices: {e}")
        # Fallback to original method if optimization fails
        # Fallback to simple query if optimization fails
        devices = db.query(Device).options(joinedload(Device.group)).all()
        fallback_result = [
            {
                "id": device.id,
                "device_name": device.device_name,
                "ip_address": device.ip_address,
                "mac_address": device.mac_address,
                "os": device.os,
                "status": device.status,
                "connection_type": device.connection_type,
                "last_seen": device.last_seen,
                "group": device.group,
                "groups": []
            }
            for device in devices
        ]
        
        # Update cache with fallback data
        _update_cache(fallback_result)
        return fallback_result

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