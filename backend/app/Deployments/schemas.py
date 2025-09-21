from pydantic import BaseModel
from typing import List, Optional

class DeploymentCreate(BaseModel):
    group_ids: List[int]
    deployment_name: Optional[str] = None

class DeploymentResponse(BaseModel):
    deployment_id: int

class DeploymentProgress(BaseModel):
    device_id: int
    device_name: str
    percent: int
    status: str
    error: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None

class DeploymentProgressResponse(BaseModel):
    deployment_id: int
    deployment_status: str
    devices: List[DeploymentProgress]
    completed: bool
    started_at: Optional[str] = None
    ended_at: Optional[str] = None
    
    model_config = {"from_attributes": True}