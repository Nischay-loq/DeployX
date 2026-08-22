from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.auth.database import get_db, User
from app.auth.utils import get_current_user
from app.grouping.models import Device
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import json
import logging

logger = logging.getLogger(__name__)

class DeviceCreate(BaseModel):
    device_name: str
    ip_address: str
    mac_address: str
    os: str
    status: str
    connection_type: Optional[str] = None
    last_seen: Optional[str] = None

class GroupInfo(BaseModel):
    id: int
    group_name: str
    description: Optional[str] = None
    color: Optional[str] = None

class DeviceResponse(BaseModel):
    id: int
    device_name: Optional[str] = None
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    os: Optional[str] = None
    status: Optional[str] = None
    connection_type: Optional[str] = None
    last_seen: Optional[datetime] = None
    group: Optional[GroupInfo] = None
    groups: List[GroupInfo] = []

    model_config = {"from_attributes": True}

_devices_cache = {
    "data": None,
    "timestamp": None,
    "ttl_seconds": 30
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
def get_devices(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user),
    force_refresh: bool = False
):
    """Get all devices with their group information - OPTIMIZED with CACHING and REAL-TIME STATUS"""
    from app.grouping.models import DeviceGroupMap, DeviceGroup
    from sqlalchemy.orm import joinedload, selectinload
    from sqlalchemy import and_
    
    # Import the connection manager to get real-time online status
    from app.main import conn_manager
    
    if not force_refresh and _is_cache_valid():
        return _devices_cache["data"]

    # Get list of currently connected agents from connection manager
    online_agent_ids = set(conn_manager.get_agent_list())
    
    try:
        devices = db.query(Device).options(
            joinedload(Device.group),
            selectinload(Device.device_group_mappings).joinedload(DeviceGroupMap.group)
        ).all()
        
        result = []
        for device in devices:
            # Determine real-time status based on connection manager
            actual_status = 'online' if device.agent_id in online_agent_ids else 'offline'
            
            device_dict = {
                "id": device.id,
                "device_name": device.device_name,
                "ip_address": device.ip_address,
                "mac_address": device.mac_address,
                "os": device.os,
                "status": actual_status,  # Use real-time status instead of database status
                "connection_type": device.connection_type,
                "last_seen": device.last_seen,
                "group": device.group,
                "groups": []
            }
            
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
        
        _update_cache(result)
        return result
        
    except Exception as e:
        logger.error(f"Error in optimized get_devices: {e}")
        devices = db.query(Device).options(joinedload(Device.group)).all()
        fallback_result = [
            {
                "id": device.id,
                "device_name": device.device_name,
                "ip_address": device.ip_address,
                "mac_address": device.mac_address,
                "os": device.os,
                "status": 'online' if device.agent_id in online_agent_ids else 'offline',  # Use real-time status
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
        existing = db.query(Device).filter(Device.mac_address == device.mac_address).first()

        if existing:
            # Update existing device
            for key, value in device.dict().items():
                if value is not None:  # Only update non-None values
                    setattr(existing, key, value)
            existing.last_seen = datetime.utcnow()

            db.commit()
            db.refresh(existing)
            return existing
        else:
            device_data = device.dict()
            # Convert last_seen to datetime if it's a string
            last_seen_value = device_data.get("last_seen")
            if last_seen_value:
                try:
                    last_seen_dt = datetime.fromisoformat(last_seen_value)
                except Exception:
                    last_seen_dt = datetime.utcnow()
                device_data["last_seen"] = last_seen_dt
            db_device = Device(**device_data)
            db.add(db_device)
            db.commit()
            db.refresh(db_device)
            return db_device

    except Exception as e:
        logger.exception(f"Error in update_device_status: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")