from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
from app.auth.database import Base
from pydantic import BaseModel, validator
from typing import List, Optional

class UploadedFile(Base):
    __tablename__ = "uploaded_files"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False)
    content_type = Column(String(100))
    checksum = Column(String(64))
    upload_time = Column(DateTime, default=datetime.utcnow)
    uploaded_by = Column(Integer, ForeignKey("users.id"))

class FileDeployment(Base):
    __tablename__ = "file_deployments"
    
    id = Column(Integer, primary_key=True, index=True)
    file_ids = Column(Text)
    deployment_name = Column(String(255))
    target_path = Column(String(500), nullable=False)
    device_ids = Column(Text)
    group_ids = Column(Text)
    status = Column(String(50), default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    created_by = Column(Integer, ForeignKey("users.id"))

class FileDeploymentResult(Base):
    __tablename__ = "file_deployment_results"
    
    id = Column(Integer, primary_key=True, index=True)
    deployment_id = Column(Integer, ForeignKey("file_deployments.id"))
    device_id = Column(Integer, ForeignKey("devices.id"))
    file_id = Column(Integer, ForeignKey("uploaded_files.id"))
    status = Column(String(50))
    message = Column(Text)
    path_created = Column(Boolean, default=False)
    deployed_at = Column(DateTime)
    error_details = Column(Text)

class FileUploadResponse(BaseModel):
    success: bool
    message: str
    file_ids: List[int]
    files: List[dict]

class FileDeploymentRequest(BaseModel):
    file_ids: List[int]
    target_path: str
    device_ids: List[int] = []
    group_ids: List[int] = []
    create_path_if_not_exists: bool = True
    deployment_name: Optional[str] = None
    
    @validator('target_path')
    def validate_target_path(cls, v):
        if not v or not v.strip():
            raise ValueError('Target path cannot be empty')
        return v.strip()
    
    @validator('file_ids')
    def validate_file_ids(cls, v):
        if not v:
            raise ValueError('At least one file must be selected')
        return v

class FileDeploymentResponse(BaseModel):
    success: bool
    message: str
    deployment_id: int

class FileDeploymentProgress(BaseModel):
    deployment_id: int
    status: str
    total_operations: int
    completed_operations: int
    failed_operations: int
    results: List[dict]

class FileDeploymentResultSchema(BaseModel):
    id: int
    device_id: int
    device_name: str
    file_name: str
    status: str
    message: str
    path_created: bool = False
    deployed_at: Optional[datetime] = None
    error_details: Optional[str] = None

class PathCheckRequest(BaseModel):
    device_ids: List[int]
    path: str

class PathCheckResponse(BaseModel):
    success: bool
    results: List[dict]

class FileSystemNode(BaseModel):
    name: str
    path: str
    type: str
    size: Optional[int] = None
    modified: Optional[datetime] = None
    permissions: Optional[str] = None
    children: Optional[List['FileSystemNode']] = []

class FileSystemResponse(BaseModel):
    success: bool
    path: str
    nodes: List[FileSystemNode]

class FileDownloadRequest(BaseModel):
    device_id: int
    file_path: str

class DirectoryCreateRequest(BaseModel):
    path: str

class DirectoryCreateResponse(BaseModel):
    success: bool
    message: str
    path_created: bool

FileSystemNode.update_forward_refs()
