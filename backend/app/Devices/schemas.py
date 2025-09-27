from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
class DeviceCreate(BaseModel):
    device_name: str
    ip_address: str
    mac_address: str
    os: str
    status: str
    connection_type: Optional[str] = None  # This allows None values
    last_seen: Optional[str] = None

class GroupInfo(BaseModel):
    id: int
    group_name: str
    description: Optional[str] = None
    color: Optional[str] = None

class DeviceResponse(BaseModel):
    id: int
    device_name: Optional[str] = None
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    os: Optional[str] = None
    status: Optional[str] = None
    connection_type: Optional[str] = None
    last_seen: Optional[datetime] = None
    group: Optional[GroupInfo] = None  # Direct group relationship
    groups: List[GroupInfo] = []  # Additional groups from mapping table

    model_config = {"from_attributes": True}