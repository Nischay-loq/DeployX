from pydantic import BaseModel
from typing import List, Optional

class DeploymentCreate(BaseModel):
    group_ids: List[int] = []
    device_ids: List[int] = []
    software_ids: List[int] = []
    deployment_name: Optional[str] = None
    custom_software: Optional[str] = None

class DeploymentResponse(BaseModel):
    deployment_id: int

class DeploymentListResponse(BaseModel):
    id: int
    deployment_name: Optional[str]
    status: str
    started_at: Optional[str]
    ended_at: Optional[str]
    device_count: int
    rollback_performed: bool
    
    model_config = {"from_attributes": True}

class DeploymentProgress(BaseModel):
    device_id: int
    device_name: str
    percent: int
    status: str

class DeploymentProgressResponse(BaseModel):
    devices: List[DeploymentProgress]
    completed: bool
    
    model_config = {"from_attributes": True}

class RetryRequest(BaseModel):
    device_ids: List[int]
    deployment_id: Optional[int] = None