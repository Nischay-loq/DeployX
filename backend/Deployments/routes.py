from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .schemas import DeploymentCreate, DeploymentResponse, DeploymentProgressResponse
from .models import Deployment, DeploymentTarget, Checkpoint
from grouping.models import DeviceGroupMap, Devices, DeviceGroups
from auth.database import get_db
from datetime import datetime

router = APIRouter(prefix="/deployments", tags=["Deployments"])

@router.post("/", response_model=DeploymentResponse)
def start_deployment(data: DeploymentCreate, db: Session = Depends(get_db)):
    # Create deployment
    deployment = Deployment(
        deployment_name=data.deployment_name or "Deployment",
        status="in_progress",
        started_at=datetime.utcnow()
    )
    db.add(deployment)
    db.commit()
    db.refresh(deployment)

    # Find devices in selected groups
    device_ids = db.query(DeviceGroupMap.device_id).filter(DeviceGroupMap.group_id.in_(data.group_ids)).all()
    device_ids = [d[0] for d in device_ids]
    for device_id in device_ids:
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
def retry_failed(data: dict, db: Session = Depends(get_db)):
    device_ids = data.get("device_ids", [])
    # Simulate retry logic
    for device_id in device_ids:
        # Add checkpoint for retry
        checkpoint = Checkpoint(
            deployment_id=data.get("deployment_id"),
            step=f"retry_device_{device_id}",
            status="success",
            timestamp=datetime.utcnow()
        )
        db.add(checkpoint)
    db.commit()
    return {"status": "retrying"}