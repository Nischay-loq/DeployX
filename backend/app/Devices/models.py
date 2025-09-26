from pydantic import BaseModel
from typing import Optional
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
from app.auth.database import Base

# SQLAlchemy model for database
class Device(Base):
    __tablename__ = "devices"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    ip_address = Column(String(45))  # IPv4 or IPv6
    hostname = Column(String(255))
    status = Column(String(20), default="offline")  # online, offline, unknown
    os_type = Column(String(50))  # Linux, Windows, macOS, etc.
    arch = Column(String(20))  # x86_64, arm64, etc.
    last_seen = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    agent_info = Column(Text)  # JSON string for additional agent information

# Pydantic models for API
class DeviceBase(BaseModel):
    name: str
    ip_address: Optional[str] = None
    hostname: Optional[str] = None
    status: Optional[str] = "offline"
    os_type: Optional[str] = None
    arch: Optional[str] = None

class DeviceCreate(DeviceBase):
    pass

class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    ip_address: Optional[str] = None
    hostname: Optional[str] = None
    status: Optional[str] = None
    os_type: Optional[str] = None
    arch: Optional[str] = None

class DeviceResponse(DeviceBase):
    id: int
    last_seen: Optional[datetime]
    created_at: datetime
    
    class Config:
        from_attributes = True
from typing import Optional
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey