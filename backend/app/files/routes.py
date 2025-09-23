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
from datetime import datetime
from pathlib import Path

from app.auth.database import get_db
from app.auth.utils import get_current_user
from app.auth.models import User
from app.files import crud, schemas
from app.files.models import UploadedFile, FileDeployment
from app.Devices.crud import get_device, get_devices_by_ids
from app.grouping.crud import get_group, get_devices_in_groups

router = APIRouter(prefix="/files", tags=["files"])

# Configuration
UPLOAD_DIR = "uploads"
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB
ALLOWED_EXTENSIONS = {
    ".txt", ".pdf", ".doc", ".docx", ".xlsx", ".pptx", ".zip", ".tar", ".gz",
    ".jpg", ".jpeg", ".png", ".gif", ".mp4", ".avi", ".mp3", ".wav",
    ".py", ".js", ".html", ".css", ".json", ".xml", ".yml", ".yaml",
    ".exe", ".msi", ".deb", ".rpm", ".dmg", ".pkg"
}

# Ensure upload directory exists
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
            # Validate file
            is_valid, message = validate_file(file)
            if not is_valid:
                raise HTTPException(status_code=400, detail=f"{file.filename}: {message}")
            
            # Generate unique filename
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            file_ext = Path(file.filename).suffix
            unique_filename = f"{timestamp}_{file.filename}"
            file_path = os.path.join(UPLOAD_DIR, unique_filename)
            
            # Save file
            with open(file_path, 'wb') as f:
                content = await file.read()
                f.write(content)
            
            # Calculate file hash
            file_hash = calculate_file_hash(file_path)
            
            # Create database record
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
        # Clean up any uploaded files on error
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
    
    # Validate files exist and belong to user
    files = []
    for file_id in deployment_request.file_ids:
        file_obj = crud.get_uploaded_file(db, file_id, current_user.id)
        if not file_obj:
            raise HTTPException(status_code=404, detail=f"File with ID {file_id} not found")
        files.append(file_obj)
    
    # Get target devices
    target_device_ids = set(deployment_request.device_ids)
    
    # Add devices from groups
    if deployment_request.group_ids:
        group_devices = get_devices_in_groups(db, deployment_request.group_ids)
        target_device_ids.update([device.id for device in group_devices])
    
    if not target_device_ids:
        raise HTTPException(status_code=400, detail="No target devices specified")
    
    # Validate devices exist
    devices = get_devices_by_ids(db, list(target_device_ids))
    if len(devices) != len(target_device_ids):
        raise HTTPException(status_code=404, detail="Some target devices not found")
    
    # Create deployment record
    deployment = crud.create_file_deployment(db, deployment_request, current_user.id)
    
    # Start deployment process asynchronously
    asyncio.create_task(process_file_deployment(deployment.id, files, devices, deployment_request, db))
    
    return schemas.FileDeploymentResponse(
        success=True,
        message="File deployment started successfully",
        deployment_id=deployment.id
    )

async def process_file_deployment(deployment_id: int, files: List[UploadedFile], 
                                devices: List, deployment_request: schemas.FileDeploymentRequest, db: Session):
    """Process file deployment asynchronously"""
    
    # Update deployment status to in_progress
    crud.update_deployment_status(db, deployment_id, "in_progress", started_at=datetime.utcnow())
    
    successful_deployments = 0
    failed_deployments = 0
    
    try:
        for device in devices:
            for file_obj in files:
                try:
                    # Simulate file deployment (replace with actual deployment logic)
                    await asyncio.sleep(1)  # Simulate network delay
                    
                    # Check if path exists (simulated)
                    path_exists = await simulate_path_check(device.id, deployment_request.target_path)
                    
                    # Create path if needed (simulated)
                    path_created = False
                    if not path_exists and deployment_request.create_path_if_not_exists:
                        path_created = await simulate_path_creation(device.id, deployment_request.target_path)
                        if not path_created:
                            crud.create_deployment_result(
                                db, deployment_id, device.id, file_obj.id, "error",
                                f"Failed to create path: {deployment_request.target_path}",
                                path_created=False,
                                error_details="Path creation failed - permission denied or invalid path"
                            )
                            failed_deployments += 1
                            continue
                    
                    # Deploy file (simulated)
                    deployment_success = await simulate_file_deployment(
                        device.id, file_obj.file_path, deployment_request.target_path
                    )
                    
                    if deployment_success:
                        message = f"File deployed successfully to {deployment_request.target_path}"
                        if path_created:
                            message += " (path created)"
                        
                        crud.create_deployment_result(
                            db, deployment_id, device.id, file_obj.id, "success",
                            message, path_created=path_created
                        )
                        successful_deployments += 1
                    else:
                        crud.create_deployment_result(
                            db, deployment_id, device.id, file_obj.id, "error",
                            "File deployment failed",
                            error_details="Network error or permission denied"
                        )
                        failed_deployments += 1
                        
                except Exception as e:
                    crud.create_deployment_result(
                        db, deployment_id, device.id, file_obj.id, "error",
                        f"Deployment error: {str(e)}",
                        error_details=str(e)
                    )
                    failed_deployments += 1
        
        # Update deployment status
        final_status = "completed" if failed_deployments == 0 else "partial_failure"
        if successful_deployments == 0:
            final_status = "failed"
        
        crud.update_deployment_status(db, deployment_id, final_status, completed_at=datetime.utcnow())
        
    except Exception as e:
        crud.update_deployment_status(db, deployment_id, "failed", completed_at=datetime.utcnow())

async def simulate_path_check(device_id: int, path: str) -> bool:
    """Simulate checking if path exists on device"""
    # This would be replaced with actual device communication
    await asyncio.sleep(0.5)
    return random.random() > 0.3  # 70% chance path exists

async def simulate_path_creation(device_id: int, path: str) -> bool:
    """Simulate creating path on device"""
    # This would be replaced with actual device communication
    await asyncio.sleep(0.5)
    return random.random() > 0.1  # 90% success rate

async def simulate_file_deployment(device_id: int, file_path: str, target_path: str) -> bool:
    """Simulate deploying file to device"""
    # This would be replaced with actual file transfer
    await asyncio.sleep(1)
    return random.random() > 0.2  # 80% success rate

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
    
    # Get device names for results
    device_ids = [r.device_id for r in results]
    devices = get_devices_by_ids(db, device_ids)
    device_map = {d.id: d for d in devices}
    
    # Get file names
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
    
    # Remove physical file
    if os.path.exists(file_obj.file_path):
        os.remove(file_obj.file_path)
    
    # Remove database record
    success = crud.delete_uploaded_file(db, file_id, current_user.id)
    
    if success:
        return {"message": "File deleted successfully"}
    else:
        raise HTTPException(status_code=500, detail="Failed to delete file")