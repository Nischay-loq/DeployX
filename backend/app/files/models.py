from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class UploadedFile(Base):
    __tablename__ = "uploaded_files"
    
    id = Column(String, primary_key=True)
    filename = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    content_type = Column(String)
    source = Column(String, default="local")  # 'local', 'google_drive', etc.
    drive_file_id = Column(String)  # For Google Drive files
    upload_date = Column(DateTime, default=datetime.utcnow)
    uploaded_by = Column(String)  # User who uploaded the file
    status = Column(String, default="uploaded")  # 'uploaded', 'deleted', 'deployed'

class Deployment(Base):
    __tablename__ = "deployments"
    
    id = Column(String, primary_key=True)
    name = Column(String)
    description = Column(Text)
    deployment_mode = Column(String, nullable=False)  # 'agents', 'groups'
    destination_path = Column(String, nullable=False)
    status = Column(String, default="pending")  # 'pending', 'in_progress', 'completed', 'failed'
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    created_by = Column(String)
    
    # Relationships
    deployment_files = relationship("DeploymentFile", back_populates="deployment")
    deployment_targets = relationship("DeploymentTarget", back_populates="deployment")
    deployment_results = relationship("DeploymentResult", back_populates="deployment")

class DeploymentFile(Base):
    __tablename__ = "deployment_files"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    deployment_id = Column(String, ForeignKey("deployments.id"))
    file_id = Column(String, ForeignKey("uploaded_files.id"))
    
    # Relationships
    deployment = relationship("Deployment", back_populates="deployment_files")
    file = relationship("UploadedFile")

class DeploymentTarget(Base):
    __tablename__ = "deployment_targets"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    deployment_id = Column(String, ForeignKey("deployments.id"))
    target_type = Column(String, nullable=False)  # 'agent', 'group'
    target_id = Column(String, nullable=False)
    target_name = Column(String)
    
    # Relationships
    deployment = relationship("Deployment", back_populates="deployment_targets")

class DeploymentResult(Base):
    __tablename__ = "deployment_results"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    deployment_id = Column(String, ForeignKey("deployments.id"))
    target_id = Column(String, nullable=False)
    target_name = Column(String)
    target_type = Column(String)  # 'agent', 'group'
    status = Column(String, nullable=False)  # 'success', 'failed', 'in_progress'
    progress_percentage = Column(Integer, default=0)
    message = Column(Text)
    error_details = Column(Text)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    
    # Relationships
    deployment = relationship("Deployment", back_populates="deployment_results")