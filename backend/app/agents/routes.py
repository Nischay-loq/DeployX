"""FastAPI routes for device/agent management."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from app.auth.database import get_db
from . import crud, schemas

router = APIRouter(
    prefix="/api/agents",
    tags=["agents"]
)

@router.get("/", response_model=schemas.DeviceListResponse)
def get_agents(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """Get list of all agents/devices."""
    devices = crud.get_devices(db, skip=skip, limit=limit)
    total = crud.get_total_devices_count(db)
    return schemas.DeviceListResponse(devices=devices, total=total)

@router.get("/online", response_model=List[schemas.DeviceResponse])
def get_online_agents(db: Session = Depends(get_db)):
    """Get list of online agents/devices."""
    devices = crud.get_online_devices(db)
    return devices

@router.get("/{agent_id}", response_model=schemas.DeviceResponse)
def get_agent(agent_id: str, db: Session = Depends(get_db)):
    """Get specific agent/device by agent_id."""
    device = crud.get_device(db, agent_id)
    if not device:
        raise HTTPException(status_code=404, detail="Agent not found")
    return device

@router.post("/", response_model=schemas.DeviceResponse, status_code=201)
def create_agent(
    device: schemas.DeviceCreate,
    db: Session = Depends(get_db)
):
    """Create a new agent/device."""
    # Check if agent already exists
    existing = crud.get_device(db, device.agent_id)
    if existing:
        raise HTTPException(status_code=400, detail="Agent with this ID already exists")
    
    return crud.create_device(db, device)

@router.put("/{agent_id}", response_model=schemas.DeviceResponse)
def update_agent(
    agent_id: str,
    device_update: schemas.DeviceUpdate,
    db: Session = Depends(get_db)
):
    """Update agent/device information."""
    device = crud.update_device(db, agent_id, device_update)
    if not device:
        raise HTTPException(status_code=404, detail="Agent not found")
    return device

@router.put("/{agent_id}/status")
def update_agent_status(
    agent_id: str,
    status: str = Query(..., regex="^(online|offline|disconnected)$"),
    db: Session = Depends(get_db)
):
    """Update agent/device status."""
    device = crud.update_device_status(db, agent_id, status)
    if not device:
        raise HTTPException(status_code=404, detail="Agent not found")
    return {"message": f"Agent {agent_id} status updated to {status}"}

@router.put("/{agent_id}/heartbeat")
def update_agent_heartbeat(
    agent_id: str,
    db: Session = Depends(get_db)
):
    """Update agent/device last seen timestamp (heartbeat)."""
    device = crud.update_device_last_seen(db, agent_id)
    if not device:
        raise HTTPException(status_code=404, detail="Agent not found")
    return {"message": f"Agent {agent_id} heartbeat updated"}

@router.delete("/{agent_id}")
def delete_agent(agent_id: str, db: Session = Depends(get_db)):
    """Delete an agent/device."""
    success = crud.delete_device(db, agent_id)
    if not success:
        raise HTTPException(status_code=404, detail="Agent not found")
    return {"message": f"Agent {agent_id} deleted successfully"}