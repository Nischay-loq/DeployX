from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Text
from sqlalchemy.orm import relationship
from auth.database import Base

class Deployment(Base):
    __tablename__ = "deployments"
    id = Column(Integer, primary_key=True)
    deployment_name = Column(String(100))
    initiated_by = Column(Integer, ForeignKey("users.id"))
    status = Column(String(20))
    started_at = Column(DateTime)
    ended_at = Column(DateTime)
    rollback_performed = Column(Boolean, default=False)
    rollback_time = Column(DateTime)
    rollback_reason = Column(Text)

class DeploymentTarget(Base):
    __tablename__ = "deployment_targets"
    id = Column(Integer, primary_key=True)
    deployment_id = Column(Integer, ForeignKey("deployments.id"))
    device_id = Column(Integer, ForeignKey("devices.id"))

class Checkpoint(Base):
    __tablename__ = "checkpoints"
    id = Column(Integer, primary_key=True)
    deployment_id = Column(Integer, ForeignKey("deployments.id"))
    step = Column(String(100))
    status = Column(String(20))
    timestamp = Column(DateTime)