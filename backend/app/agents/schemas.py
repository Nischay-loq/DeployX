"""Pydantic schemas for agent management."""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class AgentCreate(BaseModel):
    """Schema for creating a new agent."""
    agent_id: str = Field(..., description="Unique agent identifier")
    machine_id: str = Field(..., description="Machine identifier")
    hostname: str = Field(..., description="System hostname")
    os: str = Field(..., description="Operating system")
    os_version: Optional[str] = Field(None, description="OS version")
    os_release: Optional[str] = Field(None, description="OS release")
    architecture: Optional[str] = Field(None, description="System architecture")
    processor: Optional[str] = Field(None, description="Processor information")
    python_version: Optional[str] = Field(None, description="Python version")
    cpu_count: Optional[int] = Field(None, description="Number of CPU cores")
    memory_total: Optional[int] = Field(None, description="Total memory in bytes")
    memory_available: Optional[int] = Field(None, description="Available memory in bytes")
    disk_total: Optional[int] = Field(None, description="Total disk space in bytes")
    disk_free: Optional[int] = Field(None, description="Free disk space in bytes")
    shells: Optional[List[str]] = Field(default_factory=list, description="Available shells")
    system_info: Optional[Dict[str, Any]] = Field(None, description="Additional system information")

class AgentUpdate(BaseModel):
    """Schema for updating agent information."""
    hostname: Optional[str] = None
    os_version: Optional[str] = None
    os_release: Optional[str] = None
    architecture: Optional[str] = None
    processor: Optional[str] = None
    python_version: Optional[str] = None
    cpu_count: Optional[int] = None
    memory_total: Optional[int] = None
    memory_available: Optional[int] = None
    disk_total: Optional[int] = None
    disk_free: Optional[int] = None
    shells: Optional[List[str]] = None
    status: Optional[str] = None
    system_info: Optional[Dict[str, Any]] = None

class AgentResponse(BaseModel):
    """Schema for agent response."""
    id: int
    agent_id: str
    machine_id: str
    hostname: str
    os: str
    os_version: Optional[str] = None
    os_release: Optional[str] = None
    architecture: Optional[str] = None
    processor: Optional[str] = None
    python_version: Optional[str] = None
    cpu_count: Optional[int] = None
    memory_total: Optional[int] = None
    memory_available: Optional[int] = None
    disk_total: Optional[int] = None
    disk_free: Optional[int] = None
    shells: Optional[List[str]] = None
    status: str
    last_seen: datetime
    created_at: datetime
    updated_at: datetime
    system_info: Optional[Dict[str, Any]] = None
    
    model_config = {"from_attributes": True}

class AgentListResponse(BaseModel):
    """Schema for agent list response."""
    agents: List[AgentResponse]
    total: int

class AgentRegistrationRequest(BaseModel):
    """Schema for agent registration through Socket.IO."""
    agent_id: str
    machine_id: str
    hostname: str
    os: str
    shells: List[str]
    system_info: Dict[str, Any]