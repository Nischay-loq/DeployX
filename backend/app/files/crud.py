from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional
import json
from datetime import datetime
from app.files.models import (
    UploadedFile, FileDeployment, FileDeploymentResult,
    FileDeploymentRequest, FileDeploymentResultSchema
)

def create_uploaded_file(db: Session, filename: str, original_filename: str, 
                        file_path: str, file_size: int, content_type: str, 
                        checksum: str, user_id: int) -> UploadedFile:
    """Create a new uploaded file record"""
    db_file = UploadedFile(
        filename=filename,
        original_filename=original_filename,
        file_path=file_path,
        file_size=file_size,
        content_type=content_type,
        checksum=checksum,
        uploaded_by=user_id
    )
    db.add(db_file)
    db.commit()
    db.refresh(db_file)
    return db_file

def get_uploaded_file(db: Session, file_id: int, user_id: int) -> Optional[UploadedFile]:
    """Get an uploaded file by ID and user"""
    return db.query(UploadedFile).filter(
        and_(UploadedFile.id == file_id, UploadedFile.uploaded_by == user_id)
    ).first()

def get_uploaded_files(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[UploadedFile]:
    """Get all uploaded files for a user"""
    return db.query(UploadedFile).filter(
        UploadedFile.uploaded_by == user_id
    ).offset(skip).limit(limit).all()

def delete_uploaded_file(db: Session, file_id: int, user_id: int) -> bool:
    """Delete an uploaded file"""
    file_obj = db.query(UploadedFile).filter(
        and_(UploadedFile.id == file_id, UploadedFile.uploaded_by == user_id)
    ).first()
    
    if file_obj:
        db.delete(file_obj)
        db.commit()
        return True
    return False

def create_file_deployment(db: Session, deployment_request: FileDeploymentRequest, 
                          user_id: int) -> FileDeployment:
    """Create a new file deployment"""
    db_deployment = FileDeployment(
        file_ids=json.dumps(deployment_request.file_ids),
        deployment_name=deployment_request.deployment_name or f"Deployment-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}",
        target_path=deployment_request.target_path,
        device_ids=json.dumps(deployment_request.device_ids),
        group_ids=json.dumps(deployment_request.group_ids),
        created_by=user_id,
        status="pending"
    )
    db.add(db_deployment)
    db.commit()
    db.refresh(db_deployment)
    return db_deployment

def get_file_deployment(db: Session, deployment_id: int, user_id: int) -> Optional[FileDeployment]:
    """Get a file deployment by ID and user"""
    return db.query(FileDeployment).filter(
        and_(FileDeployment.id == deployment_id, FileDeployment.created_by == user_id)
    ).first()

def get_file_deployment_by_id(db: Session, deployment_id: int) -> Optional[FileDeployment]:
    """Get a file deployment by ID (without user filter)"""
    return db.query(FileDeployment).filter(FileDeployment.id == deployment_id).first()

def get_uploaded_file_by_id(db: Session, file_id: int) -> Optional[UploadedFile]:
    """Get an uploaded file by ID (without user filter)"""
    return db.query(UploadedFile).filter(UploadedFile.id == file_id).first()

def get_file_deployments(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[FileDeployment]:
    """Get all file deployments for a user"""
    return db.query(FileDeployment).filter(
        FileDeployment.created_by == user_id
    ).order_by(FileDeployment.created_at.desc()).offset(skip).limit(limit).all()

def update_deployment_status(db: Session, deployment_id: int, status: str, 
                           started_at: Optional[datetime] = None, 
                           completed_at: Optional[datetime] = None) -> bool:
    """Update deployment status"""
    deployment = db.query(FileDeployment).filter(FileDeployment.id == deployment_id).first()
    if deployment:
        deployment.status = status
        if started_at:
            deployment.started_at = started_at
        if completed_at:
            deployment.completed_at = completed_at
        db.commit()
        return True
    return False

def create_deployment_result(db: Session, deployment_id: int, device_id: int, 
                           file_id: int, status: str, message: str, path_created: bool = False,
                           error_details: Optional[str] = None) -> FileDeploymentResult:
    """Create a deployment result"""
    db_result = FileDeploymentResult(
        deployment_id=deployment_id,
        device_id=device_id,
        file_id=file_id,
        status=status,
        message=message,
        path_created=path_created,
        error_details=error_details,
        deployed_at=datetime.utcnow() if status == "success" else None
    )
    db.add(db_result)
    db.commit()
    db.refresh(db_result)
    return db_result

def get_deployment_results(db: Session, deployment_id: int) -> List[FileDeploymentResult]:
    """Get all results for a deployment"""
    return db.query(FileDeploymentResult).filter(
        FileDeploymentResult.deployment_id == deployment_id
    ).all()

def update_deployment_result(db: Session, result_id: int, status: str, 
                           message: str, error_details: Optional[str] = None) -> bool:
    """Update a deployment result"""
    result = db.query(FileDeploymentResult).filter(
        FileDeploymentResult.id == result_id
    ).first()
    
    if result:
        result.status = status
        result.message = message
        if error_details:
            result.error_details = error_details
        if status == "success":
            result.deployed_at = datetime.utcnow()
        db.commit()
        return True
    return False