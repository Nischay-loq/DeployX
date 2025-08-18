from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from auth.database import get_db
from . import crud, schemas  # <-- this imports from Devices/crud.py


router = APIRouter(prefix="/devices", tags=["Devices"])

@router.get("/", response_model=list[schemas.DeviceResponse])
def list_devices(db: Session = Depends(get_db)):
    return crud.get_devices(db)  # <-- this calls Devices/crud.py:get_devices