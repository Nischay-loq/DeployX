from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from auth.database import get_db
from . import crud, schemas

router = APIRouter(prefix="/groups", tags=["Groups"])

# --- CRUD routes for Groups ---
@router.get("/", response_model=list[schemas.GroupResponse])
def list_groups(db: Session = Depends(get_db)):
    return crud.get_groups(db)

@router.post("/", response_model=schemas.GroupResponse)
def create_group(group: schemas.GroupCreate, db: Session = Depends(get_db)):
    return crud.create_group(db, group)

@router.put("/{group_id}", response_model=schemas.GroupResponse)
def update_group(group_id: int, group: schemas.GroupUpdate, db: Session = Depends(get_db)):
    updated = crud.update_group(db, group_id, group)
    if not updated:
        raise HTTPException(status_code=404, detail="Group not found")
    return updated

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