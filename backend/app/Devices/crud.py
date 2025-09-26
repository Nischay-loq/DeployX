from sqlalchemy.orm import Session
from typing import List
from app.grouping.models import Device, DeviceGroup

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