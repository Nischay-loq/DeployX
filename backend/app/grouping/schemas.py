from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class DeviceBase(BaseModel):
    id: int
    device_name: Optional[str]
    ip_address: Optional[str]
    mac_address: Optional[str]
    os: Optional[str]
    status: Optional[str]
    connection_type: Optional[str] = None
    last_seen: Optional[str]

    model_config = {"from_attributes": True}

class GroupBase(BaseModel):
    group_name: str
    description: Optional[str] = None
    color: Optional[str] = "#cccccc"

class GroupCreate(GroupBase):
    device_ids: Optional[List[int]] = []

class GroupUpdate(GroupBase):
    device_ids: Optional[List[int]] = None

class DeviceResponse(BaseModel):
    id: int
    device_name: Optional[str] = None
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    os: Optional[str] = None
    status: Optional[str] = None
    connection_type: Optional[str] = None
    last_seen: Optional[str] = None

class GroupResponse(BaseModel):
    id: int
    group_name: str
    description: Optional[str]
    color: Optional[str]
    devices: List[DeviceResponse]
    
    model_config = {"from_attributes": True}

class DeviceGroupMapBase(BaseModel):
    device_id: int
    group_id: int

# Group Command Execution Schemas
class GroupCommandRequest(BaseModel):
    """Request to execute a single command on a group"""
    command: str
    shell: str = "cmd"
    strategy: str = "transactional"
    config: Dict[str, Any] = {}

class GroupCommandBatchRequest(BaseModel):
    """Request to execute multiple commands on a group (parallel)"""
    commands: List[str]
    shell: str = "cmd"
    strategy: str = "batch"
    config: Dict[str, Any] = {}

class GroupCommandSequentialRequest(BaseModel):
    """Request to execute multiple commands on a group (sequential)"""
    commands: List[str]
    shell: str = "cmd"
    stop_on_failure: bool = True
    config: Dict[str, Any] = {}

class DeviceCommandResultResponse(BaseModel):
    """Result of command execution on a single device"""
    device_id: int
    agent_id: str
    device_name: str
    status: str
    output: str
    error: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None

class GroupCommandExecutionResponse(BaseModel):
    """Response for a group command execution"""
    execution_id: str
    group_id: int
    group_name: str
    command: str
    shell: str
    strategy: str
    status: str
    total_devices: int
    successful_devices: int
    failed_devices: int
    progress: float
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    device_results: List[DeviceCommandResultResponse]

class GroupBatchExecutionResponse(BaseModel):
    """Response for a group batch execution"""
    batch_id: str
    group_id: int
    group_name: str
    status: str
    total_commands: int
    current_command_index: int
    stop_on_failure: bool
    progress_summary: str
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    command_executions: List[GroupCommandExecutionResponse]
