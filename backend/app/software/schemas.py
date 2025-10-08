from pydantic import BaseModel, HttpUrl
from typing import Optional, List
from datetime import datetime

class SoftwareBase(BaseModel):
    name: str
    version: str
    description: Optional[str] = None
    download_url: str
    file_size: Optional[int] = None
    install_command_windows: Optional[str] = None
    install_command_linux: Optional[str] = None
    install_command_macos: Optional[str] = None
    uninstall_command: Optional[str] = None
    supported_os: str = "all"
    min_ram_mb: Optional[int] = None
    min_disk_mb: Optional[int] = None
    category: Optional[str] = None
    publisher: Optional[str] = None
    icon_url: Optional[str] = None
    dependencies: Optional[List[int]] = None
    checksum: Optional[str] = None

class SoftwareCreate(SoftwareBase):
    pass

class SoftwareUpdate(BaseModel):
    name: Optional[str] = None
    version: Optional[str] = None
    description: Optional[str] = None
    download_url: Optional[str] = None
    file_size: Optional[int] = None
    install_command_windows: Optional[str] = None
    install_command_linux: Optional[str] = None
    install_command_macos: Optional[str] = None
    uninstall_command: Optional[str] = None
    supported_os: Optional[str] = None
    category: Optional[str] = None
    publisher: Optional[str] = None
    is_active: Optional[bool] = None

class SoftwareResponse(SoftwareBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    model_config = {"from_attributes": True}

class SoftwareListResponse(BaseModel):
    id: int
    name: str
    version: str
    description: Optional[str]
    category: Optional[str]
    publisher: Optional[str]
    supported_os: str
    is_active: bool
    
    model_config = {"from_attributes": True}
