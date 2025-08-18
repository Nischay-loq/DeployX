from pydantic import BaseModel
from typing import Optional

class Device(BaseModel):
    __tablename__ = "devices"
    id: int
    device_name: Optional[str] = None
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    os: Optional[str] = None
    status: Optional[str] = None
    connection_type: Optional[str] = None
    last_seen: Optional[str] = None
    group_id: Optional[int] = None
    group_name: Optional[str] = None

    model_config = {"from_attributes": True}