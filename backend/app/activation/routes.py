"""API routes for activation key management."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Optional

from app.auth.database import get_db
from app.auth.utils import get_current_user
from app.activation import crud, schemas
from app.activation.models import ActivationKey

router = APIRouter(prefix="/activation", tags=["activation"])


@router.post("/generate", response_model=schemas.ActivationKeyResponse)
async def generate_activation_key(
    key_data: schemas.ActivationKeyCreate = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Generate a new activation key. Requires authentication."""
    if key_data is None:
        key_data = schemas.ActivationKeyCreate()
    
    db_key = crud.create_activation_key(
        db=db,
        user_id=current_user.id if current_user else None,
        notes=key_data.notes,
        expiry_days=key_data.expiry_days or 30
    )
    
    return _key_to_response(db_key)


@router.post("/validate", response_model=schemas.ActivationKeyValidateResponse)
async def validate_activation_key(
    validation_data: schemas.ActivationKeyValidate,
    db: Session = Depends(get_db)
):
    """Validate and activate an activation key. No authentication required (for agents)."""
    # First check if this machine is already activated
    is_activated, existing_key = crud.check_agent_activated(db, validation_data.machine_id)
    
    if is_activated:
        return schemas.ActivationKeyValidateResponse(
            valid=True,
            message="Agent is already activated",
            expires_at=existing_key.expires_at
        )
    
    # Try to validate and use the provided key
    is_valid, message, db_key = crud.validate_and_use_key(
        db=db,
        key=validation_data.key,
        agent_id=validation_data.agent_id,
        machine_id=validation_data.machine_id
    )
    
    return schemas.ActivationKeyValidateResponse(
        valid=is_valid,
        message=message,
        expires_at=db_key.expires_at if db_key else None
    )


@router.get("/check/{machine_id}", response_model=schemas.ActivationKeyValidateResponse)
async def check_activation_status(
    machine_id: str,
    db: Session = Depends(get_db)
):
    """Check if a machine is already activated. No authentication required (for agents)."""
    is_activated, db_key = crud.check_agent_activated(db, machine_id)
    
    if is_activated:
        return schemas.ActivationKeyValidateResponse(
            valid=True,
            message="Agent is activated",
            expires_at=db_key.expires_at
        )
    
    return schemas.ActivationKeyValidateResponse(
        valid=False,
        message="Agent is not activated",
        expires_at=None
    )


@router.get("/keys", response_model=schemas.ActivationKeyList)
async def list_activation_keys(
    skip: int = 0,
    limit: int = 100,
    include_used: bool = True,
    include_expired: bool = True,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """List all activation keys. Requires authentication."""
    keys = crud.get_all_activation_keys(
        db=db,
        skip=skip,
        limit=limit,
        include_used=include_used,
        include_expired=include_expired
    )
    
    total = crud.count_activation_keys(
        db=db,
        include_used=include_used,
        include_expired=include_expired
    )
    
    return schemas.ActivationKeyList(
        keys=[_key_to_response(k) for k in keys],
        total=total
    )


@router.delete("/keys/{key_id}")
async def delete_activation_key(
    key_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Delete an activation key. Requires authentication."""
    success = crud.delete_activation_key(db, key_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activation key not found"
        )
    
    return {"message": "Activation key deleted successfully"}


def _key_to_response(db_key: ActivationKey) -> schemas.ActivationKeyResponse:
    """Convert database model to response schema."""
    now = datetime.now(timezone.utc)
    is_expired = db_key.expires_at < now if db_key.expires_at else False
    
    return schemas.ActivationKeyResponse(
        id=db_key.id,
        key=db_key.key,
        created_at=db_key.created_at,
        expires_at=db_key.expires_at,
        is_used=db_key.is_used,
        used_at=db_key.used_at,
        used_by_agent_id=db_key.used_by_agent_id,
        used_by_machine_id=db_key.used_by_machine_id,
        notes=db_key.notes,
        is_expired=is_expired
    )
