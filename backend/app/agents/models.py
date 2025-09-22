"""SQLAlchemy models for agent management."""
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from app.auth.database import Base

class Agent(Base):
    """Agent model for storing registered agents."""
    __tablename__ = "agents"
    
    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(String(255), unique=True, index=True, nullable=False)
    machine_id = Column(String(255), unique=True, index=True, nullable=False)
    hostname = Column(String(255), nullable=False)
    os = Column(String(100), nullable=False)
    os_version = Column(String(255))
    os_release = Column(String(255))
    architecture = Column(String(100))
    processor = Column(String(255))
    python_version = Column(String(50))
    cpu_count = Column(Integer)
    memory_total = Column(Integer)  # in bytes
    memory_available = Column(Integer)  # in bytes
    disk_total = Column(Integer)  # in bytes
    disk_free = Column(Integer)  # in bytes
    shells = Column(JSON)  # List of available shells
    status = Column(String(50), default="offline")  # online, offline, disconnected
    last_seen = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Optional additional system information stored as JSON
    system_info = Column(JSON)
    
    def __repr__(self):
        return f"<Agent(agent_id='{self.agent_id}', hostname='{self.hostname}', status='{self.status}')>"