from sqlalchemy.orm import Session
from . import models, schemas

def get_all_groups(db: Session):
    """Get all groups regardless of user (for testing)"""
    groups = db.query(models.DeviceGroup).all()
    result = []
    for group in groups:
        # Get all device mappings for this group
        device_maps = db.query(models.DeviceGroupMap).filter_by(group_id=group.id).all()
        devices = []
        for dm in device_maps:
            # Get the actual device object for each mapping
            device = db.query(models.Device).filter_by(id=dm.device_id).first()
            if device:
                devices.append({
                    "id": device.id,
                    "device_name": device.device_name,
                    "ip_address": device.ip_address,
                    "mac_address": device.mac_address,
                    "os": device.os,
                    "status": device.status,
                    "connection_type": device.connection_type,
                    "last_seen": device.last_seen.isoformat() if device.last_seen else None,
                })
        result.append({
            "id": group.id,
            "group_name": group.group_name,
            "description": group.description,
            "color": group.color,
            "devices": devices
        })
    return result

def get_groups(db: Session, user_id: int):
    groups = db.query(models.DeviceGroup).filter(models.DeviceGroup.user_id == user_id).all()
    result = []
    for group in groups:
        # Get all device mappings for this group
        device_maps = db.query(models.DeviceGroupMap).filter_by(group_id=group.id).all()
        devices = []
        for dm in device_maps:
            # Get the actual device object for each mapping
            device = db.query(models.Device).filter_by(id=dm.device_id).first()
            if device:
                devices.append({
                    "id": device.id,
                    "device_name": device.device_name,
                    "ip_address": device.ip_address,
                    "mac_address": device.mac_address,
                    "os": device.os,
                    "status": device.status,
                    "connection_type": device.connection_type,
                    "last_seen": device.last_seen.isoformat() if device.last_seen else None,
                })
        result.append({
            "id": group.id,
            "group_name": group.group_name,
            "description": group.description,
            "color": group.color,
            "devices": devices
        })
    return result

def create_group(db: Session, group: schemas.GroupCreate, user_id: int):
    # Extract only the fields that belong to the DeviceGroup model
    group_data = {
        'group_name': group.group_name,
        'description': group.description,
        'color': group.color,
        'user_id': user_id
    }
    new_group = models.DeviceGroup(**group_data)
    db.add(new_group)
    db.commit()
    db.refresh(new_group)
    return new_group

def update_group(db: Session, group_id: int, group: schemas.GroupUpdate, user_id: int):
    db_group = db.query(models.DeviceGroup).filter(
        models.DeviceGroup.id == group_id,
        models.DeviceGroup.user_id == user_id
    ).first()
    if not db_group:
        return None
    
    # Update only the fields that belong to the DeviceGroup model
    update_data = group.dict(exclude_unset=True, exclude={'device_ids'})
    for key, value in update_data.items():
        setattr(db_group, key, value)
    db.commit()
    db.refresh(db_group)
    return db_group

def delete_group(db: Session, group_id: int, user_id: int):
    group = db.query(models.DeviceGroup).filter(
        models.DeviceGroup.id == group_id,
        models.DeviceGroup.user_id == user_id
    ).first()
    if group:
        db.delete(group)
        db.commit()
    return group

def assign_device_to_group(db: Session, device_id: int, group_id: int, user_id: int):
    # Check if the group belongs to the user
    group = db.query(models.DeviceGroup).filter(
        models.DeviceGroup.id == group_id,
        models.DeviceGroup.user_id == user_id
    ).first()
    if not group:
        return None
    
    # Check if device exists
    device = db.query(models.Device).filter(models.Device.id == device_id).first()
    if not device:
        return None
    
    # Remove device from any existing group (even if it belongs to another user)
    if device.group_id:
        # Remove from existing mapping
        existing_mapping = db.query(models.DeviceGroupMap).filter(
            models.DeviceGroupMap.device_id == device_id
        ).first()
        if existing_mapping:
            db.delete(existing_mapping)
    
    # Update device's group_id directly
    device.group_id = group_id
    db.commit()
    db.refresh(device)
    
    # Create new mapping
    mapping = models.DeviceGroupMap(device_id=device_id, group_id=group_id)
    db.add(mapping)
    db.commit()
    return mapping
    db.add(mapping)
    db.commit()
    return mapping

def remove_device_from_group(db: Session, device_id: int, group_id: int, user_id: int):
    # Check if the group belongs to the user
    group = db.query(models.DeviceGroup).filter(
        models.DeviceGroup.id == group_id,
        models.DeviceGroup.user_id == user_id
    ).first()
    if not group:
        return None
    
    # Update device's group_id to NULL
    device = db.query(models.Device).filter(models.Device.id == device_id).first()
    if device and device.group_id == group_id:
        device.group_id = None
        db.commit()
        db.refresh(device)
    
    # Also remove mapping for consistency
    mapping = db.query(models.DeviceGroupMap).filter(
        models.DeviceGroupMap.device_id == device_id,
        models.DeviceGroupMap.group_id == group_id
    ).first()
    if mapping:
        db.delete(mapping)
        db.commit()
    return mapping
