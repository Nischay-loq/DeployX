# routes.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from sqlalchemy.orm import Session

from auth.database import get_db
from models import Device, DeviceGroup

router = APIRouter()

class DeviceOut(BaseModel):
    id: int
    device_name: str
    ip_address: str
    mac_address: str
    os: str
    status: str
    group_name: Optional[str] = None

    class Config:
        orm_mode = True

class GroupOut(BaseModel):
    id: int
    group_name: str
    description: Optional[str] = ""
    device_ids: List[int]
    device_count: int

class GroupCreate(BaseModel):
    group_name: str = Field(..., min_length=1)
    description: Optional[str] = ""
    device_ids: List[int] = []

@router.get("/devices", response_model=List[DeviceOut])
async def get_devices(db: Session = Depends(get_db)):
    devices = db.query(Device).all()
    return [
        DeviceOut(
            id=d.id,
            device_name=d.device_name,
            ip_address=str(d.ip_address),
            mac_address=d.mac_address,
            os=d.os,
            status=d.status,
            group_name=d.group.group_name if d.group else None
        )
        for d in devices
    ]

@router.get("/groups", response_model=List[GroupOut])
async def get_groups(db: Session = Depends(get_db)):
    groups = db.query(DeviceGroup).all()
    return [
        GroupOut(
            id=g.id,
            group_name=g.group_name,
            description=g.description,
            device_ids=[d.id for d in g.devices],
            device_count=len(g.devices)
        )
        for g in groups
    ]

@router.post("/groups", response_model=GroupOut, status_code=201)
async def create_group(new_group: GroupCreate, db: Session = Depends(get_db)):
    # Check duplicate name
    if db.query(DeviceGroup).filter(DeviceGroup.group_name.ilike(new_group.group_name)).first():
        raise HTTPException(status_code=400, detail="Group name already exists")

    # Create group
    group = DeviceGroup(group_name=new_group.group_name, description=new_group.description)
    db.add(group)
    db.commit()
    db.refresh(group)

    # Assign devices to group
    if new_group.device_ids:
        db.query(Device).filter(Device.id.in_(new_group.device_ids)).update(
            {Device.group_id: group.id}, synchronize_session=False
        )
        db.commit()

    return GroupOut(
        id=group.id,
        group_name=group.group_name,
        description=group.description,
        device_ids=new_group.device_ids,
        device_count=len(new_group.device_ids)
    )
