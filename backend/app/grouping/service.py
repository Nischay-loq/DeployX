"""Shared grouping service: ownership checks and target-device resolution."""
import logging
from typing import Iterable, List, Optional, Sequence, Set

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.grouping.models import DeviceGroup, DeviceGroupMap

logger = logging.getLogger(__name__)


def get_owned_group(db: Session, group_id: int, user_id: int) -> DeviceGroup:
    """Return the device group if owned by the user, else raise 404."""
    group = db.query(DeviceGroup).filter(
        DeviceGroup.id == group_id,
        DeviceGroup.user_id == user_id
    ).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found or access denied")
    return group


def expand_group_device_ids(db: Session, group_ids: Sequence[int], user_id: Optional[int] = None) -> List[int]:
    """Return device IDs mapped to the given groups.

    If user_id is provided, only groups owned by that user are expanded;
    unowned/unknown group IDs are ignored (logged).
    """
    if not group_ids:
        return []

    query = db.query(DeviceGroup.id).filter(DeviceGroup.id.in_(group_ids))
    if user_id is not None:
        query = query.filter(DeviceGroup.user_id == user_id)
    owned_ids = [row[0] for row in query.all()]

    skipped = set(group_ids) - set(owned_ids)
    if skipped:
        logger.warning(f"Skipping group IDs not accessible to user {user_id}: {sorted(skipped)}")

    if not owned_ids:
        return []

    rows = db.query(DeviceGroupMap.device_id).filter(
        DeviceGroupMap.group_id.in_(owned_ids)
    ).all()
    return [row[0] for row in rows]


def resolve_target_device_ids(
    db: Session,
    user_id: Optional[int] = None,
    device_ids: Optional[Iterable[int]] = None,
    group_ids: Optional[Iterable[int]] = None,
    verify_ownership: bool = True,
) -> Set[int]:
    """Resolve the union of explicit device IDs and devices from selected groups.

    Args:
        db: Database session.
        user_id: Owner to validate group access against (when verify_ownership).
        device_ids: Explicitly selected device IDs.
        group_ids: Group IDs whose members should be added.
        verify_ownership: Only expand groups owned by user_id.

    Returns:
        Set of unique target device IDs.
    """
    targets: Set[int] = set(device_ids or [])
    owner = user_id if verify_ownership else None
    targets.update(expand_group_device_ids(db, list(group_ids or []), owner))
    return targets
