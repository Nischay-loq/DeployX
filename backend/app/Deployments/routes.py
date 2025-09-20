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
    # Get deployment and validate it exists
    deployment = db.query(Deployment).filter(Deployment.id == deployment_id).first()
    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found")
    
    # Get all targets for this deployment
    targets = db.query(DeploymentTarget).filter(DeploymentTarget.deployment_id == deployment_id).all()
    devices = []
    completed = True
    
    for target in targets:
        device = db.query(Devices).filter(Devices.id == target.device_id).first()
        
        # Use real progress data from the target
        percent = target.progress_percent or 0
        status = target.status or "pending"
        
        # Determine if this target affects overall completion
        if status not in ["completed", "success"]:
            completed = False
        
        devices.append({
            "device_id": target.device_id,
            "device_name": device.device_name if device else f"Device {target.device_id}",
            "percent": percent,
            "status": status,
            "error": target.error_message,
            "started_at": target.started_at.isoformat() if target.started_at else None,
            "completed_at": target.completed_at.isoformat() if target.completed_at else None
        })
    
    # Update deployment status based on targets
    if completed and all(d["status"] in ["completed", "success"] for d in devices):
        if deployment.status != "completed":
            deployment.status = "completed"
            deployment.ended_at = datetime.utcnow()
            db.commit()
    elif any(d["status"] == "failed" for d in devices):
        if deployment.status != "failed":
            deployment.status = "failed"
            deployment.ended_at = datetime.utcnow()
            db.commit()
    elif any(d["status"] in ["running", "in_progress"] for d in devices):
        if deployment.status not in ["running", "in_progress"]:
            deployment.status = "in_progress"
            db.commit()
    
    return {
        "deployment_id": deployment_id,
        "deployment_status": deployment.status,
        "devices": devices, 
        "completed": completed,
        "started_at": deployment.started_at.isoformat() if deployment.started_at else None,
        "ended_at": deployment.ended_at.isoformat() if deployment.ended_at else None
    }

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