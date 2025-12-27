"""Pydantic schemas for activation keys."""
from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class ActivationKeyCreate(BaseModel):
    """Schema for creating a new activation key."""
    notes: Optional[str] = None
    expiry_days: Optional[int] = 30  # Default 30 days


class ActivationKeyResponse(BaseModel):
    """Schema for activation key response."""
    id: int
    key: str
    created_at: datetime
    expires_at: datetime
    is_used: bool
    used_at: Optional[datetime] = None
    used_by_agent_id: Optional[str] = None
    used_by_machine_id: Optional[str] = None
    notes: Optional[str] = None
    is_expired: bool = False

    class Config:
        from_attributes = True


class ActivationKeyValidate(BaseModel):
    """Schema for validating an activation key."""
    key: str
    agent_id: str
    machine_id: str


class ActivationKeyValidateResponse(BaseModel):
    """Schema for activation key validation response."""
    valid: bool
    message: str
    expires_at: Optional[datetime] = None


class ActivationKeyList(BaseModel):
    """Schema for listing activation keys."""
    keys: list[ActivationKeyResponse]
    total: int
