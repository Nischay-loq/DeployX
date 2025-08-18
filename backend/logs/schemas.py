from pydantic import BaseModel
from typing import Optional

class LogResponse(BaseModel):
    id: int
    deployment_id: Optional[int]
    device_id: Optional[int]
    log_type: str
    message: str
    timestamp: str