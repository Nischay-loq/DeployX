from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Text
from sqlalchemy.orm import relationship
from app.auth.database import Base

class Deployment(Base):
    __tablename__ = "deployments"
    id = Column(Integer, primary_key=True)
    deployment_name = Column(String(100), nullable=False)
    initiated_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # Made nullable for now
    status = Column(String(20), nullable=False, default="pending")
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    rollback_performed = Column(Boolean, default=False)
    rollback_time = Column(DateTime, nullable=True)
    rollback_reason = Column(Text, nullable=True)
    
    # Add relationships
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
    
    # Add relationships
    deployment = relationship("Deployment", back_populates="targets")

class Checkpoint(Base):
    __tablename__ = "checkpoints"
    id = Column(Integer, primary_key=True)
    deployment_id = Column(Integer, ForeignKey("deployments.id"), nullable=False)
    step = Column(String(100), nullable=False)
    status = Column(String(20), nullable=False)
    timestamp = Column(DateTime, nullable=False)
    details = Column(Text, nullable=True)
    
    # Add relationships
    deployment = relationship("Deployment", back_populates="checkpoints")