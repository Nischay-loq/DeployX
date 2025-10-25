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
from app.software.models import Software
from datetime import datetime
from typing import List, Optional
import logging
import json
import asyncio

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/deployments", tags=["Deployments"])

# Helper function to emit socket events
async def emit_deployment_notification(deployment_id: int, db: Session):
    """Emit socket.io notification when deployment completes"""
    try:
        from app.main import sio
        
        deployment = db.query(Deployment).filter(Deployment.id == deployment_id).first()
        if not deployment:
            return
        
        # Get deployment targets statistics
        targets = db.query(DeploymentTarget).filter(DeploymentTarget.deployment_id == deployment_id).all()
        
        total_count = len(targets)
        success_count = sum(1 for t in targets if t.status == 'completed')
        failure_count = sum(1 for t in targets if t.status == 'failed')
        
        notification_data = {
            'deployment_id': deployment.id,
            'deployment_name': deployment.name,
            'status': deployment.status,
            'success_count': success_count,
            'failure_count': failure_count,
            'total_count': total_count,
            'created_at': deployment.created_at.isoformat() if deployment.created_at else None,
            'ended_at': deployment.ended_at.isoformat() if deployment.ended_at else None
        }
        
        # Emit to all connected frontend clients
        await sio.emit('deployment_completed', notification_data)
        logger.info(f"Emitted deployment_completed notification for deployment {deployment_id}")
        
    except Exception as e:
        logger.error(f"Error emitting deployment notification: {e}", exc_info=True)



def update_deployment_status(deployment_id: int, db: Session):
    """Update overall deployment status based on target device statuses"""
    try:
        deployment = db.query(Deployment).filter(Deployment.id == deployment_id).first()
        if not deployment:
            logger.error(f"Deployment {deployment_id} not found")
            return
        
        # Get all deployment targets
        targets = db.query(DeploymentTarget).filter(
            DeploymentTarget.deployment_id == deployment_id
        ).all()
        
        if not targets:
            deployment.status = "failed"
            deployment.ended_at = datetime.utcnow()
            db.commit()
            return
        
        # Count statuses
        total = len(targets)
        completed = sum(1 for t in targets if t.status == "success")
        failed = sum(1 for t in targets if t.status == "failed")
        in_progress = sum(1 for t in targets if t.status == "in_progress")
        pending = sum(1 for t in targets if t.status == "pending")
        
        # Determine overall status
        if completed == total:
            deployment.status = "completed"
            deployment.ended_at = datetime.utcnow()
        elif failed == total:
            deployment.status = "failed"
            deployment.ended_at = datetime.utcnow()
        elif failed > 0 and (completed + failed) == total:
            deployment.status = "partial"
            deployment.ended_at = datetime.utcnow()
        elif in_progress > 0 or pending > 0:
            deployment.status = "in_progress"
        else:
            deployment.status = "completed"
            deployment.ended_at = datetime.utcnow()
        
        db.commit()
        logger.info(
            f"Updated deployment {deployment_id} status to {deployment.status} "
            f"(total: {total}, completed: {completed}, failed: {failed}, in_progress: {in_progress}, pending: {pending})"
        )
        
    except Exception as e:
        logger.error(f"Error updating deployment status: {e}", exc_info=True)


# Add a simple test endpoint without auth
@router.get("/test")
def test_endpoint():
    """Test endpoint without authentication"""
    return {"message": "Deployments router is working"}

@router.get("", response_model=List[DeploymentListResponse])
@router.get("/", response_model=List[DeploymentListResponse])
def get_user_deployments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all deployments for the current user"""
    try:
        logger.info(f"Fetching deployments for user {current_user.id}")
        deployments = db.query(Deployment).filter(
            Deployment.initiated_by == current_user.id
        ).order_by(Deployment.started_at.desc()).all()
        
        logger.info(f"Found {len(deployments)} deployments")
        
        result = []
        for deployment in deployments:
            # Count total devices in deployment
            device_count = db.query(DeploymentTarget).filter(
                DeploymentTarget.deployment_id == deployment.id
            ).count()
            
            # Get software information
            software_list = []
            if deployment.software_ids:
                try:
                    software_ids = json.loads(deployment.software_ids)
                    if software_ids:
                        software_items = db.query(Software).filter(
                            Software.id.in_(software_ids)
                        ).all()
                        software_list = [{"id": sw.id, "name": sw.name, "version": sw.version} for sw in software_items]
                except (json.JSONDecodeError, TypeError):
                    software_list = []
            
            result.append({
                "id": deployment.id,
                "deployment_name": deployment.deployment_name,
                "status": deployment.status,
                "started_at": deployment.started_at.isoformat() if deployment.started_at else None,
                "ended_at": deployment.ended_at.isoformat() if deployment.ended_at else None,
                "device_count": device_count,
                "rollback_performed": deployment.rollback_performed,
                "software": software_list,
                "custom_software": deployment.custom_software
            })
        
        logger.info(f"Returning {len(result)} deployments")
        return result
    except Exception as e:
        logger.error(f"Error fetching deployments: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error fetching deployments: {str(e)}")


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
        started_at=datetime.utcnow(),
        software_ids=json.dumps(data.software_ids) if data.software_ids else None,
        custom_software=data.custom_software
    )
    db.add(deployment)
    db.commit()
    db.refresh(deployment)

    # Collect all target device IDs
    target_device_ids = set(data.device_ids)
    logger.info(f"Initial device_ids from request: {data.device_ids}")
    
    # Add devices from selected groups (only user's own groups)
    if data.group_ids:
        logger.info(f"Processing group_ids: {data.group_ids} for user {current_user.id}")
        # First verify that all group_ids belong to the current user
        user_group_ids = db.query(DeviceGroups.id).filter(
            DeviceGroups.id.in_(data.group_ids),
            DeviceGroups.user_id == current_user.id
        ).all()
        user_group_ids = [g[0] for g in user_group_ids]
        logger.info(f"Found {len(user_group_ids)} groups belonging to user: {user_group_ids}")
        
        if user_group_ids:
            group_device_ids = db.query(DeviceGroupMap.device_id).filter(
                DeviceGroupMap.group_id.in_(user_group_ids)
            ).all()
            group_device_ids = [d[0] for d in group_device_ids]
            logger.info(f"Found {len(group_device_ids)} devices in groups: {group_device_ids}")
            target_device_ids.update(group_device_ids)
    
    logger.info(f"Total target devices after processing groups: {len(target_device_ids)} - IDs: {list(target_device_ids)}")

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
        
        # Update overall deployment status
        update_deployment_status(deployment_id, db)
        
        # Emit socket notification
        asyncio.create_task(emit_deployment_notification(deployment_id, db))
        
    except Exception as e:
        logger.error(f"[BACKGROUND] Error in deployment {deployment_id}: {e}", exc_info=True)
        # Mark deployment as failed
        deployment = db.query(Deployment).filter(Deployment.id == deployment_id).first()
        if deployment:
            deployment.status = "failed"
            deployment.ended_at = datetime.utcnow()
            db.commit()
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

@router.get("/{deployment_id}/details")
def get_deployment_details(
    deployment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detailed information for a specific deployment"""
    deployment = db.query(Deployment).filter(
        Deployment.id == deployment_id,
        Deployment.initiated_by == current_user.id
    ).first()
    
    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found")
    
    # Get software information
    software_list = []
    if deployment.software_ids:
        try:
            software_ids = json.loads(deployment.software_ids)
            if software_ids:
                software_items = db.query(Software).filter(
                    Software.id.in_(software_ids)
                ).all()
                software_list = [{"id": sw.id, "name": sw.name, "version": sw.version} for sw in software_items]
        except (json.JSONDecodeError, TypeError):
            software_list = []
    
    return {
        "software": software_list,
        "custom_software": deployment.custom_software
    }

@router.get("/by-date/{date}")
def get_deployments_by_date(
    date: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all deployments for a specific date (YYYY-MM-DD)"""
    try:
        from sqlalchemy import func
        from datetime import datetime
        from app.files.models import FileDeployment
        
        # Parse the date
        target_date = datetime.strptime(date, "%Y-%m-%d").date()
        
        # Get software deployments for this date
        software_deployments = db.query(Deployment).filter(
            Deployment.initiated_by == current_user.id,
            func.date(Deployment.started_at) == target_date
        ).all()
        
        # Get file deployments for this date
        file_deployments = db.query(FileDeployment).filter(
            FileDeployment.created_by == current_user.id,
            func.date(FileDeployment.started_at) == target_date
        ).all()
        
        # Format software deployments
        software_list = []
        for dep in software_deployments:
            device_count = db.query(DeploymentTarget).filter(
                DeploymentTarget.deployment_id == dep.id
            ).count()
            
            software_list.append({
                "id": dep.id,
                "type": "software",
                "name": dep.deployment_name or f"Deployment {dep.id}",
                "status": dep.status,
                "started_at": dep.started_at.isoformat() if dep.started_at else None,
                "ended_at": dep.ended_at.isoformat() if dep.ended_at else None,
                "device_count": device_count,
                "software_ids": dep.software_ids,
                "custom_software": dep.custom_software
            })
        
        # Format file deployments
        file_list = []
        for dep in file_deployments:
            try:
                device_ids = json.loads(dep.device_ids) if dep.device_ids else []
                file_ids = json.loads(dep.file_ids) if dep.file_ids else []
            except:
                device_ids = []
                file_ids = []
            
            file_list.append({
                "id": dep.id,
                "type": "file",
                "name": dep.deployment_name or f"File Deployment {dep.id}",
                "status": dep.status,
                "started_at": dep.started_at.isoformat() if dep.started_at else None,
                "completed_at": dep.completed_at.isoformat() if dep.completed_at else None,
                "device_count": len(device_ids),
                "file_count": len(file_ids),
                "target_path": dep.target_path
            })
        
        return {
            "date": date,
            "total_deployments": len(software_list) + len(file_list),
            "software_deployments": software_list,
            "file_deployments": file_list,
            "summary": {
                "software_count": len(software_list),
                "file_count": len(file_list),
                "total_successful": sum(1 for d in software_list if d["status"] == "completed") + 
                                   sum(1 for d in file_list if d["status"] == "completed"),
                "total_failed": sum(1 for d in software_list if d["status"] == "failed") + 
                               sum(1 for d in file_list if d["status"] == "failed"),
                "total_pending": sum(1 for d in software_list if d["status"] in ["pending", "in_progress"]) + 
                                sum(1 for d in file_list if d["status"] in ["pending", "in_progress"])
            }
        }
        
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    except Exception as e:
        logger.error(f"Error fetching deployments by date: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch deployments")