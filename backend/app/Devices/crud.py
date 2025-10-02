from sqlalchemy.orm import Session
from typing import List, Optional
from app.grouping.models import Device, DeviceGroup
from datetime import datetime, timezone, timedelta
import ipaddress

# IST timezone (UTC+5:30)
IST = timezone(timedelta(hours=5, minutes=30))

def get_ist_now():
    """Get current time in IST (Indian Standard Time) as naive datetime."""
    # Return naive datetime representing IST time (without timezone info)
    # This is because the database DateTime columns don't preserve timezone
    return datetime.now(IST).replace(tzinfo=None)

def get_devices(db: Session):
    """
    Return all devices with their group name (if available).
    """
    devices = []
    rows = (
        db.query(Device, DeviceGroup.group_name)
        .outerjoin(DeviceGroup, Device.group_id == DeviceGroup.id)
        .order_by(Device.id)
        .all()
    )
    for device, group_name in rows:
        devices.append({
            "id": device.id,
            "device_name": device.device_name,
            "ip_address": str(device.ip_address) if device.ip_address is not None else None,
            "mac_address": device.mac_address,
            "os": device.os,
            "status": device.status,
            "connection_type": device.connection_type,
            "last_seen": device.last_seen.isoformat() if device.last_seen else None,
            "group_id": device.group_id,
            "group_name": group_name,
        })
    return devices

def get_device(db: Session, device_id: int) -> Device:
    """Get a single device by ID"""
    return db.query(Device).filter(Device.id == device_id).first()

def get_devices_by_ids(db: Session, device_ids: List[int]) -> List[Device]:
    """Get multiple devices by their IDs"""
    return db.query(Device).filter(Device.id.in_(device_ids)).all()

def get_device_by_agent_id(db: Session, agent_id: str) -> Optional[Device]:
    """Get device by agent_id."""
    return db.query(Device).filter(Device.agent_id == agent_id).first()

def get_device_by_machine_id(db: Session, machine_id: str) -> Optional[Device]:
    """Get device by machine_id."""
    return db.query(Device).filter(Device.machine_id == machine_id).first()

def register_or_update_device(db: Session, registration_data) -> Device:
    """Register a new device or update existing one based on agent registration."""
    # Support both dict and Pydantic model
    if hasattr(registration_data, 'agent_id'):
        # Pydantic model
        agent_id = registration_data.agent_id
        machine_id = registration_data.machine_id
        device_name = registration_data.device_name
        ip_address = registration_data.ip_address
        os_val = registration_data.os
        shells = registration_data.shells
        system_info = registration_data.system_info
    else:
        # Dict
        agent_id = registration_data.get("agent_id")
        machine_id = registration_data.get("machine_id")
        device_name = registration_data.get("device_name")
        ip_address = registration_data.get("ip_address", "0.0.0.0")
        os_val = registration_data.get("os")
        shells = registration_data.get("shells")
        system_info = registration_data.get("system_info")
    
    # First try to find by agent_id
    existing_device = get_device_by_agent_id(db, agent_id)
    
    if existing_device:
        # Update existing device
        existing_device.device_name = device_name
        existing_device.ip_address = ip_address
        existing_device.os = os_val
        existing_device.shells = shells
        existing_device.status = "online"
        existing_device.system_info = system_info
        existing_device.last_seen = get_ist_now()
        existing_device.updated_at = get_ist_now()
        
        # Update system info fields if available
        sys_info = system_info or {}
        if sys_info:
            existing_device.os_version = sys_info.get("os_version")
            existing_device.os_release = sys_info.get("os_release")
            existing_device.processor = sys_info.get("processor")
            existing_device.python_version = sys_info.get("python_version")
            existing_device.cpu_count = sys_info.get("cpu_count")
            existing_device.memory_total = sys_info.get("memory_total")
            existing_device.memory_available = sys_info.get("memory_available")
            existing_device.disk_total = sys_info.get("disk_total")
            existing_device.disk_free = sys_info.get("disk_free")
        
        db.commit()
        db.refresh(existing_device)
        return existing_device
    else:
        # Check if machine already exists with different agent_id
        machine_device = get_device_by_machine_id(db, machine_id)
        
        if machine_device:
            # Update machine with new agent_id
            machine_device.agent_id = agent_id
            machine_device.device_name = device_name
            machine_device.ip_address = ip_address
            machine_device.os = os_val
            machine_device.shells = shells
            machine_device.status = "online"
            machine_device.system_info = system_info
            machine_device.last_seen = get_ist_now()
            machine_device.updated_at = get_ist_now()
            
            # Update system info fields if available
            sys_info = system_info or {}
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
            
            db.commit()
            db.refresh(machine_device)
            return machine_device
        else:
            # Create new device
            device_data = {
                "agent_id": agent_id,
                "machine_id": machine_id,
                "device_name": device_name,
                "ip_address": ip_address,
                "os": os_val,
                "shells": shells,
                "status": "online",
                "system_info": system_info
            }
            
            # Add system info fields if available
            sys_info = system_info or {}
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
            
            db_device = Device(**device_data)
            db.add(db_device)
            db.commit()
            db.refresh(db_device)
            return db_device

def update_device_status(db: Session, agent_id: str, status: str) -> Optional[Device]:
    """Update device status."""
    db_device = get_device_by_agent_id(db, agent_id)
    if db_device:
        db_device.status = status
        db_device.updated_at = get_ist_now()
        if status == "online":
            db_device.last_seen = get_ist_now()
        db.commit()
        db.refresh(db_device)
    return db_device

def update_device_last_seen(db: Session, agent_id: str) -> Optional[Device]:
    """Update device last seen timestamp."""
    db_device = get_device_by_agent_id(db, agent_id)
    if db_device:
        db_device.last_seen = get_ist_now()
        db_device.updated_at = get_ist_now()
        db.commit()
        db.refresh(db_device)
    return db_device