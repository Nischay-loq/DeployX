from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .schemas import DeploymentCreate, DeploymentResponse, DeploymentProgressResponse, RetryRequest
from .models import Deployment, DeploymentTarget, Checkpoint
from app.grouping.models import DeviceGroupMap, Device as Devices, DeviceGroup as DeviceGroups
from app.auth.database import get_db
from datetime import datetime

router = APIRouter(prefix="/deployments", tags=["Deployments"])

@router.post("/install", response_model=DeploymentResponse)
def install_software(data: DeploymentCreate, db: Session = Depends(get_db)):
    # Create deployment
    deployment = Deployment(
        deployment_name=data.deployment_name or "Software Installation",
        status="in_progress",
        started_at=datetime.utcnow()
    )
    db.add(deployment)
    db.commit()
    db.refresh(deployment)

    # Collect all target device IDs
    target_device_ids = set(data.device_ids)
    
    # Add devices from selected groups
    if data.group_ids:
        group_device_ids = db.query(DeviceGroupMap.device_id).filter(
            DeviceGroupMap.group_id.in_(data.group_ids)
        ).all()
        target_device_ids.update([d[0] for d in group_device_ids])

    # Create deployment targets for all devices
    for device_id in target_device_ids:
        target = DeploymentTarget(deployment_id=deployment.id, device_id=device_id)
        db.add(target)
    db.commit()

    # Add initial checkpoint
    checkpoint = Checkpoint(
        deployment_id=deployment.id,
        step="start",
        status="success",
        timestamp=datetime.utcnow()
    )
    db.add(checkpoint)
    db.commit()

    return {"deployment_id": deployment.id}

@router.get("/{deployment_id}/progress", response_model=DeploymentProgressResponse)
def get_progress(deployment_id: int, db: Session = Depends(get_db)):
    targets = db.query(DeploymentTarget).filter(DeploymentTarget.deployment_id == deployment_id).all()
    devices = []
    completed = True
    for t in targets:
        device = db.query(Devices).filter(Devices.id == t.device_id).first()
        # Simulate percent/status (replace with real logic)
        percent = 100
        status = "success"
        devices.append({
            "device_id": t.device_id,
            "device_name": device.device_name if device else "Unknown",
            "percent": percent,
            "status": status
        })
        if status != "success":
            completed = False
    return {"devices": devices, "completed": completed}

@router.post("/retry")
def retry_failed(data: RetryRequest, db: Session = Depends(get_db)):
    device_ids = data.device_ids
    # Simulate retry logic
    for device_id in device_ids:
        # Add checkpoint for retry
        checkpoint = Checkpoint(
            deployment_id=1,  # You might want to pass deployment_id in the request
            step=f"retry_device_{device_id}",
            status="success",
            timestamp=datetime.utcnow()
        )
        db.add(checkpoint)
    db.commit()
    return {"status": "retrying"}