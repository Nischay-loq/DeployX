from sqlalchemy.orm import Session
from . import models, schemas

def get_groups(db: Session):
    return db.query(models.DeviceGroup).all()

def create_group(db: Session, group: schemas.GroupCreate):
    new_group = models.DeviceGroup(**group.dict())
    db.add(new_group)
    db.commit()
    db.refresh(new_group)
    return new_group

def update_group(db: Session, group_id: int, group: schemas.GroupUpdate):
    db_group = db.query(models.DeviceGroup).filter(models.DeviceGroup.id == group_id).first()
    if not db_group:
        return None
    for key, value in group.dict(exclude_unset=True).items():
        setattr(db_group, key, value)
    db.commit()
    db.refresh(db_group)
    return db_group

def delete_group(db: Session, group_id: int):
    group = db.query(models.DeviceGroup).filter(models.DeviceGroup.id == group_id).first()
    if group:
        db.delete(group)
        db.commit()
    return group

def assign_device_to_group(db: Session, device_id: int, group_id: int):
    mapping = models.DeviceGroupMap(device_id=device_id, group_id=group_id)
    db.add(mapping)
    db.commit()
    return mapping

def remove_device_from_group(db: Session, device_id: int, group_id: int):
    mapping = db.query(models.DeviceGroupMap).filter(
        models.DeviceGroupMap.device_id == device_id,
        models.DeviceGroupMap.group_id == group_id
    ).first()
    if mapping:
        db.delete(mapping)
        db.commit()
    return mapping
