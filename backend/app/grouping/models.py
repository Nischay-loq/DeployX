from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from app.auth.database import Base  # assuming you have a common Base
from sqlalchemy.sql import func  # <-- import func for default timestamp

class DeviceGroup(Base):
    __tablename__ = "device_groups"

    id = Column(Integer, primary_key=True, index=True)
    group_name = Column(String(100), nullable=False)
    description = Column(Text)
    color = Column(String(7), default="#cccccc")  # hex color code
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    devices = relationship(
        "DeviceGroupMap", back_populates="group", cascade="all, delete"
    )

class DeviceGroupMap(Base):
    __tablename__ = "device_group_map"
    __table_args__ = (
        # Ensure a device can only be added to a group once
        # but can be in multiple different groups
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
    ip_address = Column(String(45), nullable=False)  # IPv4 or IPv6 address
    mac_address = Column(String(17))
    os = Column(String(50))
    status = Column(String(20))
    connection_type = Column(String(10), nullable=True)
    last_seen = Column(DateTime, default=func.now())
    group_id = Column(Integer, ForeignKey("device_groups.id", ondelete="SET NULL"))

    group = relationship("DeviceGroup", foreign_keys=[group_id])
    device_group_mappings = relationship("DeviceGroupMap", foreign_keys="DeviceGroupMap.device_id", back_populates="device")
    # Note: file_deployment_results relationship temporarily removed to fix import issues