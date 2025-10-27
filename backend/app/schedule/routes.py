"""
REST API endpoints for task scheduling management
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import json
import logging
import pytz

from app.auth.database import get_db, User
from app.auth.utils import get_current_user
from app.schedule.models import (
    ScheduledTask, ScheduledTaskExecution, TaskType, TaskStatus,
    ScheduledTaskCreate, ScheduledTaskUpdate, ScheduledTaskResponse,
    ScheduledTaskDetail, TaskExecutionResponse, RecurrenceType
)
from app.schedule.scheduler import task_scheduler

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/schedule", tags=["Scheduling"])


@router.post("/tasks", response_model=ScheduledTaskResponse, status_code=201)
async def create_scheduled_task(
    task_data: ScheduledTaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new scheduled task"""
    try:
        # Validate payload based on task type
        payload = None
        if task_data.task_type == TaskType.COMMAND:
            if not task_data.command_payload:
                raise HTTPException(status_code=400, detail="command_payload is required for command tasks")
            # Validate that at least one of command or commands is provided
            if not task_data.command_payload.command and not task_data.command_payload.commands:
                raise HTTPException(status_code=400, detail="Either command or commands must be provided in command_payload")
            payload = task_data.command_payload.dict()
        elif task_data.task_type == TaskType.SOFTWARE_DEPLOYMENT:
            if not task_data.software_payload:
                raise HTTPException(status_code=400, detail="software_payload is required for software deployment tasks")
            payload = task_data.software_payload.dict()
        elif task_data.task_type == TaskType.FILE_DEPLOYMENT:
            if not task_data.file_payload:
                raise HTTPException(status_code=400, detail="file_payload is required for file deployment tasks")
            logger.info(f"File deployment task - file_payload: {task_data.file_payload}")
            payload = task_data.file_payload.dict()
            logger.info(f"File deployment task - payload after dict(): {payload}")
        
        # Validate targets
        if not task_data.device_ids and not task_data.group_ids:
            raise HTTPException(status_code=400, detail="At least one device or group must be specified")
        
        # Validate scheduled time
        if task_data.recurrence_type == RecurrenceType.ONCE:
            # Make scheduled_time timezone-aware for comparison
            scheduled_time = task_data.scheduled_time
            if scheduled_time.tzinfo is None:
                scheduled_time = pytz.UTC.localize(scheduled_time)
            
            # Compare with timezone-aware current time
            current_time = datetime.now(pytz.UTC)
            if scheduled_time <= current_time:
                raise HTTPException(status_code=400, detail="Scheduled time must be in the future for one-time tasks")
        
        # Create task
        task = ScheduledTask(
            task_name=task_data.task_name,
            task_type=task_data.task_type,
            status=TaskStatus.PENDING,
            scheduled_time=task_data.scheduled_time,
            recurrence_type=task_data.recurrence_type,
            recurrence_config=json.dumps(task_data.recurrence_config.dict()) if task_data.recurrence_config else None,
            device_ids=json.dumps(task_data.device_ids),
            group_ids=json.dumps(task_data.group_ids),
            payload=json.dumps(payload),
            created_by=current_user.id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(task)
        db.commit()
        db.refresh(task)
        
        # Schedule the task
        if task_scheduler.schedule_task(db, task):
            logger.info(f"Created and scheduled task {task.id} by user {current_user.id}")
        else:
            logger.warning(f"Created task {task.id} but failed to schedule it")
        
        # Parse for response
        return ScheduledTaskResponse(
            id=task.id,
            task_name=task.task_name,
            task_type=task.task_type,
            status=task.status,
            scheduled_time=task.scheduled_time,
            recurrence_type=task.recurrence_type,
            device_ids=json.loads(task.device_ids) if task.device_ids else [],
            group_ids=json.loads(task.group_ids) if task.group_ids else [],
            created_at=task.created_at,
            updated_at=task.updated_at,
            last_execution=task.last_execution,
            next_execution=task.next_execution,
            execution_count=task.execution_count,
            created_by=task.created_by
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating scheduled task: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create scheduled task: {str(e)}")


@router.get("/tasks")
async def get_scheduled_tasks(
    task_type: Optional[TaskType] = None,
    status: Optional[TaskStatus] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all scheduled tasks for the current user with pagination"""
    try:
        query = db.query(ScheduledTask).filter(ScheduledTask.created_by == current_user.id)
        
        if task_type:
            query = query.filter(ScheduledTask.task_type == task_type)
        
        if status:
            query = query.filter(ScheduledTask.status == status)
        
        # Get total count before pagination
        total_count = query.count()
        
        tasks = query.order_by(ScheduledTask.next_execution.asc()).offset(skip).limit(limit).all()
        
        result = []
        for task in tasks:
            # Ensure datetime fields are timezone-aware or properly formatted
            scheduled_time = task.scheduled_time
            if scheduled_time and not scheduled_time.tzinfo:
                scheduled_time = pytz.UTC.localize(scheduled_time)
            
            next_execution = task.next_execution
            if next_execution and not next_execution.tzinfo:
                next_execution = pytz.UTC.localize(next_execution)
            
            last_execution = task.last_execution
            if last_execution and not last_execution.tzinfo:
                last_execution = pytz.UTC.localize(last_execution)
            
            created_at = task.created_at
            if created_at and not created_at.tzinfo:
                created_at = pytz.UTC.localize(created_at)
            
            updated_at = task.updated_at
            if updated_at and not updated_at.tzinfo:
                updated_at = pytz.UTC.localize(updated_at)
            
            result.append(ScheduledTaskDetail(
                id=task.id,
                task_name=task.task_name,
                task_type=task.task_type,
                status=task.status,
                scheduled_time=scheduled_time,
                recurrence_type=task.recurrence_type,
                device_ids=json.loads(task.device_ids) if task.device_ids else [],
                group_ids=json.loads(task.group_ids) if task.group_ids else [],
                created_at=created_at,
                updated_at=updated_at,
                last_execution=last_execution,
                next_execution=next_execution,
                execution_count=task.execution_count,
                created_by=task.created_by,
                payload=json.loads(task.payload) if task.payload else {},
                recurrence_config=json.loads(task.recurrence_config) if task.recurrence_config else None,
                last_result=json.loads(task.last_result) if task.last_result else None,
                error_message=task.error_message,
                executions=[]  # Don't include executions in list view for performance
            ))
        
        # Calculate total pages
        total_pages = (total_count + limit - 1) // limit if limit > 0 else 1
        
        return {
            "tasks": result,
            "total": total_count,
            "total_pages": total_pages,
            "page": (skip // limit) + 1 if limit > 0 else 1,
            "page_size": limit
        }
        
    except Exception as e:
        logger.error(f"Error getting scheduled tasks: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get scheduled tasks: {str(e)}")


@router.get("/tasks/{task_id}", response_model=ScheduledTaskDetail)
async def get_scheduled_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get details of a specific scheduled task"""
    try:
        task = db.query(ScheduledTask).filter(
            ScheduledTask.id == task_id,
            ScheduledTask.created_by == current_user.id
        ).first()
        
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Get execution history
        executions = db.query(ScheduledTaskExecution).filter(
            ScheduledTaskExecution.task_id == task_id
        ).order_by(ScheduledTaskExecution.execution_time.desc()).limit(10).all()
        
        execution_list = []
        for exec in executions:
            execution_list.append({
                "id": exec.id,
                "execution_time": exec.execution_time.isoformat(),
                "completed_time": exec.completed_time.isoformat() if exec.completed_time else None,
                "status": exec.status,
                "deployment_id": exec.deployment_id,
                "result": json.loads(exec.result) if exec.result else None,
                "error_message": exec.error_message
            })
        
        # Ensure datetime fields are timezone-aware
        scheduled_time = task.scheduled_time
        if scheduled_time and not scheduled_time.tzinfo:
            scheduled_time = pytz.UTC.localize(scheduled_time)
        
        next_execution = task.next_execution
        if next_execution and not next_execution.tzinfo:
            next_execution = pytz.UTC.localize(next_execution)
        
        last_execution = task.last_execution
        if last_execution and not last_execution.tzinfo:
            last_execution = pytz.UTC.localize(last_execution)
        
        created_at = task.created_at
        if created_at and not created_at.tzinfo:
            created_at = pytz.UTC.localize(created_at)
        
        updated_at = task.updated_at
        if updated_at and not updated_at.tzinfo:
            updated_at = pytz.UTC.localize(updated_at)
        
        return ScheduledTaskDetail(
            id=task.id,
            task_name=task.task_name,
            task_type=task.task_type,
            status=task.status,
            scheduled_time=scheduled_time,
            recurrence_type=task.recurrence_type,
            device_ids=json.loads(task.device_ids) if task.device_ids else [],
            group_ids=json.loads(task.group_ids) if task.group_ids else [],
            created_at=created_at,
            updated_at=updated_at,
            last_execution=last_execution,
            next_execution=next_execution,
            execution_count=task.execution_count,
            created_by=task.created_by,
            payload=json.loads(task.payload) if task.payload else {},
            recurrence_config=json.loads(task.recurrence_config) if task.recurrence_config else None,
            last_result=json.loads(task.last_result) if task.last_result else None,
            error_message=task.error_message,
            executions=execution_list
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting task {task_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get task: {str(e)}")


@router.put("/tasks/{task_id}", response_model=ScheduledTaskDetail)
async def update_scheduled_task(
    task_id: int,
    task_update: ScheduledTaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a scheduled task"""
    try:
        task = db.query(ScheduledTask).filter(
            ScheduledTask.id == task_id,
            ScheduledTask.created_by == current_user.id
        ).first()
        
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Prevent editing completed tasks (but allow failed tasks for retry)
        if task.status == TaskStatus.COMPLETED:
            raise HTTPException(status_code=400, detail="Cannot edit completed tasks")
        # Failed tasks can be edited for retry purposes
        
        # Update fields
        if task_update.task_name is not None:
            task.task_name = task_update.task_name
        
        if task_update.scheduled_time is not None:
            task.scheduled_time = task_update.scheduled_time
        
        if task_update.recurrence_type is not None:
            task.recurrence_type = task_update.recurrence_type
        
        if task_update.recurrence_config is not None:
            task.recurrence_config = json.dumps(task_update.recurrence_config.dict())
        
        if task_update.status is not None:
            # Validate status transitions
            if task_update.status == TaskStatus.PAUSED and task.status not in [TaskStatus.PENDING]:
                raise HTTPException(status_code=400, detail="Only pending tasks can be paused")
            if task_update.status == TaskStatus.PENDING and task.status not in [TaskStatus.PAUSED, TaskStatus.FAILED]:
                raise HTTPException(status_code=400, detail="Only paused or failed tasks can be set to pending")
            if task.status == TaskStatus.COMPLETED and task_update.status != task.status:
                raise HTTPException(status_code=400, detail="Cannot modify completed tasks")
            # Allow failed tasks to be retried by setting status to pending
            
            old_status = task.status
            task.status = task_update.status
            
            # Update scheduler state for pause/resume (reschedule will be done after commit)
            if task_update.status == TaskStatus.PAUSED:
                task_scheduler.pause_task(task.id)
            elif task_update.status == TaskStatus.PENDING and old_status == TaskStatus.PAUSED:
                task_scheduler.resume_task(task.id)
            # Note: Retry reschedule will be handled after commit to ensure all fields are updated
        
        if task_update.device_ids is not None:
            task.device_ids = json.dumps(task_update.device_ids)
        
        if task_update.group_ids is not None:
            task.group_ids = json.dumps(task_update.group_ids)
        
        # Update payload based on task type
        if task.task_type == TaskType.COMMAND and task_update.command_payload is not None:
            task.payload = json.dumps(task_update.command_payload.dict())
        elif task.task_type == TaskType.SOFTWARE_DEPLOYMENT and task_update.software_payload is not None:
            task.payload = json.dumps(task_update.software_payload.dict())
        elif task.task_type == TaskType.FILE_DEPLOYMENT and task_update.file_payload is not None:
            task.payload = json.dumps(task_update.file_payload.dict())
        
        task.updated_at = datetime.utcnow()
        db.commit()
        
        # Determine if we need to reschedule
        need_reschedule = False
        
        # Reschedule if time or recurrence changed
        if task_update.scheduled_time or task_update.recurrence_type or task_update.recurrence_config:
            if task.status in [TaskStatus.PENDING, TaskStatus.PAUSED]:
                need_reschedule = True
        
        # Also reschedule if status changed to pending (covers retry case)
        if task_update.status and task.status == TaskStatus.PENDING:
            need_reschedule = True
        
        if need_reschedule:
            logger.info(f"Rescheduling task {task.id} (status: {task.status}, scheduled_time: {task.scheduled_time})")
            success = task_scheduler.reschedule_task(db, task)
            if success:
                logger.info(f"Task {task.id} successfully rescheduled. Next execution: {task.next_execution}")
            else:
                logger.error(f"Failed to reschedule task {task.id}")
            # Refresh to get updated next_execution
            db.refresh(task)
        elif task_update.status:
            # Just refresh if status changed but no reschedule needed
            db.refresh(task)
        
        # Ensure datetime fields are timezone-aware
        scheduled_time = task.scheduled_time
        if scheduled_time and not scheduled_time.tzinfo:
            scheduled_time = pytz.UTC.localize(scheduled_time)
        
        next_execution = task.next_execution
        if next_execution and not next_execution.tzinfo:
            next_execution = pytz.UTC.localize(next_execution)
        
        last_execution = task.last_execution
        if last_execution and not last_execution.tzinfo:
            last_execution = pytz.UTC.localize(last_execution)
        
        created_at = task.created_at
        if created_at and not created_at.tzinfo:
            created_at = pytz.UTC.localize(created_at)
        
        updated_at = task.updated_at
        if updated_at and not updated_at.tzinfo:
            updated_at = pytz.UTC.localize(updated_at)
        
        # Return full details
        return ScheduledTaskDetail(
            id=task.id,
            task_name=task.task_name,
            task_type=task.task_type,
            status=task.status,
            scheduled_time=scheduled_time,
            recurrence_type=task.recurrence_type,
            device_ids=json.loads(task.device_ids) if task.device_ids else [],
            group_ids=json.loads(task.group_ids) if task.group_ids else [],
            created_at=created_at,
            updated_at=updated_at,
            last_execution=last_execution,
            next_execution=next_execution,
            execution_count=task.execution_count,
            created_by=task.created_by,
            payload=json.loads(task.payload) if task.payload else {},
            recurrence_config=json.loads(task.recurrence_config) if task.recurrence_config else None,
            last_result=json.loads(task.last_result) if task.last_result else None,
            error_message=task.error_message,
            executions=[]  # Don't include executions in update response for performance
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating task {task_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to update task: {str(e)}")


@router.delete("/tasks/{task_id}")
async def delete_scheduled_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a scheduled task"""
    try:
        task = db.query(ScheduledTask).filter(
            ScheduledTask.id == task_id,
            ScheduledTask.created_by == current_user.id
        ).first()
        
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Cancel from scheduler
        task_scheduler.cancel_task(task_id)
        
        # Delete from database
        db.delete(task)
        db.commit()
        
        logger.info(f"Deleted task {task_id}")
        
        return {"message": f"Task {task_id} deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting task {task_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to delete task: {str(e)}")


@router.post("/tasks/{task_id}/pause")
async def pause_scheduled_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Pause a scheduled task"""
    try:
        task = db.query(ScheduledTask).filter(
            ScheduledTask.id == task_id,
            ScheduledTask.created_by == current_user.id
        ).first()
        
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        if task.status not in [TaskStatus.PENDING]:
            raise HTTPException(status_code=400, detail="Only pending tasks can be paused")
        
        # Pause in scheduler
        if task_scheduler.pause_task(task_id):
            task.status = TaskStatus.PAUSED
            task.updated_at = datetime.utcnow()
            db.commit()
            
            return {"message": f"Task {task_id} paused successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to pause task")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error pausing task {task_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to pause task: {str(e)}")


@router.post("/tasks/{task_id}/resume")
async def resume_scheduled_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Resume a paused task"""
    try:
        task = db.query(ScheduledTask).filter(
            ScheduledTask.id == task_id,
            ScheduledTask.created_by == current_user.id
        ).first()
        
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        if task.status != TaskStatus.PAUSED:
            raise HTTPException(status_code=400, detail="Only paused tasks can be resumed")
        
        # Resume in scheduler
        if task_scheduler.resume_task(task_id):
            task.status = TaskStatus.PENDING
            task.updated_at = datetime.utcnow()
            db.commit()
            
            return {"message": f"Task {task_id} resumed successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to resume task")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resuming task {task_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to resume task: {str(e)}")


@router.post("/tasks/{task_id}/execute")
async def execute_task_now(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Execute a task immediately (manual trigger)"""
    try:
        task = db.query(ScheduledTask).filter(
            ScheduledTask.id == task_id,
            ScheduledTask.created_by == current_user.id
        ).first()
        
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        if task.status == TaskStatus.RUNNING:
            raise HTTPException(status_code=400, detail="Task is already running")
        
        # Execute immediately
        import asyncio
        asyncio.create_task(task_scheduler._execute_task(task_id))
        
        return {"message": f"Task {task_id} execution started"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error executing task {task_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to execute task: {str(e)}")


@router.get("/tasks/{task_id}/executions", response_model=List[TaskExecutionResponse])
async def get_task_executions(
    task_id: int,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get execution history for a task"""
    try:
        # Verify task belongs to user
        task = db.query(ScheduledTask).filter(
            ScheduledTask.id == task_id,
            ScheduledTask.created_by == current_user.id
        ).first()
        
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Get executions
        executions = db.query(ScheduledTaskExecution).filter(
            ScheduledTaskExecution.task_id == task_id
        ).order_by(ScheduledTaskExecution.execution_time.desc()).offset(skip).limit(limit).all()
        
        result = []
        for exec in executions:
            result.append(TaskExecutionResponse(
                id=exec.id,
                task_id=exec.task_id,
                execution_time=exec.execution_time,
                completed_time=exec.completed_time,
                status=exec.status,
                deployment_id=exec.deployment_id,
                result=json.loads(exec.result) if exec.result else None,
                error_message=exec.error_message
            ))
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting executions for task {task_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get executions: {str(e)}")


@router.get("/stats")
async def get_scheduling_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get scheduling statistics for the current user"""
    try:
        total_tasks = db.query(ScheduledTask).filter(
            ScheduledTask.created_by == current_user.id
        ).count()
        
        pending_tasks = db.query(ScheduledTask).filter(
            ScheduledTask.created_by == current_user.id,
            ScheduledTask.status == TaskStatus.PENDING
        ).count()
        
        running_tasks = db.query(ScheduledTask).filter(
            ScheduledTask.created_by == current_user.id,
            ScheduledTask.status == TaskStatus.RUNNING
        ).count()
        
        completed_tasks = db.query(ScheduledTask).filter(
            ScheduledTask.created_by == current_user.id,
            ScheduledTask.status == TaskStatus.COMPLETED
        ).count()
        
        failed_tasks = db.query(ScheduledTask).filter(
            ScheduledTask.created_by == current_user.id,
            ScheduledTask.status == TaskStatus.FAILED
        ).count()
        
        # Get upcoming tasks (next 7 days)
        from datetime import timedelta
        upcoming_cutoff = datetime.utcnow() + timedelta(days=7)
        upcoming_tasks = db.query(ScheduledTask).filter(
            ScheduledTask.created_by == current_user.id,
            ScheduledTask.status == TaskStatus.PENDING,
            ScheduledTask.next_execution <= upcoming_cutoff
        ).order_by(ScheduledTask.next_execution).limit(5).all()
        
        upcoming_list = []
        for task in upcoming_tasks:
            upcoming_list.append({
                "id": task.id,
                "task_name": task.task_name,
                "task_type": task.task_type,
                "next_execution": task.next_execution.isoformat() if task.next_execution else None
            })
        
        return {
            "total_tasks": total_tasks,
            "pending_tasks": pending_tasks,
            "running_tasks": running_tasks,
            "completed_tasks": completed_tasks,
            "failed_tasks": failed_tasks,
            "upcoming_tasks": upcoming_list
        }
        
    except Exception as e:
        logger.error(f"Error getting scheduling stats: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")
