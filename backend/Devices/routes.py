from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from auth.database import get_db
from . import crud, schemas  # <-- this imports from Devices/crud.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from auth.database import get_db
from grouping.models import Device
from Devices.schemas import DeviceCreate, DeviceResponse


router = APIRouter(prefix="/devices", tags=["Devices"])

@router.get("/", response_model=list[schemas.DeviceResponse])
def list_devices(db: Session = Depends(get_db)):
    return crud.get_devices(db)  # <-- this calls Devices/crud.py:get_devices

@router.post("/", response_model=DeviceResponse)
def create_device(device: DeviceCreate, db: Session = Depends(get_db)):
    existing = db.query(Device).filter(Device.mac_address == device.mac_address).first()
    if existing:
        for key, value in device.dict().items():
            setattr(existing, key, value)
        existing.last_seen = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        return existing
    db_device = Device(**device.dict(), last_seen=datetime.utcnow())
    db.add(db_device)
    db.commit()
    db.refresh(db_device)
    return db_device