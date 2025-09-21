from pydantic import BaseModel
from typing import Optional
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey

class Device(BaseModel):
    __tablename__ = "devices"
    id = Column(Integer, primary_key=True, index=True)
    device_name = Column(String)
    ip_address = Column(String)
    mac_address = Column(String, unique=True, index=True)
    os = Column(String)
    status = Column(String, default="offline")
    connection_type = Column(String, nullable=True)  # <-- Allow NULL values
    last_seen = Column(DateTime)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=True)

    model_config = {"from_attributes": True}