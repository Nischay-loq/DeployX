from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Text
from sqlalchemy.orm import relationship
from app.auth.database import Base
from pydantic import BaseModel
from typing import List, Optional
import json

class Deployment(Base):
    __tablename__ = "deployments"
    id = Column(Integer, primary_key=True)
    deployment_name = Column(String(100), nullable=False)
    initiated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(String(20), nullable=False, default="pending")
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    software_ids = Column(Text, nullable=True)  # JSON string of software IDs
    custom_software = Column(Text, nullable=True)  # Custom software name/path
    rollback_performed = Column(Boolean, default=False)  # Whether rollback was performed
    
    targets = relationship("DeploymentTarget", back_populates="deployment", cascade="all, delete-orphan")
    checkpoints = relationship("Checkpoint", back_populates="deployment", cascade="all, delete-orphan")

class DeploymentTarget(Base):
    __tablename__ = "deployment_targets"
    id = Column(Integer, primary_key=True)
    deployment_id = Column(Integer, ForeignKey("deployments.id"), nullable=False)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=False)
    status = Column(String(20), default="pending")
    progress_percent = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    deployment = relationship("Deployment", back_populates="targets")

class Checkpoint(Base):
    __tablename__ = "checkpoints"
    id = Column(Integer, primary_key=True)
    deployment_id = Column(Integer, ForeignKey("deployments.id"), nullable=False)
    step = Column(String(100), nullable=False)
    status = Column(String(20), nullable=False)
    timestamp = Column(DateTime, nullable=False)
    details = Column(Text, nullable=True)
    
    deployment = relationship("Deployment", back_populates="checkpoints")

class DeploymentCreate(BaseModel):
    group_ids: List[int] = []
    device_ids: List[int] = []
    software_ids: List[int] = []
    deployment_name: Optional[str] = None
    custom_software: Optional[str] = None

class DeploymentResponse(BaseModel):
    deployment_id: int

class DeploymentListResponse(BaseModel):
    id: int
    deployment_name: Optional[str]
    status: str
    started_at: Optional[str]
    ended_at: Optional[str]
    device_count: int
    rollback_performed: Optional[bool] = False
    software: Optional[List[dict]] = []
    custom_software: Optional[str] = None
    
    model_config = {"from_attributes": True}

class DeploymentProgress(BaseModel):
    device_id: int
    device_name: str
    percent: int
    status: str
    error: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None

class DeploymentProgressResponse(BaseModel):
    deployment_id: int
    deployment_status: str
    devices: List[DeploymentProgress]
    completed: bool
    started_at: Optional[str] = None
    ended_at: Optional[str] = None
    
    model_config = {"from_attributes": True}

class RetryRequest(BaseModel):
    device_ids: List[int]
    deployment_id: Optional[int] = None
