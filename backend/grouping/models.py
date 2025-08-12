# models.py
from sqlalchemy import Column, Integer, String, Text, ForeignKey, TIMESTAMP
from sqlalchemy.orm import relationship
from auth.database import Base

class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    device_name = Column(String(100))
    ip_address = Column(String)  # inet will be returned as string
    mac_address = Column(String(17), unique=True)
    os = Column(String(50))
    status = Column(String(20))
    connection_type = Column(String(10))
    last_seen = Column(TIMESTAMP)
    group_id = Column(Integer, ForeignKey("device_groups.id", ondelete="SET NULL"))

    group = relationship("DeviceGroup", back_populates="devices")

class DeviceGroup(Base):
    __tablename__ = "device_groups"

    id = Column(Integer, primary_key=True, index=True)
    group_name = Column(String(100), nullable=False)
    description = Column(Text)

    devices = relationship("Device", back_populates="group")

class DeviceGroupMap(Base):
    __tablename__ = "device_group_map"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id", ondelete="CASCADE"))
    group_id = Column(Integer, ForeignKey("device_groups.id", ondelete="CASCADE"))
