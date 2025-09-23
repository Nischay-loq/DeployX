from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
from app.auth.database import Base

class UploadedFile(Base):
    __tablename__ = "uploaded_files"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False)
    content_type = Column(String(100))
    checksum = Column(String(64))  # SHA-256 hash
    upload_time = Column(DateTime, default=datetime.utcnow)
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    
    # Note: Relationships temporarily removed to fix import issues

class FileDeployment(Base):
    __tablename__ = "file_deployments"
    
    id = Column(Integer, primary_key=True, index=True)
    file_ids = Column(Text)    # JSON array of file IDs
    deployment_name = Column(String(255))
    target_path = Column(String(500), nullable=False)
    device_ids = Column(Text)  # JSON array of device IDs
    group_ids = Column(Text)   # JSON array of group IDs
    status = Column(String(50), default="pending")  # pending, in_progress, completed, failed
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    created_by = Column(Integer, ForeignKey("users.id"))
    
    # Note: Relationships temporarily removed to fix import issues

class FileDeploymentResult(Base):
    __tablename__ = "file_deployment_results"
    
    id = Column(Integer, primary_key=True, index=True)
    deployment_id = Column(Integer, ForeignKey("file_deployments.id"))
    device_id = Column(Integer, ForeignKey("devices.id"))
    file_id = Column(Integer, ForeignKey("uploaded_files.id"))
    status = Column(String(50))  # success, error, pending, in_progress
    message = Column(Text)
    path_created = Column(Boolean, default=False)
    deployed_at = Column(DateTime)
    error_details = Column(Text)
    
    # Note: All relationships temporarily removed to fix import issues

# Add relationships to existing User model (if needed)
# This would typically be added to the existing User model in auth/models.py
# User.uploaded_files = relationship("UploadedFile", back_populates="uploader")
# User.file_deployments = relationship("FileDeployment", back_populates="creator")