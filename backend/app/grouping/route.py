from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timedelta
from typing import Dict, List
import logging
from app.auth.database import get_db, User
from app.auth.utils import get_current_user
from . import crud
from . import models
from . import schemas
from .command_executor import group_command_executor

logger = logging.getLogger(__name__)

_groups_cache = {
    "data": None,
    "timestamp": None,
    "ttl_seconds": 30
}

router = APIRouter(prefix="/groups", tags=["Groups"])

def _is_groups_cache_valid() -> bool:
    """Check if groups cache is still valid"""
    if _groups_cache["data"] is None or _groups_cache["timestamp"] is None:
        return False
    
    cache_age = datetime.now() - _groups_cache["timestamp"]
    return cache_age.total_seconds() < _groups_cache["ttl_seconds"]

def _update_groups_cache(data):
    """Update the groups cache with new data"""
    _groups_cache["data"] = data
    _groups_cache["timestamp"] = datetime.now()

@router.get("/", response_model=list[models.GroupResponse])
def list_groups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    force_refresh: bool = False
):
    if not force_refresh and _is_groups_cache_valid():
        print("Returning cached groups data")
        return _groups_cache["data"]
    
    print("Fetching fresh groups data from database")
    groups_data = crud.get_groups(db, current_user.id)
    
    _update_groups_cache(groups_data)
    return groups_data

@router.post("/", response_model=models.GroupResponse)
def create_group(
    group: models.GroupCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_group = crud.create_group(db, group, current_user.id)
    if group.device_ids:
        for device_id in group.device_ids:
            crud.assign_device_to_group(db, device_id, new_group.id, current_user.id)
    device_maps = db.query(models.DeviceGroupMap).filter_by(group_id=new_group.id).all()
    devices = []
    for dm in device_maps:
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
    _groups_cache["data"] = []
    _groups_cache["timestamp"] = datetime.min
    
    return {
        "id": new_group.id,
        "group_name": new_group.group_name,
        "description": new_group.description,
        "color": new_group.color,
        "devices": devices
    }

@router.put("/{group_id}", response_model=models.GroupResponse)
def update_group(
    group_id: int, 
    group: models.GroupUpdate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_group = db.query(models.DeviceGroup).filter(
        models.DeviceGroup.id == group_id,
        models.DeviceGroup.user_id == current_user.id
    ).first()
    if not db_group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    for key, value in group.dict(exclude_unset=True, exclude={"device_ids"}).items():
        setattr(db_group, key, value)
    db.commit()
    db.refresh(db_group)

    if hasattr(group, "device_ids") and group.device_ids is not None:
        db.query(models.DeviceGroupMap).filter_by(group_id=group_id).delete()
        db.commit()
        for device_id in group.device_ids:
            db.add(models.DeviceGroupMap(device_id=device_id, group_id=group_id))
        db.commit()

    device_maps = db.query(models.DeviceGroupMap).filter_by(group_id=db_group.id).all()
    devices = []
    for dm in device_maps:
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
    
    _groups_cache["data"] = []
    _groups_cache["timestamp"] = datetime.min
    
    return {
        "id": db_group.id,
        "group_name": db_group.group_name,
        "description": db_group.description,
        "color": db_group.color,
        "devices": devices
    }

@router.delete("/{group_id}")
def delete_group(
    group_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    deleted = crud.delete_group(db, group_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Group not found")
    
    _groups_cache["data"] = []
    _groups_cache["timestamp"] = datetime.min
    
    return {"message": "Group deleted"}

@router.post("/{group_id}/assign/{device_id}")
def assign_device(
    group_id: int, 
    device_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    device = db.query(models.Device).filter(models.Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    result = crud.assign_device_to_group(db, device_id, group_id, current_user.id)
    if not result:
        raise HTTPException(status_code=404, detail="Group not found or access denied")
    
    _groups_cache["data"] = []
    _groups_cache["timestamp"] = datetime.min
    
    return {"message": "Device assigned successfully"}

@router.delete("/{group_id}/remove/{device_id}")
def remove_device(
    group_id: int, 
    device_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = crud.remove_device_from_group(db, device_id, group_id, current_user.id)
    if not result:
        raise HTTPException(status_code=404, detail="Group not found, device not in group, or access denied")
    
    _groups_cache["data"] = []
    _groups_cache["timestamp"] = datetime.min
    
    return {"message": "Device removed successfully"}

@router.get("/devices")
def get_devices(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = text("""
        SELECT d.id, d.device_name, d.ip_address, d.os, d.status, d.connection_type, d.last_seen, g.group_name
        FROM devices d
        LEFT JOIN device_groups g ON d.group_id = g.id
        ORDER BY d.id
    """)
    result = db.execute(query)
    devices = [
        {
            "id": row.id,
            "device_name": row.device_name,
            "ip_address": row.ip_address,
            "os": row.os,
            "status": row.status,
            "connection_type": row.connection_type,
            "last_seen": row.last_seen.isoformat() if row.last_seen else None,
            "group_name": row.group_name,
        }
        for row in result
    ]
    return devices


# ==================== GROUP COMMAND EXECUTION ENDPOINTS ====================

@router.post("/{group_id}/commands", response_model=schemas.GroupCommandExecutionResponse)
async def execute_group_command(
    group_id: int,
    request: schemas.GroupCommandRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Execute a single command on all devices in a group.
    Similar to individual agent command execution but targets all devices in the group.
    """
    try:
        # Validate group exists and user has access
        db_group = db.query(models.DeviceGroup).filter(
            models.DeviceGroup.id == group_id,
            models.DeviceGroup.user_id == current_user.id
        ).first()
        
        if not db_group:
            raise HTTPException(status_code=404, detail="Group not found or access denied")
        
        # Validate command
        if not request.command or not request.command.strip():
            raise HTTPException(status_code=400, detail="Command cannot be empty")
        
        if len(request.command) > 1000:
            raise HTTPException(status_code=400, detail="Command too long (max 1000 characters)")
        
        # Get all devices in the group
        device_maps = db.query(models.DeviceGroupMap).filter_by(group_id=group_id).all()
        
        if not device_maps:
            raise HTTPException(status_code=400, detail="No devices in group")
        
        # Fetch device details
        devices = []
        for dm in device_maps:
            device = db.query(models.Device).filter_by(id=dm.device_id).first()
            if device and device.agent_id:  # Only include devices with agent_id
                devices.append({
                    "id": device.id,
                    "agent_id": device.agent_id,
                    "device_name": device.device_name or f"Device-{device.id}",
                    "status": device.status
                })
                logger.info(f"Device {device.id} in group: agent_id={device.agent_id}, status={device.status}, name={device.device_name}")
        
        if not devices:
            raise HTTPException(status_code=400, detail="No connected devices in group")
        
        # Log currently connected agents for debugging
        from app.main import conn_manager
        connected_agents = conn_manager.get_agent_list()
        logger.info(f"Devices in group {group_id}: {[d['agent_id'] for d in devices]}")
        logger.info(f"Currently connected agents: {connected_agents}")
        
        # Filter only online/connected devices (optional - you can remove this to attempt all)
        online_devices = [d for d in devices if d.get('status') == 'online']
        
        if not online_devices:
            logger.warning(f"No online devices in group {group_id}, attempting all devices")
            online_devices = devices  # Try all devices anyway
        
        # Execute command on group
        execution_id = await group_command_executor.execute_group_command(
            group_id=group_id,
            group_name=db_group.group_name,
            devices=online_devices,
            command=request.command.strip(),
            shell=request.shell,
            strategy=request.strategy
        )
        
        # Get initial status
        execution_status = group_command_executor.get_execution_status(execution_id)
        
        if not execution_status:
            raise HTTPException(status_code=500, detail="Failed to create execution")
        
        return schemas.GroupCommandExecutionResponse(**execution_status)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error executing group command: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/{group_id}/commands/batch", response_model=List[schemas.GroupCommandExecutionResponse])
async def execute_group_batch_parallel(
    group_id: int,
    request: schemas.GroupCommandBatchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Execute multiple commands on a group in parallel.
    All commands are sent to all devices at once.
    """
    try:
        # Validate group
        db_group = db.query(models.DeviceGroup).filter(
            models.DeviceGroup.id == group_id,
            models.DeviceGroup.user_id == current_user.id
        ).first()
        
        if not db_group:
            raise HTTPException(status_code=404, detail="Group not found or access denied")
        
        # Validate commands
        if not request.commands or len(request.commands) == 0:
            raise HTTPException(status_code=400, detail="Commands list cannot be empty")
        
        if len(request.commands) > 50:
            raise HTTPException(status_code=400, detail="Too many commands (max 50)")
        
        # Get devices in group
        device_maps = db.query(models.DeviceGroupMap).filter_by(group_id=group_id).all()
        
        if not device_maps:
            raise HTTPException(status_code=400, detail="No devices in group")
        
        devices = []
        for dm in device_maps:
            device = db.query(models.Device).filter_by(id=dm.device_id).first()
            if device and device.agent_id:
                devices.append({
                    "id": device.id,
                    "agent_id": device.agent_id,
                    "device_name": device.device_name or f"Device-{device.id}",
                    "status": device.status
                })
        
        if not devices:
            raise HTTPException(status_code=400, detail="No connected devices in group")
        
        # Execute all commands in parallel
        execution_ids = []
        for command in request.commands:
            execution_id = await group_command_executor.execute_group_command(
                group_id=group_id,
                group_name=db_group.group_name,
                devices=devices,
                command=command,
                shell=request.shell,
                strategy=request.strategy
            )
            execution_ids.append(execution_id)
        
        # Return status of all executions
        responses = []
        for exec_id in execution_ids:
            status = group_command_executor.get_execution_status(exec_id)
            if status:
                responses.append(schemas.GroupCommandExecutionResponse(**status))
        
        return responses
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error executing batch commands: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{group_id}/commands/batch/sequential", response_model=schemas.GroupBatchExecutionResponse)
async def execute_group_batch_sequential(
    group_id: int,
    request: schemas.GroupCommandSequentialRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Execute multiple commands on a group sequentially.
    All devices execute command 1, then all execute command 2, etc.
    """
    try:
        # Validate group
        db_group = db.query(models.DeviceGroup).filter(
            models.DeviceGroup.id == group_id,
            models.DeviceGroup.user_id == current_user.id
        ).first()
        
        if not db_group:
            raise HTTPException(status_code=404, detail="Group not found or access denied")
        
        # Validate commands
        if not request.commands or len(request.commands) == 0:
            raise HTTPException(status_code=400, detail="Commands list cannot be empty")
        
        if len(request.commands) > 50:
            raise HTTPException(status_code=400, detail="Too many commands (max 50)")
        
        # Get devices in group
        device_maps = db.query(models.DeviceGroupMap).filter_by(group_id=group_id).all()
        
        if not device_maps:
            raise HTTPException(status_code=400, detail="No devices in group")
        
        devices = []
        for dm in device_maps:
            device = db.query(models.Device).filter_by(id=dm.device_id).first()
            if device and device.agent_id:
                devices.append({
                    "id": device.id,
                    "agent_id": device.agent_id,
                    "device_name": device.device_name or f"Device-{device.id}",
                    "status": device.status
                })
        
        if not devices:
            raise HTTPException(status_code=400, detail="No connected devices in group")
        
        # Execute batch sequentially
        batch_id = await group_command_executor.execute_batch_sequential(
            group_id=group_id,
            group_name=db_group.group_name,
            devices=devices,
            commands=request.commands,
            shell=request.shell,
            stop_on_failure=request.stop_on_failure
        )
        
        # Return initial batch status
        batch_status = group_command_executor.get_batch_status(batch_id)
        
        if not batch_status:
            raise HTTPException(status_code=500, detail="Failed to create batch execution")
        
        return schemas.GroupBatchExecutionResponse(**batch_status)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error executing sequential batch: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{group_id}/commands/executions", response_model=Dict[str, schemas.GroupCommandExecutionResponse])
async def get_group_executions(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all active command executions for a group"""
    try:
        # Validate group access
        db_group = db.query(models.DeviceGroup).filter(
            models.DeviceGroup.id == group_id,
            models.DeviceGroup.user_id == current_user.id
        ).first()
        
        if not db_group:
            raise HTTPException(status_code=404, detail="Group not found or access denied")
        
        # Get all executions
        all_executions = group_command_executor.get_all_active_executions()
        
        # Filter by group_id
        group_executions = {
            exec_id: schemas.GroupCommandExecutionResponse(**exec_data)
            for exec_id, exec_data in all_executions.items()
            if exec_data.get('group_id') == group_id
        }
        
        return group_executions
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting group executions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{group_id}/commands/executions/{execution_id}", response_model=schemas.GroupCommandExecutionResponse)
async def get_execution_status(
    group_id: int,
    execution_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get status of a specific execution"""
    try:
        # Validate group access
        db_group = db.query(models.DeviceGroup).filter(
            models.DeviceGroup.id == group_id,
            models.DeviceGroup.user_id == current_user.id
        ).first()
        
        if not db_group:
            raise HTTPException(status_code=404, detail="Group not found or access denied")
        
        execution_status = group_command_executor.get_execution_status(execution_id)
        
        if not execution_status:
            raise HTTPException(status_code=404, detail="Execution not found")
        
        # Verify execution belongs to this group
        if execution_status.get('group_id') != group_id:
            raise HTTPException(status_code=403, detail="Execution does not belong to this group")
        
        return schemas.GroupCommandExecutionResponse(**execution_status)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting execution status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{group_id}/commands/batches", response_model=Dict[str, schemas.GroupBatchExecutionResponse])
async def get_group_batches(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all active batch executions for a group"""
    try:
        # Validate group access
        db_group = db.query(models.DeviceGroup).filter(
            models.DeviceGroup.id == group_id,
            models.DeviceGroup.user_id == current_user.id
        ).first()
        
        if not db_group:
            raise HTTPException(status_code=404, detail="Group not found or access denied")
        
        # Get all batches
        all_batches = group_command_executor.get_all_active_batches()
        
        # Filter by group_id
        group_batches = {
            batch_id: schemas.GroupBatchExecutionResponse(**batch_data)
            for batch_id, batch_data in all_batches.items()
            if batch_data.get('group_id') == group_id
        }
        
        return group_batches
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting group batches: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{group_id}/commands/batches/{batch_id}", response_model=schemas.GroupBatchExecutionResponse)
async def get_batch_status(
    group_id: int,
    batch_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get status of a specific batch execution"""
    try:
        # Validate group access
        db_group = db.query(models.DeviceGroup).filter(
            models.DeviceGroup.id == group_id,
            models.DeviceGroup.user_id == current_user.id
        ).first()
        
        if not db_group:
            raise HTTPException(status_code=404, detail="Group not found or access denied")
        
        batch_status = group_command_executor.get_batch_status(batch_id)
        
        if not batch_status:
            raise HTTPException(status_code=404, detail="Batch not found")
        
        # Verify batch belongs to this group
        if batch_status.get('group_id') != group_id:
            raise HTTPException(status_code=403, detail="Batch does not belong to this group")
        
        return schemas.GroupBatchExecutionResponse(**batch_status)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting batch status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{group_id}/commands/executions/{execution_id}")
async def cleanup_execution(
    group_id: int,
    execution_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Clean up a completed execution"""
    try:
        # Validate group access
        db_group = db.query(models.DeviceGroup).filter(
            models.DeviceGroup.id == group_id,
            models.DeviceGroup.user_id == current_user.id
        ).first()
        
        if not db_group:
            raise HTTPException(status_code=404, detail="Group not found or access denied")
        
        success = group_command_executor.cleanup_completed_execution(execution_id)
        
        if not success:
            raise HTTPException(status_code=400, detail="Cannot cleanup execution (not found or still active)")
        
        return {"message": f"Execution {execution_id} cleaned up successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cleaning up execution: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{group_id}/commands/batches/{batch_id}")
async def cleanup_batch(
    group_id: int,
    batch_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Clean up a completed batch"""
    try:
        # Validate group access
        db_group = db.query(models.DeviceGroup).filter(
            models.DeviceGroup.id == group_id,
            models.DeviceGroup.user_id == current_user.id
        ).first()
        
        if not db_group:
            raise HTTPException(status_code=404, detail="Group not found or access denied")
        
        success = group_command_executor.cleanup_completed_batch(batch_id)
        
        if not success:
            raise HTTPException(status_code=400, detail="Cannot cleanup batch (not found or still active)")
        
        return {"message": f"Batch {batch_id} cleaned up successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cleaning up batch: {e}")
        raise HTTPException(status_code=500, detail=str(e))