from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Text, Enum
from sqlalchemy.orm import relationship
from app.auth.database import Base
from pydantic import BaseModel, Field, root_validator
from typing import List, Optional, Dict, Any
from datetime import datetime
import json
import enum


class TaskType(str, enum.Enum):
    """Type of scheduled task"""
    COMMAND = "command"
    SOFTWARE_DEPLOYMENT = "software_deployment"
    FILE_DEPLOYMENT = "file_deployment"


class TaskStatus(str, enum.Enum):
    """Status of scheduled task"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    PAUSED = "paused"


class RecurrenceType(str, enum.Enum):
    """Type of recurrence for scheduled tasks"""
    ONCE = "once"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    CUSTOM = "custom"  # Custom cron expression


class ScheduledTask(Base):
    """Database model for scheduled tasks"""
    __tablename__ = "scheduled_tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    task_name = Column(String(200), nullable=False)
    task_type = Column(Enum(TaskType), nullable=False)
    status = Column(Enum(TaskStatus), default=TaskStatus.PENDING, nullable=False)
    
    # Scheduling information
    scheduled_time = Column(DateTime, nullable=False)  # When to execute
    recurrence_type = Column(Enum(RecurrenceType), default=RecurrenceType.ONCE, nullable=False)
    recurrence_config = Column(Text, nullable=True)  # JSON config for recurrence (e.g., cron expression, days of week)
    
    # Target information
    device_ids = Column(Text, nullable=True)  # JSON array of device IDs
    group_ids = Column(Text, nullable=True)  # JSON array of group IDs
    
    # Task payload (varies by task type)
    payload = Column(Text, nullable=False)  # JSON containing task-specific data
    
    # User who created the task
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Execution tracking
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    last_execution = Column(DateTime, nullable=True)
    next_execution = Column(DateTime, nullable=True)
    execution_count = Column(Integer, default=0, nullable=False)
    
    # Execution results
    last_result = Column(Text, nullable=True)  # JSON containing last execution result
    error_message = Column(Text, nullable=True)
    
    # Execution history
    executions = relationship("ScheduledTaskExecution", back_populates="task", cascade="all, delete-orphan")


class ScheduledTaskExecution(Base):
    """History of task executions"""
    __tablename__ = "scheduled_task_executions"
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("scheduled_tasks.id"), nullable=False)
    
    execution_time = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_time = Column(DateTime, nullable=True)
    status = Column(Enum(TaskStatus), nullable=False)
    
    # Result information
    deployment_id = Column(Integer, nullable=True)  # Link to deployment, command, or file deployment
    result = Column(Text, nullable=True)  # JSON containing execution result
    error_message = Column(Text, nullable=True)
    
    task = relationship("ScheduledTask", back_populates="executions")


# Pydantic schemas for API

class CommandPayload(BaseModel):
    """Payload for command execution tasks"""
    command: Optional[str] = None  # For single command
    commands: Optional[List[str]] = None  # For batch commands
    shell: str = "cmd"
    strategy: str = "transactional"
    stop_on_failure: bool = True
    config: Dict[str, Any] = {}


class SoftwareDeploymentPayload(BaseModel):
    """Payload for software deployment tasks"""
    software_ids: List[int] = []
    deployment_name: Optional[str] = None
    custom_software: Optional[str] = None


class FileDeploymentPayload(BaseModel):
    """Payload for file deployment tasks"""
    file_ids: List[int]
    target_path: str
    create_path_if_not_exists: bool = True
    deployment_name: Optional[str] = None


class RecurrenceConfig(BaseModel):
    """Configuration for recurring tasks"""
    type: RecurrenceType
    cron_expression: Optional[str] = None  # For custom recurrence
    days_of_week: Optional[List[int]] = None  # 0-6 for weekly (0=Monday)
    day_of_month: Optional[int] = None  # 1-31 for monthly
    time: Optional[str] = None  # HH:MM for daily/weekly/monthly
    end_date: Optional[datetime] = None  # When to stop recurring


class ScheduledTaskCreate(BaseModel):
    """Schema for creating a scheduled task"""
    task_name: str = Field(..., min_length=1, max_length=200)
    task_type: TaskType
    scheduled_time: datetime
    recurrence_type: RecurrenceType = RecurrenceType.ONCE
    recurrence_config: Optional[RecurrenceConfig] = None
    
    device_ids: List[int] = []
    group_ids: List[int] = []
    
    # One of these should be provided based on task_type
    command_payload: Optional[CommandPayload] = None
    software_payload: Optional[SoftwareDeploymentPayload] = None
    file_payload: Optional[FileDeploymentPayload] = None


class ScheduledTaskUpdate(BaseModel):
    """Schema for updating a scheduled task"""
    task_name: Optional[str] = Field(None, min_length=1, max_length=200)
    scheduled_time: Optional[datetime] = None
    recurrence_type: Optional[RecurrenceType] = None
    recurrence_config: Optional[RecurrenceConfig] = None
    status: Optional[TaskStatus] = None
    device_ids: Optional[List[int]] = None
    group_ids: Optional[List[int]] = None
    command_payload: Optional[CommandPayload] = None
    software_payload: Optional[SoftwareDeploymentPayload] = None
    file_payload: Optional[FileDeploymentPayload] = None


class ScheduledTaskResponse(BaseModel):
    """Schema for task response"""
    id: int
    task_name: str
    task_type: TaskType
    status: TaskStatus
    scheduled_time: datetime
    recurrence_type: RecurrenceType
    device_ids: List[int]
    group_ids: List[int]
    created_at: datetime
    updated_at: datetime
    last_execution: Optional[datetime]
    next_execution: Optional[datetime]
    execution_count: int
    created_by: int
    
    class Config:
        from_attributes = True


class ScheduledTaskDetail(ScheduledTaskResponse):
    """Detailed task response with payload and history"""
    payload: Dict[str, Any]
    recurrence_config: Optional[Dict[str, Any]]
    last_result: Optional[Dict[str, Any]]
    error_message: Optional[str]
    executions: List[Dict[str, Any]] = []
    
    class Config:
        from_attributes = True


class TaskExecutionResponse(BaseModel):
    """Schema for task execution history"""
    id: int
    task_id: int
    execution_time: datetime
    completed_time: Optional[datetime]
    status: TaskStatus
    deployment_id: Optional[int]
    result: Optional[Dict[str, Any]]
    error_message: Optional[str]
    
    class Config:
        from_attributes = True
