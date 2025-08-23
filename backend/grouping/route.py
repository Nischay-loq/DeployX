from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from auth.database import get_db
from . import crud, schemas
from . import models

router = APIRouter(prefix="/groups", tags=["Groups"])

# --- CRUD routes for Groups ---
@router.get("/", response_model=list[schemas.GroupResponse])
def list_groups(db: Session = Depends(get_db)):
    return crud.get_groups(db)

@router.post("/", response_model=schemas.GroupResponse)
def create_group(group: schemas.GroupCreate, db: Session = Depends(get_db)):
    new_group = crud.create_group(db, group)
    if group.device_ids:
        for device_id in group.device_ids:
            crud.assign_device_to_group(db, device_id, new_group.id)
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
def update_group(group_id: int, group: schemas.GroupUpdate, db: Session = Depends(get_db)):
    db_group = db.query(models.DeviceGroup).filter(models.DeviceGroup.id == group_id).first()
    if not db_group:
        raise HTTPException(status_code=404, detail="Group not found")
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
def delete_group(group_id: int, db: Session = Depends(get_db)):
    deleted = crud.delete_group(db, group_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Group not found")
    return {"message": "Group deleted"}

@router.post("/{group_id}/assign/{device_id}")
def assign_device(group_id: int, device_id: int, db: Session = Depends(get_db)):
    return crud.assign_device_to_group(db, device_id, group_id)

@router.delete("/{group_id}/remove/{device_id}")
def remove_device(group_id: int, device_id: int, db: Session = Depends(get_db)):
    return crud.remove_device_from_group(db, device_id, group_id)

# --- Get all devices with group info ---
@router.get("/devices")
def get_devices(db: Session = Depends(get_db)):
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