from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timedelta
from app.auth.database import get_db
from app.auth.utils import get_current_user
from app.auth.models import User
from . import crud, schemas
from . import models

# Simple in-memory cache for groups
_groups_cache = {
    "data": None,
    "timestamp": None,
    "ttl_seconds": 30  # Cache for 30 seconds
}

router = APIRouter(prefix="/groups", tags=["Groups"])

# --- CRUD routes for Groups ---
def _is_groups_cache_valid() -> bool:
    """Check if groups cache is still valid"""
    if _groups_cache["data"] is None or _groups_cache["timestamp"] is None:
        return False
    
    cache_age = datetime.now() - _groups_cache["timestamp"]
    return cache_age.total_seconds() < _groups_cache["ttl_seconds"]

def _update_groups_cache(data):
    """Update the groups cache with new data"""
    _groups_cache["data"] = data
    _groups_cache["timestamp"] = datetime.now()

@router.get("/", response_model=list[schemas.GroupResponse])
def list_groups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    force_refresh: bool = False
):
    # Check cache first (skip user-specific caching for simplicity - could be improved)
    if not force_refresh and _is_groups_cache_valid():
        print("Returning cached groups data")
        return _groups_cache["data"]
    
    print("Fetching fresh groups data from database")
    groups_data = crud.get_groups(db, current_user.id)
    
    # Update cache
    _update_groups_cache(groups_data)
    return groups_data

@router.post("/", response_model=schemas.GroupResponse)
def create_group(
    group: schemas.GroupCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_group = crud.create_group(db, group, current_user.id)
    if group.device_ids:
        for device_id in group.device_ids:
            crud.assign_device_to_group(db, device_id, new_group.id, current_user.id)
    # Return group with device details
    device_maps = db.query(models.DeviceGroupMap).filter_by(group_id=new_group.id).all()
    devices = []
    for dm in device_maps:
        device = db.query(models.Device).filter_by(id=dm.device_id).first()
        if device:
            devices.append({
                "id": device.id,
                "device_name": device.device_name,
                "ip_address": device.ip_address,
                "mac_address": device.mac_address,
                "os": device.os,
                "status": device.status,
                "connection_type": device.connection_type,
                "last_seen": device.last_seen.isoformat() if device.last_seen else None,
            })
    return {
        "id": new_group.id,
        "group_name": new_group.group_name,
        "description": new_group.description,
        "color": new_group.color,
        "devices": devices
    }

@router.put("/{group_id}", response_model=schemas.GroupResponse)
def update_group(
    group_id: int, 
    group: schemas.GroupUpdate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_group = db.query(models.DeviceGroup).filter(
        models.DeviceGroup.id == group_id,
        models.DeviceGroup.user_id == current_user.id
    ).first()
    if not db_group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Update basic group attributes
    for key, value in group.dict(exclude_unset=True, exclude={"device_ids"}).items():
        setattr(db_group, key, value)
    db.commit()
    db.refresh(db_group)

    # Update device assignments if provided
    if hasattr(group, "device_ids") and group.device_ids is not None:
        # Remove all current device mappings for this group
        db.query(models.DeviceGroupMap).filter_by(group_id=group_id).delete()
        db.commit()
        # Add new device mappings
        for device_id in group.device_ids:
            db.add(models.DeviceGroupMap(device_id=device_id, group_id=group_id))
        db.commit()

    # Return the updated group with device details
    device_maps = db.query(models.DeviceGroupMap).filter_by(group_id=db_group.id).all()
    devices = []
    for dm in device_maps:
        device = db.query(models.Device).filter_by(id=dm.device_id).first()
        if device:
            devices.append({
                "id": device.id,
                "device_name": device.device_name,
                "ip_address": device.ip_address,
                "mac_address": device.mac_address,
                "os": device.os,
                "status": device.status,
                "connection_type": device.connection_type,
                "last_seen": device.last_seen.isoformat() if device.last_seen else None,
            })
    
    return {
        "id": db_group.id,
        "group_name": db_group.group_name,
        "description": db_group.description,
        "color": db_group.color,
        "devices": devices
    }

@router.delete("/{group_id}")
def delete_group(
    group_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    deleted = crud.delete_group(db, group_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Group not found")
    return {"message": "Group deleted"}

@router.post("/{group_id}/assign/{device_id}")
def assign_device(
    group_id: int, 
    device_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if device exists
    device = db.query(models.Device).filter(models.Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    result = crud.assign_device_to_group(db, device_id, group_id, current_user.id)
    if not result:
        raise HTTPException(status_code=404, detail="Group not found or access denied")
    return {"message": "Device assigned successfully"}

@router.delete("/{group_id}/remove/{device_id}")
def remove_device(
    group_id: int, 
    device_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = crud.remove_device_from_group(db, device_id, group_id, current_user.id)
    if not result:
        raise HTTPException(status_code=404, detail="Group not found, device not in group, or access denied")
    return {"message": "Device removed successfully"}

# --- Get all devices with group info ---
@router.get("/devices")
def get_devices(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = text("""
        SELECT d.id, d.device_name, d.ip_address, d.os, d.status, d.connection_type, d.last_seen, g.group_name
        FROM devices d
        LEFT JOIN device_groups g ON d.group_id = g.id
        ORDER BY d.id
    """)
    result = db.execute(query)
    devices = [
        {
            "id": row.id,
            "device_name": row.device_name,
            "ip_address": row.ip_address,
            "os": row.os,
            "status": row.status,
            "connection_type": row.connection_type,
            "last_seen": row.last_seen.isoformat() if row.last_seen else None,
            "group_name": row.group_name,
        }
        for row in result
    ]
    return devices
#some changes done for checking my contribution count