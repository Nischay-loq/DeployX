from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from .models import (
    Deployment, DeploymentTarget, Checkpoint,
    DeploymentCreate, DeploymentResponse, DeploymentProgressResponse, 
    RetryRequest, DeploymentListResponse
)
from .executor import SoftwareDeploymentExecutor
from app.grouping.models import DeviceGroupMap, Device as Devices, DeviceGroup as DeviceGroups
from app.auth.database import get_db, User
from app.auth.utils import get_current_user
from datetime import datetime
from typing import List, Optional
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/deployments", tags=["Deployments"])

@router.get("/", response_model=List[DeploymentListResponse])
def get_user_deployments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all deployments for the current user"""
    deployments = db.query(Deployment).filter(
        Deployment.initiated_by == current_user.id
    ).order_by(Deployment.started_at.desc()).all()
    
    result = []
    for deployment in deployments:
        # Count total devices in deployment
        device_count = db.query(DeploymentTarget).filter(
            DeploymentTarget.deployment_id == deployment.id
        ).count()
        
        result.append({
            "id": deployment.id,
            "deployment_name": deployment.deployment_name,
            "status": deployment.status,
            "started_at": deployment.started_at.isoformat() if deployment.started_at else None,
            "ended_at": deployment.ended_at.isoformat() if deployment.ended_at else None,
            "device_count": device_count
        })
    
    return result

@router.post("/install", response_model=DeploymentResponse)
async def install_software(
    data: DeploymentCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Create deployment with user association
    deployment = Deployment(
        deployment_name=data.deployment_name or "Software Installation",
        initiated_by=current_user.id,
        status="in_progress",
        started_at=datetime.utcnow()
    )
    db.add(deployment)
    db.commit()
    db.refresh(deployment)

    # Collect all target device IDs
    target_device_ids = set(data.device_ids)
    
    # Add devices from selected groups (only user's own groups)
    if data.group_ids:
        # First verify that all group_ids belong to the current user
        user_group_ids = db.query(DeviceGroups.id).filter(
            DeviceGroups.id.in_(data.group_ids),
            DeviceGroups.user_id == current_user.id
        ).all()
        user_group_ids = [g[0] for g in user_group_ids]
        
        if user_group_ids:
            group_device_ids = db.query(DeviceGroupMap.device_id).filter(
                DeviceGroupMap.group_id.in_(user_group_ids)
            ).all()
            target_device_ids.update([d[0] for d in group_device_ids])

    if not target_device_ids:
        raise HTTPException(status_code=400, detail="No target devices found")

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

    # Execute deployment in background
    logger.info(f"✓ Created deployment {deployment.id} for {len(target_device_ids)} devices")
    logger.info(f"✓ Software IDs: {data.software_ids}")
    logger.info(f"✓ Target devices: {list(target_device_ids)}")
    
    # Deploy in background - executor will create its own DB session
    background_tasks.add_task(
        execute_deployment_background,
        deployment.id,
        data.software_ids,
        list(target_device_ids),
        data.custom_software
    )
    
    logger.info(f"✓ Background task added for deployment {deployment.id}")

    return {"deployment_id": deployment.id}

def execute_deployment_background(
    deployment_id: int,
    software_ids: List[int],
    device_ids: List[int],
    custom_software: Optional[str] = None
):
    """Execute deployment in background with its own DB session"""
    from app.auth.database import SessionLocal
    
    logger.info(f"[BACKGROUND] Starting deployment {deployment_id}")
    
    db = SessionLocal()
    try:
        executor = SoftwareDeploymentExecutor(db)
        result = executor.deploy_to_devices(
            deployment_id,
            software_ids,
            device_ids,
            custom_software
        )
        logger.info(f"[BACKGROUND] Deployment {deployment_id} completed: {result}")
    except Exception as e:
        logger.error(f"[BACKGROUND] Error in deployment {deployment_id}: {e}", exc_info=True)
    finally:
        db.close()

@router.get("/{deployment_id}/progress", response_model=DeploymentProgressResponse)
def get_progress(
    deployment_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # First verify that the deployment belongs to the current user
    deployment = db.query(Deployment).filter(
        Deployment.id == deployment_id,
        Deployment.initiated_by == current_user.id
    ).first()
    
    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found or access denied")
    
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
def retry_failed(
    data: RetryRequest, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify deployment belongs to user if deployment_id is provided
    if hasattr(data, 'deployment_id') and data.deployment_id:
        deployment = db.query(Deployment).filter(
            Deployment.id == data.deployment_id,
            Deployment.initiated_by == current_user.id
        ).first()
        
        if not deployment:
            raise HTTPException(status_code=404, detail="Deployment not found or access denied")
        
        deployment_id = data.deployment_id
    else:
        # For backward compatibility, if no deployment_id provided, use 1
        # This should be updated to require deployment_id in the schema
        deployment_id = 1
    
    device_ids = data.device_ids
    # Simulate retry logic
    for device_id in device_ids:
        # Add checkpoint for retry
        checkpoint = Checkpoint(
            deployment_id=deployment_id,
            step=f"retry_device_{device_id}",
            status="success",
            timestamp=datetime.utcnow()
        )
        db.add(checkpoint)
    db.commit()
    return {"status": "retrying"}