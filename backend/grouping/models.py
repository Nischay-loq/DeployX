from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from auth.database import Base  # assuming you have a common Base

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
