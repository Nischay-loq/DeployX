"""Pydantic schemas for device/agent management."""
from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, List, Dict, Any
from datetime import datetime

class DeviceCreate(BaseModel):
    """Schema for creating a new device."""
    agent_id: str = Field(..., description="Unique agent identifier")
    machine_id: str = Field(..., description="Machine identifier")
    device_name: str = Field(..., description="Device name/hostname")
    ip_address: Optional[str] = Field(None, description="IP address (as string)")
    mac_address: Optional[str] = Field(None, description="MAC address")
    os: str = Field(..., description="Operating system")
    os_version: Optional[str] = Field(None, description="OS version")
    os_release: Optional[str] = Field(None, description="OS release")
    processor: Optional[str] = Field(None, description="Processor information")
    python_version: Optional[str] = Field(None, description="Python version")
    cpu_count: Optional[int] = Field(None, description="Number of CPU cores")
    memory_total: Optional[int] = Field(None, description="Total memory in bytes")
    memory_available: Optional[int] = Field(None, description="Available memory in bytes")
    disk_total: Optional[int] = Field(None, description="Total disk space in bytes")
    disk_free: Optional[int] = Field(None, description="Free disk space in bytes")
    shells: Optional[List[str]] = Field(default_factory=list, description="Available shells")
    connection_type: Optional[str] = Field(None, description="Connection type")
    group_id: Optional[int] = Field(None, description="Device group ID")
    system_info: Optional[Dict[str, Any]] = Field(None, description="Additional system information")

class DeviceUpdate(BaseModel):
    """Schema for updating device information."""
    device_name: Optional[str] = None
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    os_version: Optional[str] = None
    os_release: Optional[str] = None
    processor: Optional[str] = None
    python_version: Optional[str] = None
    cpu_count: Optional[int] = None
    memory_total: Optional[int] = None
    memory_available: Optional[int] = None
    disk_total: Optional[int] = None
    disk_free: Optional[int] = None
    shells: Optional[List[str]] = None
    status: Optional[str] = None
    connection_type: Optional[str] = None
    group_id: Optional[int] = None
    system_info: Optional[Dict[str, Any]] = None

class DeviceResponse(BaseModel):
    """Schema for device response."""
    id: int
    agent_id: Optional[str] = None
    machine_id: Optional[str] = None
    device_name: Optional[str] = None
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    os: Optional[str] = None
    os_version: Optional[str] = None
    os_release: Optional[str] = None
    processor: Optional[str] = None
    python_version: Optional[str] = None
    cpu_count: Optional[int] = None
    memory_total: Optional[int] = None
    memory_available: Optional[int] = None
    disk_total: Optional[int] = None
    disk_free: Optional[int] = None
    shells: Optional[List[str]] = None
    status: Optional[str] = None
    connection_type: Optional[str] = None
    group_id: Optional[int] = None
    last_seen: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    system_info: Optional[Dict[str, Any]] = None
    
    model_config = {"from_attributes": True}

class DeviceListResponse(BaseModel):
    """Schema for device list response."""
    devices: List[DeviceResponse]
    total: int

class DeviceRegistrationRequest(BaseModel):
    """Schema for device registration through Socket.IO."""
    agent_id: str
    machine_id: str
    device_name: Optional[str] = None
    hostname: Optional[str] = None  # Backward compatibility
    ip_address: str
    os: str
    shells: List[str]
    system_info: Dict[str, Any]
    
    @model_validator(mode='after')
    def validate_device_name(self):
        """Ensure either device_name or hostname is provided."""
        if not self.device_name and not self.hostname:
            raise ValueError('Either device_name or hostname must be provided')
        # Use hostname if device_name is not provided (backward compatibility)
        if not self.device_name and self.hostname:
            self.device_name = self.hostname
        # Use device_name if hostname is not provided
        if not self.hostname and self.device_name:
            self.hostname = self.device_name
        return self

# Keep backward compatibility with Agent naming
AgentCreate = DeviceCreate
AgentUpdate = DeviceUpdate
AgentResponse = DeviceResponse
AgentListResponse = DeviceListResponse
AgentRegistrationRequest = DeviceRegistrationRequest