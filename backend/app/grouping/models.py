from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.auth.database import Base  # assuming you have a common Base
from sqlalchemy.dialects.postgresql import INET
from sqlalchemy.sql import func  # <-- import func for default timestamp

class DeviceGroup(Base):
    __tablename__ = "device_groups"

    id = Column(Integer, primary_key=True, index=True)
    group_name = Column(String(100), nullable=False)
    description = Column(Text)
    color = Column(String(7), default="#cccccc")  # hex color code

    devices = relationship(
        "DeviceGroupMap", back_populates="group", cascade="all, delete"
    )

class DeviceGroupMap(Base):
    __tablename__ = "device_group_map"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id", ondelete="CASCADE"))
    group_id = Column(Integer, ForeignKey("device_groups.id", ondelete="CASCADE"))

    group = relationship("DeviceGroup", back_populates="devices")

class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    device_name = Column(String(100))
    ip_address = Column(INET, nullable=False)  # <-- use INET (all caps)
    mac_address = Column(String(17))
    os = Column(String(50))
    status = Column(String(20))
    connection_type = Column(String(10), nullable=True)
    last_seen = Column(DateTime, default=func.now())
    group_id = Column(Integer, ForeignKey("device_groups.id", ondelete="SET NULL"))

    group = relationship("DeviceGroup", foreign_keys=[group_id])