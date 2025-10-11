"""CRUD operations for device management."""
from sqlalchemy.orm import Session
from typing import List, Optional
from app.grouping.models import Device
from . import schemas
from datetime import datetime, timezone, timedelta

# IST timezone (UTC+5:30)
IST = timezone(timedelta(hours=5, minutes=30))

def get_ist_now():
    """Get current time in IST (Indian Standard Time) as naive datetime."""
    # Return naive datetime representing IST time (without timezone info)
    # This is because the database DateTime columns don't preserve timezone
    return datetime.now(IST).replace(tzinfo=None)

def get_device(db: Session, agent_id: str) -> Optional[Device]:
    """Get device by agent_id."""
    return db.query(Device).filter(Device.agent_id == agent_id).first()

def get_device_by_id(db: Session, device_id: int) -> Optional[Device]:
    """Get device by primary key id."""
    return db.query(Device).filter(Device.id == device_id).first()

def get_device_by_machine_id(db: Session, machine_id: str) -> Optional[Device]:
    """Get device by machine_id."""
    return db.query(Device).filter(Device.machine_id == machine_id).first()

def get_devices(db: Session, skip: int = 0, limit: int = 100) -> List[Device]:
    """Get list of devices with pagination."""
    return db.query(Device).offset(skip).limit(limit).all()

def get_total_devices_count(db: Session) -> int:
    """Get total count of devices."""
    return db.query(Device).count()

def get_online_devices(db: Session) -> List[Device]:
    """Get list of online devices."""
    return db.query(Device).filter(Device.status == "online").all()

def create_device(db: Session, device: schemas.DeviceCreate) -> Device:
    """Create a new device."""
    db_device = Device(**device.model_dump())
    db_device.status = "online"  # New devices are considered online when registered
    db_device.last_seen = datetime.utcnow()
    db.add(db_device)
    db.commit()
    db.refresh(db_device)
    return db_device

def update_device(db: Session, agent_id: str, device_update: schemas.DeviceUpdate) -> Optional[Device]:
    """Update device information."""
    db_device = get_device(db, agent_id)
    if db_device:
        update_data = device_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_device, field, value)
        db_device.updated_at = get_ist_now()
        db.commit()
        db.refresh(db_device)
    return db_device

def update_device_status(db: Session, agent_id: str, status: str) -> Optional[Device]:
    """Update device status."""
    db_device = get_device(db, agent_id)
    if db_device:
        db_device.status = status
        db_device.last_seen = get_ist_now()
        db_device.updated_at = get_ist_now()
        db.commit()
        db.refresh(db_device)
    return db_device

def update_device_last_seen(db: Session, agent_id: str) -> Optional[Device]:
    """Update device last seen timestamp."""
    db_device = get_device(db, agent_id)
    if db_device:
        db_device.last_seen = get_ist_now()
        db_device.updated_at = get_ist_now()
        db.commit()
        db.refresh(db_device)
    return db_device

def delete_device(db: Session, agent_id: str) -> bool:
    """Delete a device."""
    db_device = get_device(db, agent_id)
    if db_device:
        db.delete(db_device)
        db.commit()
        return True
    return False

def register_or_update_device(db: Session, registration: schemas.DeviceRegistrationRequest) -> Device:
    """Register a new device or update existing one."""
    # First try to find by agent_id
    existing_device = get_device(db, registration.agent_id)
    
    if existing_device:
        # Update existing device
        update_data = {
            "device_name": registration.device_name,
            "ip_address": registration.ip_address,
            "os": registration.os,
            "shells": registration.shells,
            "status": "online",
            "system_info": registration.system_info,
            "last_seen": get_ist_now()
        }
        
        # Add MAC address if provided
        if registration.mac_address:
            update_data["mac_address"] = registration.mac_address
        
        # Update system info fields if available
        sys_info = registration.system_info
        if sys_info:
            update_data.update({
                "os_version": sys_info.get("os_version"),
                "os_release": sys_info.get("os_release"),
                "processor": sys_info.get("processor"),
                "python_version": sys_info.get("python_version"),
                "cpu_count": sys_info.get("cpu_count"),
                "memory_total": sys_info.get("memory_total"),
                "memory_available": sys_info.get("memory_available"),
                "disk_total": sys_info.get("disk_total"),
                "disk_free": sys_info.get("disk_free"),
            })
            # Also extract MAC address from system_info if not in registration
            if not registration.mac_address and sys_info.get("mac_address"):
                update_data["mac_address"] = sys_info.get("mac_address")
        
        for field, value in update_data.items():
            if value is not None:
                setattr(existing_device, field, value)
        
        existing_device.updated_at = get_ist_now()
        db.commit()
        db.refresh(existing_device)
        return existing_device
    else:
        # Check if there's a device with the same machine_id but different agent_id
        machine_device = get_device_by_machine_id(db, registration.machine_id)
        if machine_device:
            # Update the existing device with new agent_id and info
            machine_device.agent_id = registration.agent_id
            machine_device.device_name = registration.device_name
            machine_device.ip_address = registration.ip_address
            machine_device.os = registration.os
            machine_device.shells = registration.shells
            machine_device.status = "online"
            machine_device.system_info = registration.system_info
            machine_device.last_seen = get_ist_now()
            machine_device.updated_at = get_ist_now()
            
            # Add MAC address if provided
            if registration.mac_address:
                machine_device.mac_address = registration.mac_address
            
            # Update system info fields if available
            sys_info = registration.system_info
            if sys_info:
                machine_device.os_version = sys_info.get("os_version")
                machine_device.os_release = sys_info.get("os_release")
                machine_device.processor = sys_info.get("processor")
                machine_device.python_version = sys_info.get("python_version")
                machine_device.cpu_count = sys_info.get("cpu_count")
                machine_device.memory_total = sys_info.get("memory_total")
                machine_device.memory_available = sys_info.get("memory_available")
                machine_device.disk_total = sys_info.get("disk_total")
                machine_device.disk_free = sys_info.get("disk_free")
                # Also extract MAC address from system_info if not in registration
                if not registration.mac_address and sys_info.get("mac_address"):
                    machine_device.mac_address = sys_info.get("mac_address")
            
            db.commit()
            db.refresh(machine_device)
            return machine_device
        else:
            # Create new device
            device_data = {
                "agent_id": registration.agent_id,
                "machine_id": registration.machine_id,
                "device_name": registration.device_name,
                "ip_address": registration.ip_address,
                "os": registration.os,
                "shells": registration.shells,
                "status": "online",
                "system_info": registration.system_info
            }
            
            # Add MAC address if provided
            if registration.mac_address:
                device_data["mac_address"] = registration.mac_address
            
            # Add system info fields if available
            sys_info = registration.system_info
            if sys_info:
                device_data.update({
                    "os_version": sys_info.get("os_version"),
                    "os_release": sys_info.get("os_release"),
                    "processor": sys_info.get("processor"),
                    "python_version": sys_info.get("python_version"),
                    "cpu_count": sys_info.get("cpu_count"),
                    "memory_total": sys_info.get("memory_total"),
                    "memory_available": sys_info.get("memory_available"),
                    "disk_total": sys_info.get("disk_total"),
                    "disk_free": sys_info.get("disk_free"),
                })
                # Also extract MAC address from system_info if not in registration
                if not registration.mac_address and sys_info.get("mac_address"):
                    device_data["mac_address"] = sys_info.get("mac_address")
            
            db_device = Device(**device_data)
            db.add(db_device)
            db.commit()
            db.refresh(db_device)
            return db_device