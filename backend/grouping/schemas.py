from pydantic import BaseModel
from typing import Optional, List

class DeviceBase(BaseModel):
    id: int
    device_name: Optional[str]
    ip_address: Optional[str]
    mac_address: Optional[str]
    os: Optional[str]
    status: Optional[str]
    connection_type: Optional[str] = None
    last_seen: Optional[str]

    class Config:
        orm_mode = True

class GroupBase(BaseModel):
    group_name: str
    description: Optional[str] = None
    color: Optional[str] = "#cccccc"

class GroupCreate(GroupBase):
    pass

class GroupUpdate(GroupBase):
    pass

class DeviceResponse(BaseModel):
    id: int
    device_name: str
    ip_address: str
    mac_address: str
    os: str
    status: str
    connection_type: str
    last_seen: Optional[str]

class GroupResponse(BaseModel):
    id: int
    group_name: str
    description: Optional[str]
    color: Optional[str]
    devices: List[DeviceResponse]

class DeviceGroupMapBase(BaseModel):
    device_id: int
    group_id: int
