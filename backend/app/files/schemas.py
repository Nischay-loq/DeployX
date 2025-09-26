from pydantic import BaseModel, validator
from typing import List, Optional
from datetime import datetime

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

class FileDeploymentResult(BaseModel):
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
    type: str  # 'file' or 'directory'
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

# Update forward references
FileSystemNode.update_forward_refs()