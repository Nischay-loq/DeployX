from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class DeviceCreate(BaseModel):
    device_name: str
    ip_address: str
    mac_address: str
    os: str
    status: str
    connection_type: str

class DeviceResponse(BaseModel):
    id: int
    device_name: Optional[str] = None
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    os: Optional[str] = None
    status: Optional[str] = None
    connection_type: Optional[str] = None
    last_seen: Optional[datetime] = None
    group_id: Optional[int] = None
    group_name: Optional[str] = None

    model_config = {"from_attributes": True}