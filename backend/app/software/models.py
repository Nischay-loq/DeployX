from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, JSON
from sqlalchemy.orm import relationship
from app.auth.database import Base
from datetime import datetime

class Software(Base):
    """Software catalog model"""
    __tablename__ = "software"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    version = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    
    # Download and installation
    download_url = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=True)  # Size in bytes
    install_command_windows = Column(Text, nullable=True)
    install_command_linux = Column(Text, nullable=True)
    install_command_macos = Column(Text, nullable=True)
    uninstall_command = Column(Text, nullable=True)
    
    # System requirements
    supported_os = Column(String(100), nullable=False, default="all")  # windows, linux, macos, all
    min_ram_mb = Column(Integer, nullable=True)
    min_disk_mb = Column(Integer, nullable=True)
    
    # Categorization
    category = Column(String(100), nullable=True)  # utilities, development, security, etc.
    publisher = Column(String(255), nullable=True)
    icon_url = Column(String(500), nullable=True)
    
    # Additional metadata
    dependencies = Column(JSON, nullable=True)  # List of required software IDs
    checksum = Column(String(128), nullable=True)  # SHA-256 checksum for verification
    
    # Status
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<Software(name='{self.name}', version='{self.version}')>"
