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

class DeploymentProgressResponse(BaseModel):
    devices: List[DeploymentProgress]
    completed: bool
    
    model_config = {"from_attributes": True}