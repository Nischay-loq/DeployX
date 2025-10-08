from sqlalchemy import Column, Integer, BigInteger, String, Text, ForeignKey, DateTime, UniqueConstraint, JSON
from sqlalchemy.dialects.postgresql import INET
from sqlalchemy.orm import relationship
from app.auth.database import Base
from sqlalchemy.sql import func
from pydantic import BaseModel
from typing import Optional, List

class DeviceGroup(Base):
    __tablename__ = "device_groups"

    id = Column(Integer, primary_key=True, index=True)
    group_name = Column(String(100), nullable=False)
    description = Column(Text)
    color = Column(String(7), default="#cccccc")
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    devices = relationship(
        "DeviceGroupMap", back_populates="group", cascade="all, delete"
    )

class DeviceGroupMap(Base):
    __tablename__ = "device_group_map"
    __table_args__ = (
        UniqueConstraint('device_id', 'group_id', name='unique_device_group'),
    )

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id", ondelete="CASCADE"))
    group_id = Column(Integer, ForeignKey("device_groups.id", ondelete="CASCADE"))

    group = relationship("DeviceGroup", back_populates="devices")
    device = relationship("Device", back_populates="device_group_mappings")

class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    device_name = Column(String(100))
    ip_address = Column(String(45), nullable=False)
    mac_address = Column(String(17))
    os = Column(String(50))
    status = Column(String(20))
    connection_type = Column(String(10), nullable=True)
    last_seen = Column(DateTime, default=func.now())
    group_id = Column(Integer, ForeignKey("device_groups.id", ondelete="SET NULL"))
    
    agent_id = Column(String(255))
    machine_id = Column(String(255))
    os_version = Column(String(255))
    os_release = Column(String(255))
    processor = Column(String(255))
    python_version = Column(String(50))
    cpu_count = Column(Integer)
    memory_total = Column(BigInteger)
    memory_available = Column(BigInteger)
    disk_total = Column(BigInteger)
    disk_free = Column(BigInteger)
    shells = Column(JSON)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    system_info = Column(JSON)

    group = relationship("DeviceGroup", foreign_keys=[group_id])
    device_group_mappings = relationship("DeviceGroupMap", foreign_keys="DeviceGroupMap.device_id", back_populates="device")

class DeviceBase(BaseModel):
    id: int
    device_name: Optional[str]
    ip_address: Optional[str]
    mac_address: Optional[str]
    os: Optional[str]
    status: Optional[str]
    connection_type: Optional[str] = None
    last_seen: Optional[str]

    model_config = {"from_attributes": True}

class GroupBase(BaseModel):
    group_name: str
    description: Optional[str] = None
    color: Optional[str] = "#cccccc"

class GroupCreate(GroupBase):
    device_ids: Optional[List[int]] = []

class GroupUpdate(GroupBase):
    device_ids: Optional[List[int]] = None

class DeviceResponse(BaseModel):
    id: int
    device_name: Optional[str] = None
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    os: Optional[str] = None
    status: Optional[str] = None
    connection_type: Optional[str] = None
    last_seen: Optional[str] = None

class GroupResponse(BaseModel):
    id: int
    group_name: str
    description: Optional[str]
    color: Optional[str]
    devices: List[DeviceResponse]
    
    model_config = {"from_attributes": True}

class DeviceGroupMapBase(BaseModel):
    device_id: int
    group_id: int
