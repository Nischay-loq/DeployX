from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import random
import shutil
import hashlib
import json
import asyncio
import logging
from datetime import datetime
from pathlib import Path

from app.auth.database import get_db, User
from app.auth.utils import get_current_user
from app.files import crud
from app.files import models as schemas
from app.files.models import UploadedFile, FileDeployment
from app.Devices.crud import get_device, get_devices_by_ids
from app.grouping.crud import get_group, get_devices_in_groups

# Import Socket.IO components at module level to avoid circular imports
sio = None
conn_manager = None

def get_socketio_components():
    """Get Socket.IO components with lazy loading to avoid circular imports"""
    global sio, conn_manager
    if sio is None or conn_manager is None:
        try:
            from app.main import sio as main_sio, conn_manager as main_conn_manager
            sio = main_sio
            conn_manager = main_conn_manager
        except ImportError as e:
            logger.error(f"Failed to import Socket.IO components: {e}")
            return None, None
    return sio, conn_manager

async def emit_file_deployment_notification(deployment_id: int, db: Session):
    """Emit socket.io notification when file deployment completes"""
    try:
        sio, _ = get_socketio_components()
        if sio is None:
            logger.warning("Socket.IO not available, skipping notification")
            return
        
        deployment = crud.get_file_deployment_by_id(db, deployment_id)
        if not deployment:
            return
        
        # Get deployment results statistics
        results = crud.get_deployment_results(db, deployment_id)
        
        total_count = len(results)
        success_count = sum(1 for r in results if r.status == 'success')
        failure_count = sum(1 for r in results if r.status == 'error')
        
        # Get first file name for the notification
        file_names = []
        for result in results[:3]:  # Get up to 3 file names
            file_obj = crud.get_uploaded_file_by_id(db, result.file_id)
            if file_obj:
                file_names.append(file_obj.filename)
        
        file_name = ', '.join(file_names) if file_names else 'Unknown files'
        if len(results) > 3:
            file_name += f' and {len(results) - 3} more'
        
        notification_data = {
            'deployment_id': deployment.id,
            'file_name': file_name,
            'status': deployment.status,
            'success_count': success_count,
            'failure_count': failure_count,
            'total_count': total_count,
            'created_at': deployment.created_at.isoformat() if deployment.created_at else None,
            'completed_at': deployment.completed_at.isoformat() if deployment.completed_at else None
        }
        
        # Emit to all connected frontend clients
        await sio.emit('file_deployment_completed', notification_data)
        logger.info(f"Emitted file_deployment_completed notification for deployment {deployment_id}")
        
    except Exception as e:
        logger.error(f"Error emitting file deployment notification: {e}", exc_info=True)

router = APIRouter(prefix="/files", tags=["files"])

logger = logging.getLogger(__name__)

UPLOAD_DIR = "uploads"
MAX_FILE_SIZE = 100 * 1024 * 1024
ALLOWED_EXTENSIONS = {
    ".txt", ".pdf", ".doc", ".docx", ".xlsx", ".pptx", ".zip", ".tar", ".gz",
    ".jpg", ".jpeg", ".png", ".gif", ".mp4", ".avi", ".mp3", ".wav",
    ".py", ".js", ".html", ".css", ".json", ".xml", ".yml", ".yaml",
    ".exe", ".msi", ".deb", ".rpm", ".dmg", ".pkg"
}

os.makedirs(UPLOAD_DIR, exist_ok=True)

def calculate_file_hash(file_path: str) -> str:
    """Calculate SHA-256 hash of a file"""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def validate_file(file: UploadFile) -> tuple[bool, str]:
    """Validate uploaded file"""
    if file.size > MAX_FILE_SIZE:
        return False, f"File size exceeds maximum limit of {MAX_FILE_SIZE // 1024 // 1024}MB"
    
    if file.size == 0:
        return False, "File appears to be empty"
    
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        return False, f"File type '{file_ext}' is not supported"
    
    return True, "File is valid"

@router.post("/upload", response_model=schemas.FileUploadResponse)
async def upload_files(
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload multiple files"""
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    
    uploaded_files = []
    file_ids = []
    
    try:
        for file in files:
            is_valid, message = validate_file(file)
            if not is_valid:
                raise HTTPException(status_code=400, detail=f"{file.filename}: {message}")
            
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            file_ext = Path(file.filename).suffix
            unique_filename = f"{timestamp}_{file.filename}"
            file_path = os.path.join(UPLOAD_DIR, unique_filename)
            
            with open(file_path, 'wb') as f:
                content = await file.read()
                f.write(content)
            
            file_hash = calculate_file_hash(file_path)
            
            db_file = crud.create_uploaded_file(
                db=db,
                filename=unique_filename,
                original_filename=file.filename,
                file_path=file_path,
                file_size=file.size,
                content_type=file.content_type,
                checksum=file_hash,
                user_id=current_user.id
            )
            
            file_ids.append(db_file.id)
            uploaded_files.append({
                "id": db_file.id,
                "filename": db_file.original_filename,
                "size": db_file.file_size,
                "content_type": db_file.content_type,
                "upload_time": db_file.upload_time.isoformat()
            })
        
        return schemas.FileUploadResponse(
            success=True,
            message=f"Successfully uploaded {len(files)} file(s)",
            file_ids=file_ids,
            files=uploaded_files
        )
        
    except Exception as e:
        for file_info in uploaded_files:
            try:
                file_obj = crud.get_uploaded_file(db, file_info["id"], current_user.id)
                if file_obj and os.path.exists(file_obj.file_path):
                    os.remove(file_obj.file_path)
                    crud.delete_uploaded_file(db, file_info["id"], current_user.id)
            except:
                pass
        
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")

@router.post("/deploy", response_model=schemas.FileDeploymentResponse)
async def deploy_files(
    deployment_request: schemas.FileDeploymentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Deploy files to devices"""
    
    files = []
    for file_id in deployment_request.file_ids:
        file_obj = crud.get_uploaded_file(db, file_id, current_user.id)
        if not file_obj:
            raise HTTPException(status_code=404, detail=f"File with ID {file_id} not found")
        files.append(file_obj)
    
    target_device_ids = set(deployment_request.device_ids)
    
    # Add devices from selected groups (only user's own groups)
    if deployment_request.group_ids:
        logger.info(f"Processing group_ids: {deployment_request.group_ids} for user {current_user.id}")
        # First verify that all group_ids belong to the current user
        from app.grouping.models import DeviceGroup, DeviceGroupMap
        
        user_group_ids = db.query(DeviceGroup.id).filter(
            DeviceGroup.id.in_(deployment_request.group_ids),
            DeviceGroup.user_id == current_user.id
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
    
    logger.info(f"Total target devices for file deployment: {len(target_device_ids)} - IDs: {list(target_device_ids)}")
    
    if not target_device_ids:
        raise HTTPException(status_code=400, detail="No target devices specified")
    
    devices = get_devices_by_ids(db, list(target_device_ids))
    if len(devices) != len(target_device_ids):
        raise HTTPException(status_code=404, detail="Some target devices not found")
    
    deployment = crud.create_file_deployment(db, deployment_request, current_user.id)
    
    # Start deployment process asynchronously
    asyncio.create_task(process_file_deployment_async(deployment.id, files, devices, deployment_request))
    
    return schemas.FileDeploymentResponse(
        success=True,
        message="File deployment started successfully",
        deployment_id=deployment.id
    )

async def process_file_deployment_async(deployment_id: int, files: List[UploadedFile], 
                                      devices: List, deployment_request: schemas.FileDeploymentRequest):
    """Async wrapper that creates its own database session"""
    try:
        # Create a new database session for this async task
        db = next(get_db())
        try:
            await process_file_deployment(deployment_id, files, devices, deployment_request, db)
        finally:
            db.close()
    except Exception as e:
        logger.exception(f"Error in async file deployment wrapper: {e}")

async def process_file_deployment(deployment_id: int, files: List[UploadedFile], 
                                devices: List, deployment_request: schemas.FileDeploymentRequest, db: Session):
    """Process file deployment asynchronously - Real implementation using Socket.IO"""
    import base64
    
    # Get Socket.IO components safely
    sio, conn_manager = get_socketio_components()
    if sio is None or conn_manager is None:
        logger.error("Socket.IO components not available, deployment failed")
        crud.update_deployment_status(db, deployment_id, "failed", completed_at=datetime.utcnow())
        return
    
    # Update deployment status to in_progress
    crud.update_deployment_status(db, deployment_id, "in_progress", started_at=datetime.utcnow())
    
    successful_deployments = 0
    failed_deployments = 0
    pending_deployments = 0
    
    try:
        for device in devices:
            # Check if agent is connected
            if not device.agent_id:
                logger.warning(f"Device {device.id} ({device.device_name}) has no agent_id")
                # Create failure result for all files
                for file_obj in files:
                    crud.create_deployment_result(
                        db, deployment_id, device.id, file_obj.id, "error",
                        "Device has no agent configured",
                        error_details="Device is not associated with an agent"
                    )
                    failed_deployments += 1
                continue
            
            agent_sid = conn_manager.get_agent_sid(device.agent_id)
            if not agent_sid:
                logger.warning(f"Agent {device.agent_id} for device {device.id} is not connected")
                for file_obj in files:
                    crud.create_deployment_result(
                        db, deployment_id, device.id, file_obj.id, "error",
                        f"Agent {device.agent_id} is not connected",
                        error_details="Agent is offline or disconnected"
                    )
                    failed_deployments += 1
                continue
            
            for file_obj in files:
                try:
                    if not os.path.exists(file_obj.file_path):
                        crud.create_deployment_result(
                            db, deployment_id, device.id, file_obj.id, "error",
                            f"Source file not found: {file_obj.file_path}",
                            error_details="File may have been deleted from server"
                        )
                        failed_deployments += 1
                        continue
                    
                    with open(file_obj.file_path, 'rb') as f:
                        file_data = f.read()
                    
                    file_data_b64 = base64.b64encode(file_data).decode('utf-8')
                    
                    logger.info(f"Sending file {file_obj.original_filename} to device {device.device_name} (agent: {device.agent_id})")
                    
                    try:
                        await sio.emit('receive_file', {
                            'deployment_id': deployment_id,
                            'file_id': file_obj.id,
                            'filename': file_obj.original_filename,
                            'file_data': file_data_b64,
                            'target_path': deployment_request.target_path,
                            'create_path_if_not_exists': deployment_request.create_path_if_not_exists
                        }, room=agent_sid)
                    except Exception as emit_error:
                        logger.error(f"Failed to emit file transfer to agent {device.agent_id}: {emit_error}")
                        crud.create_deployment_result(
                            db, deployment_id, device.id, file_obj.id, "error",
                            f"Failed to send file to agent: {str(emit_error)}",
                            error_details=str(emit_error)
                        )
                        failed_deployments += 1
                        continue
                    
                    crud.create_deployment_result(
                        db, deployment_id, device.id, file_obj.id, "pending",
                        f"File transfer initiated to {deployment_request.target_path}"
                    )
                    pending_deployments += 1
                    
                    logger.info(f"File transfer initiated for {file_obj.original_filename} to device {device.device_name}")
                    
                except Exception as e:
                    logger.exception(f"Error deploying file {file_obj.id} to device {device.id}: {e}")
                    crud.create_deployment_result(
                        db, deployment_id, device.id, file_obj.id, "error",
                        f"Deployment error: {str(e)}",
                        error_details=str(e)
                    )
                    failed_deployments += 1
        
        if pending_deployments > 0:
            logger.info(f"Deployment {deployment_id} has {pending_deployments} pending transfers")
            # Schedule status check after 30 seconds
            try:
                asyncio.create_task(update_deployment_final_status_async(deployment_id))
            except Exception as task_error:
                logger.error(f"Failed to schedule final status update task: {task_error}")
                crud.update_deployment_status(db, deployment_id, "failed", completed_at=datetime.utcnow())
        else:
            final_status = "failed"
            crud.update_deployment_status(db, deployment_id, final_status, completed_at=datetime.utcnow())
        
    except Exception as e:
        logger.exception(f"Error in process_file_deployment: {e}")
        crud.update_deployment_status(db, deployment_id, "failed", completed_at=datetime.utcnow())

async def update_deployment_final_status_async(deployment_id: int, check_delay: int = 30):
    """Async wrapper for final status update that creates its own DB session"""
    try:
        db = next(get_db())
        try:
            await update_deployment_final_status(deployment_id, db, check_delay)
        finally:
            db.close()
    except Exception as e:
        logger.exception(f"Error in async final status update wrapper: {e}")

async def update_deployment_final_status(deployment_id: int, db: Session, check_delay: int = 30):
    """Check deployment results and update final status after delay"""
    try:
        await asyncio.sleep(check_delay)
        
        results = crud.get_deployment_results(db, deployment_id)
        
        if not results:
            crud.update_deployment_status(db, deployment_id, "failed", completed_at=datetime.utcnow())
            return
        
        pending_count = len([r for r in results if r.status == "pending"])
        success_count = len([r for r in results if r.status == "success"])
        error_count = len([r for r in results if r.status == "error"])
        
        if pending_count > 0:
            if check_delay > 0:  # Only retry if not already in retry mode
                logger.info(f"Deployment {deployment_id} still has {pending_count} pending transfers, checking again in 30s")
                await asyncio.sleep(30)
                await update_deployment_final_status(deployment_id, db, check_delay=0)
            else:
                logger.warning(f"Deployment {deployment_id} timed out with {pending_count} pending transfers")
                final_status = "partial_failure" if success_count > 0 else "failed"
                crud.update_deployment_status(db, deployment_id, final_status, completed_at=datetime.utcnow())
            return
        
        if error_count == 0:
            final_status = "completed"
        elif success_count == 0:
            final_status = "failed"
        else:
            final_status = "partial_failure"
        
        crud.update_deployment_status(db, deployment_id, final_status, completed_at=datetime.utcnow())
        logger.info(f"Updated deployment {deployment_id} final status to {final_status}")
        
        # Emit socket notification
        await emit_file_deployment_notification(deployment_id, db)
        
    except Exception as e:
        logger.exception(f"Error updating deployment final status: {e}")

@router.get("/deployments/{deployment_id}/progress", response_model=schemas.FileDeploymentProgress)
async def get_deployment_progress(
    deployment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get deployment progress"""
    
    deployment = crud.get_file_deployment(db, deployment_id, current_user.id)
    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found")
    
    results = crud.get_deployment_results(db, deployment_id)
    
    device_ids = [r.device_id for r in results]
    devices = get_devices_by_ids(db, device_ids)
    device_map = {d.id: d for d in devices}
    
    file_ids = json.loads(deployment.file_ids or "[]")
    files = []
    for file_id in file_ids:
        file_obj = crud.get_uploaded_file(db, file_id, current_user.id)
        if file_obj:
            files.append(file_obj)
    file_map = {f.id: f for f in files}
    
    result_data = []
    for result in results:
        device = device_map.get(result.device_id)
        file_obj = file_map.get(result.file_id) if result.file_id else None
        
        result_data.append({
            "deviceId": result.device_id,
            "deviceName": device.device_name if device else f"Device-{result.device_id}",
            "fileName": file_obj.original_filename if file_obj else "Unknown",
            "status": result.status,
            "message": result.message,
            "pathCreated": result.path_created,
            "deployedAt": result.deployed_at.isoformat() if result.deployed_at else None,
            "errorDetails": result.error_details
        })
    
    completed_count = len([r for r in results if r.status in ["success", "error"]])
    failed_count = len([r for r in results if r.status == "error"])
    
    return schemas.FileDeploymentProgress(
        deployment_id=deployment_id,
        status=deployment.status,
        total_operations=len(results),
        completed_operations=completed_count,
        failed_operations=failed_count,
        results=result_data
    )

@router.get("/deployments")
async def get_file_deployments(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get file deployment history"""
    
    deployments = crud.get_file_deployments(db, current_user.id, skip, limit)
    
    result = []
    for deployment in deployments:
        result.append({
            "id": deployment.id,
            "name": deployment.deployment_name,
            "target_path": deployment.target_path,
            "status": deployment.status,
            "created_at": deployment.created_at.isoformat(),
            "completed_at": deployment.completed_at.isoformat() if deployment.completed_at else None
        })
    
    return result

@router.delete("/{file_id}")
async def delete_file(
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an uploaded file"""
    
    file_obj = crud.get_uploaded_file(db, file_id, current_user.id)
    if not file_obj:
        raise HTTPException(status_code=404, detail="File not found")
    
    if os.path.exists(file_obj.file_path):
        os.remove(file_obj.file_path)
    
    # Remove database record
    success = crud.delete_uploaded_file(db, file_id, current_user.id)
    
    if success:
        return {"message": "File deleted successfully"}
    else:
        raise HTTPException(status_code=500, detail="Failed to delete file")