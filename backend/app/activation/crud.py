"""CRUD operations for activation keys."""
import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.activation.models import ActivationKey


def generate_activation_key() -> str:
    """Generate a unique activation key.
    
    Format: XXXX-XXXX-XXXX-XXXX (16 alphanumeric chars with dashes)
    """
    chars = string.ascii_uppercase + string.digits
    key_parts = [''.join(secrets.choice(chars) for _ in range(4)) for _ in range(4)]
    return '-'.join(key_parts)


def create_activation_key(
    db: Session,
    user_id: Optional[int] = None,
    notes: Optional[str] = None,
    expiry_days: int = 30
) -> ActivationKey:
    """Create a new activation key.
    
    Args:
        db: Database session
        user_id: ID of the user creating the key
        notes: Optional notes for the key
        expiry_days: Number of days until expiry (default 30)
    
    Returns:
        Created ActivationKey object
    """
    key = generate_activation_key()
    
    # Ensure unique key
    while db.query(ActivationKey).filter(ActivationKey.key == key).first():
        key = generate_activation_key()
    
    expires_at = datetime.now(timezone.utc) + timedelta(days=expiry_days)
    
    db_key = ActivationKey(
        key=key,
        expires_at=expires_at,
        created_by_user_id=user_id,
        notes=notes
    )
    
    db.add(db_key)
    db.commit()
    db.refresh(db_key)
    
    return db_key


def get_activation_key(db: Session, key: str) -> Optional[ActivationKey]:
    """Get an activation key by its value."""
    return db.query(ActivationKey).filter(ActivationKey.key == key).first()


def get_activation_key_by_id(db: Session, key_id: int) -> Optional[ActivationKey]:
    """Get an activation key by its ID."""
    return db.query(ActivationKey).filter(ActivationKey.id == key_id).first()


def get_all_activation_keys(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    include_used: bool = True,
    include_expired: bool = True
) -> List[ActivationKey]:
    """Get all activation keys with optional filtering."""
    query = db.query(ActivationKey)
    
    if not include_used:
        query = query.filter(ActivationKey.is_used == False)
    
    if not include_expired:
        query = query.filter(ActivationKey.expires_at > datetime.now(timezone.utc))
    
    return query.order_by(ActivationKey.created_at.desc()).offset(skip).limit(limit).all()


def validate_and_use_key(
    db: Session,
    key: str,
    agent_id: str,
    machine_id: str
) -> tuple[bool, str, Optional[ActivationKey]]:
    """Validate an activation key and mark it as used.
    
    Args:
        db: Database session
        key: The activation key to validate
        agent_id: The agent ID attempting to use the key
        machine_id: The machine ID of the agent
    
    Returns:
        Tuple of (is_valid, message, activation_key_object)
    """
    db_key = get_activation_key(db, key)
    
    if not db_key:
        return False, "Invalid activation key", None
    
    if db_key.is_used:
        return False, "This activation key has already been used", None
    
    if db_key.expires_at < datetime.now(timezone.utc):
        return False, "This activation key has expired", None
    
    # Mark key as used
    db_key.is_used = True
    db_key.used_at = datetime.now(timezone.utc)
    db_key.used_by_agent_id = agent_id
    db_key.used_by_machine_id = machine_id
    
    db.commit()
    db.refresh(db_key)
    
    return True, "Activation successful", db_key


def check_agent_activated(db: Session, machine_id: str) -> tuple[bool, Optional[ActivationKey]]:
    """Check if an agent/machine is already activated.
    
    Args:
        db: Database session
        machine_id: The machine ID to check
    
    Returns:
        Tuple of (is_activated, activation_key_object)
    """
    db_key = db.query(ActivationKey).filter(
        and_(
            ActivationKey.used_by_machine_id == machine_id,
            ActivationKey.is_used == True,
            ActivationKey.expires_at > datetime.now(timezone.utc)
        )
    ).first()
    
    if db_key:
        return True, db_key
    
    return False, None


def delete_activation_key(db: Session, key_id: int) -> bool:
    """Delete an activation key by ID."""
    db_key = get_activation_key_by_id(db, key_id)
    if db_key:
        db.delete(db_key)
        db.commit()
        return True
    return False


def count_activation_keys(
    db: Session,
    include_used: bool = True,
    include_expired: bool = True
) -> int:
    """Count activation keys with optional filtering."""
    query = db.query(ActivationKey)
    
    if not include_used:
        query = query.filter(ActivationKey.is_used == False)
    
    if not include_expired:
        query = query.filter(ActivationKey.expires_at > datetime.now(timezone.utc))
    
    return query.count()
