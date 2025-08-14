from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from auth.database import get_db
from . import crud, schemas
<<<<<<< HEAD
=======
from auth.database import database
from sqlalchemy import text
>>>>>>> 0d1549a1e7dbb3db74d0e45a7ff9fafc74ff5223

router = APIRouter(prefix="/groups", tags=["Groups"])

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
<<<<<<< HEAD
=======

@router.get("/devices")
async def get_devices():
    query = text("""
        SELECT d.id, d.device_name, d.ip_address, d.status, g.group_name
        FROM devices d
        LEFT JOIN device_groups g ON d.group_id = g.id
        ORDER BY d.id
    """)
    rows = await database.fetch_all(query)
    return [dict(row) for row in rows]
>>>>>>> 0d1549a1e7dbb3db74d0e45a7ff9fafc74ff5223
