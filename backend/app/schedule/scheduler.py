"""
Scheduling service for managing and executing scheduled tasks
Uses APScheduler for background task execution
"""
import logging
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import pytz
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.date import DateTrigger
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.jobstores.memory import MemoryJobStore
from apscheduler.executors.asyncio import AsyncIOExecutor
from sqlalchemy.orm import Session

from app.schedule.models import (
    ScheduledTask, ScheduledTaskExecution, TaskType, TaskStatus, 
    RecurrenceType, CommandPayload, SoftwareDeploymentPayload, FileDeploymentPayload
)

logger = logging.getLogger(__name__)


class TaskScheduler:
    """Manages scheduled task execution"""
    
    def __init__(self):
        """Initialize the scheduler"""
        jobstores = {
            'default': MemoryJobStore()
        }
        executors = {
            'default': AsyncIOExecutor()
        }
        job_defaults = {
            'coalesce': False,  # Run all missed jobs
            'max_instances': 3,  # Maximum concurrent instances of same job
            'misfire_grace_time': 300  # 5 minutes grace period for missed jobs
        }
        
        self.scheduler = AsyncIOScheduler(
            jobstores=jobstores,
            executors=executors,
            job_defaults=job_defaults,
            timezone='UTC'
        )
        
        self.db_session = None
        self.is_started = False
        
        logger.info("Task scheduler initialized")
    
    def set_db_session(self, db_session):
        """Set the database session factory"""
        self.db_session = db_session
    
    def start(self):
        """Start the scheduler"""
        if not self.is_started:
            self.scheduler.start()
            self.is_started = True
            logger.info("Task scheduler started")
    
    def shutdown(self):
        """Shutdown the scheduler"""
        if self.is_started:
            self.scheduler.shutdown(wait=True)
            self.is_started = False
            logger.info("Task scheduler stopped")
    
    def _get_trigger(self, task: ScheduledTask):
        """Create APScheduler trigger based on task configuration"""
        if task.recurrence_type == RecurrenceType.ONCE:
            # One-time execution
            # Ensure the scheduled_time is timezone-aware (treat as UTC if naive)
            scheduled_time = task.scheduled_time
            if scheduled_time.tzinfo is None:
                scheduled_time = pytz.UTC.localize(scheduled_time)
            return DateTrigger(run_date=scheduled_time, timezone=pytz.UTC)
        
        recurrence_config = json.loads(task.recurrence_config) if task.recurrence_config else {}
        
        if task.recurrence_type == RecurrenceType.DAILY:
            # Daily at specific time
            time_str = recurrence_config.get('time', '00:00')
            hour, minute = map(int, time_str.split(':'))
            return CronTrigger(hour=hour, minute=minute, timezone=pytz.UTC)
        
        elif task.recurrence_type == RecurrenceType.WEEKLY:
            # Weekly on specific days
            days_of_week = recurrence_config.get('days_of_week', [0])  # Default Monday
            time_str = recurrence_config.get('time', '00:00')
            hour, minute = map(int, time_str.split(':'))
            # APScheduler uses mon=0, tue=1, etc.
            day_of_week = ','.join(map(str, days_of_week))
            return CronTrigger(day_of_week=day_of_week, hour=hour, minute=minute, timezone=pytz.UTC)
        
        elif task.recurrence_type == RecurrenceType.MONTHLY:
            # Monthly on specific day
            day_of_month = recurrence_config.get('day_of_month', 1)
            time_str = recurrence_config.get('time', '00:00')
            hour, minute = map(int, time_str.split(':'))
            return CronTrigger(day=day_of_month, hour=hour, minute=minute, timezone=pytz.UTC)
        
        elif task.recurrence_type == RecurrenceType.CUSTOM:
            # Custom cron expression
            cron_expression = recurrence_config.get('cron_expression')
            if cron_expression:
                # Parse cron expression (minute hour day month day_of_week)
                parts = cron_expression.split()
                return CronTrigger(
                    minute=parts[0] if len(parts) > 0 else '*',
                    hour=parts[1] if len(parts) > 1 else '*',
                    day=parts[2] if len(parts) > 2 else '*',
                    month=parts[3] if len(parts) > 3 else '*',
                    day_of_week=parts[4] if len(parts) > 4 else '*'
                )
        
        # Default to one-time
        return DateTrigger(run_date=task.scheduled_time)
    
    def schedule_task(self, db: Session, task: ScheduledTask) -> bool:
        """Schedule a task for execution"""
        try:
            trigger = self._get_trigger(task)
            
            # Add job to scheduler
            job = self.scheduler.add_job(
                func=self._execute_task,
                trigger=trigger,
                args=[task.id],
                id=f"task_{task.id}",
                name=task.task_name,
                replace_existing=True
            )
            
            # Update next execution time
            if job.next_run_time:
                task.next_execution = job.next_run_time
                db.commit()
            
            logger.info(f"Scheduled task {task.id} ({task.task_name}) - Next run: {job.next_run_time}")
            return True
            
        except Exception as e:
            logger.error(f"Error scheduling task {task.id}: {e}", exc_info=True)
            return False
    
    def reschedule_task(self, db: Session, task: ScheduledTask) -> bool:
        """Reschedule an existing task"""
        try:
            # Remove old job if exists
            self.cancel_task(task.id)
            
            # Schedule with new configuration
            return self.schedule_task(db, task)
            
        except Exception as e:
            logger.error(f"Error rescheduling task {task.id}: {e}", exc_info=True)
            return False
    
    def cancel_task(self, task_id: int) -> bool:
        """Cancel a scheduled task"""
        try:
            job_id = f"task_{task_id}"
            if self.scheduler.get_job(job_id):
                self.scheduler.remove_job(job_id)
                logger.info(f"Cancelled task {task_id}")
                return True
            return False
        except Exception as e:
            logger.error(f"Error cancelling task {task_id}: {e}")
            return False
    
    def pause_task(self, task_id: int) -> bool:
        """Pause a scheduled task"""
        try:
            job_id = f"task_{task_id}"
            if self.scheduler.get_job(job_id):
                self.scheduler.pause_job(job_id)
                logger.info(f"Paused task {task_id}")
                return True
            return False
        except Exception as e:
            logger.error(f"Error pausing task {task_id}: {e}")
            return False
    
    def resume_task(self, task_id: int) -> bool:
        """Resume a paused task"""
        try:
            job_id = f"task_{task_id}"
            if self.scheduler.get_job(job_id):
                self.scheduler.resume_job(job_id)
                logger.info(f"Resumed task {task_id}")
                return True
            return False
        except Exception as e:
            logger.error(f"Error resuming task {task_id}: {e}")
            return False
    
    def get_next_run_time(self, task_id: int) -> Optional[datetime]:
        """Get the next scheduled run time for a task"""
        try:
            job_id = f"task_{task_id}"
            job = self.scheduler.get_job(job_id)
            if job:
                return job.next_run_time
            return None
        except Exception as e:
            logger.error(f"Error getting next run time for task {task_id}: {e}")
            return None
    
    async def _execute_task(self, task_id: int):
        """Execute a scheduled task"""
        from app.auth.database import SessionLocal
        
        db = SessionLocal()
        execution = None
        
        try:
            # Get task from database
            task = db.query(ScheduledTask).filter(ScheduledTask.id == task_id).first()
            
            if not task:
                logger.error(f"Task {task_id} not found")
                return
            
            if task.status == TaskStatus.CANCELLED:
                logger.info(f"Task {task_id} is cancelled, skipping execution")
                return
            
            # Create execution record
            execution = ScheduledTaskExecution(
                task_id=task.id,
                execution_time=datetime.utcnow(),
                status=TaskStatus.RUNNING
            )
            db.add(execution)
            db.commit()
            
            # Update task status
            task.status = TaskStatus.RUNNING
            task.last_execution = datetime.utcnow()
            task.execution_count += 1
            db.commit()
            
            logger.info(f"Executing scheduled task {task_id} ({task.task_name}) - Type: {task.task_type}")
            
            # Parse payload
            payload = json.loads(task.payload)
            device_ids = json.loads(task.device_ids) if task.device_ids else []
            group_ids = json.loads(task.group_ids) if task.group_ids else []
            
            # Execute based on task type
            result = None
            deployment_id = None
            
            if task.task_type == TaskType.COMMAND:
                deployment_id = await self._execute_command_task(
                    db, task, payload, device_ids, group_ids
                )
                result = {"deployment_id": deployment_id, "type": "command"}
                
            elif task.task_type == TaskType.SOFTWARE_DEPLOYMENT:
                deployment_id = await self._execute_software_deployment_task(
                    db, task, payload, device_ids, group_ids
                )
                result = {"deployment_id": deployment_id, "type": "software"}
                
            elif task.task_type == TaskType.FILE_DEPLOYMENT:
                deployment_id = await self._execute_file_deployment_task(
                    db, task, payload, device_ids, group_ids
                )
                result = {"deployment_id": deployment_id, "type": "file"}
            
            # Update execution record
            execution.status = TaskStatus.COMPLETED
            execution.completed_time = datetime.utcnow()
            execution.deployment_id = deployment_id
            execution.result = json.dumps(result)
            
            # Update task
            task.status = TaskStatus.COMPLETED if task.recurrence_type == RecurrenceType.ONCE else TaskStatus.PENDING
            task.last_result = json.dumps(result)
            task.error_message = None
            
            # Update next execution time for recurring tasks, clear for one-time tasks
            if task.recurrence_type != RecurrenceType.ONCE:
                next_run = self.get_next_run_time(task_id)
                if next_run:
                    task.next_execution = next_run
            else:
                # Clear next_execution for completed one-time tasks
                task.next_execution = None
            
            db.commit()
            
            logger.info(f"Task {task_id} executed successfully - Deployment ID: {deployment_id}")
            
            # Emit Socket.IO notification for successful execution
            # Note: File and Software deployments have their own detailed notifications
            # Only send generic notification for command executions
            if task.task_type == TaskType.COMMAND:
                try:
                    from app.main import sio
                    if sio:
                        notification_data = {
                            'task_id': task_id,
                            'task_name': task.task_name,
                            'task_type': 'command',
                            'deployment_id': deployment_id,
                            'execution_time': execution.execution_time.isoformat() if execution.execution_time else None,
                            'status': 'completed',
                            'message': f'Scheduled command "{task.task_name}" executed successfully'
                        }
                        await sio.emit('scheduled_task_completed', notification_data, room='frontends')
                        logger.info(f"Emitted scheduled_task_completed notification for command task {task_id}")
                except Exception as emit_error:
                    logger.error(f"Failed to emit socket notification for task {task_id}: {emit_error}")
            
        except Exception as e:
            logger.error(f"Error executing task {task_id}: {e}", exc_info=True)
            
            # Update execution record with error
            if execution:
                execution.status = TaskStatus.FAILED
                execution.completed_time = datetime.utcnow()
                execution.error_message = str(e)
            
            # Update task with error
            task = db.query(ScheduledTask).filter(ScheduledTask.id == task_id).first()
            if task:
                task.status = TaskStatus.FAILED
                task.error_message = str(e)
                
                # Clear next_execution for failed one-time tasks
                if task.recurrence_type == RecurrenceType.ONCE:
                    task.next_execution = None
            
            db.commit()
            
            # Emit Socket.IO notification for failed execution
            try:
                from app.main import sio
                if sio and task:
                    notification_data = {
                        'task_id': task_id,
                        'task_name': task.task_name if task else f'Task {task_id}',
                        'task_type': task.task_type.value if task and hasattr(task.task_type, 'value') else 'unknown',
                        'status': 'failed',
                        'error_message': str(e),
                        'message': f'Scheduled task "{task.task_name if task else task_id}" failed: {str(e)}'
                    }
                    await sio.emit('scheduled_task_failed', notification_data, room='frontends')
                    logger.info(f"Emitted scheduled_task_failed notification for task {task_id}")
            except Exception as emit_error:
                logger.error(f"Failed to emit socket notification for failed task {task_id}: {emit_error}")
            
        finally:
            db.close()
    
    async def _execute_command_task(self, db: Session, task: ScheduledTask, 
                                   payload: Dict, device_ids: list, group_ids: list) -> Optional[int]:
        """Execute a command deployment task"""
        try:
            from app.grouping.command_executor import group_command_executor
            from app.grouping.models import Device, DeviceGroup, DeviceGroupMap
            
            # Get all target devices
            target_devices = []
            
            # Add devices from device_ids
            if device_ids:
                devices = db.query(Device).filter(Device.id.in_(device_ids)).all()
                for device in devices:
                    target_devices.append({
                        'id': device.id,
                        'agent_id': device.agent_id,
                        'device_name': device.device_name
                    })
            
            # Add devices from groups
            if group_ids:
                group_device_ids = db.query(DeviceGroupMap.device_id).filter(
                    DeviceGroupMap.group_id.in_(group_ids)
                ).all()
                group_device_ids = [d[0] for d in group_device_ids]
                
                if group_device_ids:
                    devices = db.query(Device).filter(Device.id.in_(group_device_ids)).all()
                    for device in devices:
                        if not any(d['id'] == device.id for d in target_devices):
                            target_devices.append({
                                'id': device.id,
                                'agent_id': device.agent_id,
                                'device_name': device.device_name
                            })
            
            if not target_devices:
                raise ValueError("No target devices found")
            
            # Execute command on all devices
            command = payload.get('command')
            shell = payload.get('shell', 'cmd')
            strategy = payload.get('strategy', 'transactional')
            
            # If it's a batch of commands
            commands = payload.get('commands')
            if commands and isinstance(commands, list):
                # Execute batch sequentially
                batch_id = await group_command_executor.execute_batch_sequential(
                    group_id=0,  # Special ID for scheduled tasks
                    group_name=f"Scheduled: {task.task_name}",
                    devices=target_devices,
                    commands=commands,
                    shell=shell,
                    stop_on_failure=payload.get('stop_on_failure', True)
                )
                logger.info(f"Started batch command execution for scheduled task {task.id}: {batch_id}")
                return batch_id
            else:
                # Execute single command
                execution_id = await group_command_executor.execute_group_command(
                    group_id=0,
                    group_name=f"Scheduled: {task.task_name}",
                    devices=target_devices,
                    command=command,
                    shell=shell,
                    strategy=strategy
                )
                logger.info(f"Started command execution for scheduled task {task.id}: {execution_id}")
                return execution_id
            
        except Exception as e:
            logger.error(f"Error executing command task: {e}", exc_info=True)
            raise
    
    async def _execute_software_deployment_task(self, db: Session, task: ScheduledTask,
                                                payload: Dict, device_ids: list, group_ids: list) -> Optional[int]:
        """Execute a software deployment task"""
        try:
            from app.Deployments.models import Deployment, DeploymentTarget, Checkpoint
            from app.Deployments.routes import execute_deployment_background
            from app.grouping.models import DeviceGroupMap
            import asyncio
            
            # Collect all target device IDs
            target_device_ids = set(device_ids)
            
            # Add devices from groups
            if group_ids:
                group_device_ids = db.query(DeviceGroupMap.device_id).filter(
                    DeviceGroupMap.group_id.in_(group_ids)
                ).all()
                target_device_ids.update([d[0] for d in group_device_ids])
            
            if not target_device_ids:
                raise ValueError("No target devices found")
            
            # Create deployment
            deployment_name = payload.get('deployment_name') or f"Scheduled: {task.task_name}"
            deployment = Deployment(
                deployment_name=deployment_name,
                initiated_by=task.created_by,
                status="in_progress",
                started_at=datetime.utcnow(),
                software_ids=json.dumps(payload.get('software_ids', [])),
                custom_software=payload.get('custom_software')
            )
            db.add(deployment)
            db.commit()
            db.refresh(deployment)
            
            # Create deployment targets
            for device_id in target_device_ids:
                target = DeploymentTarget(
                    deployment_id=deployment.id,
                    device_id=device_id
                )
                db.add(target)
            db.commit()
            
            # Add initial checkpoint
            checkpoint = Checkpoint(
                deployment_id=deployment.id,
                step="start",
                status="success",
                timestamp=datetime.utcnow()
            )
            db.add(checkpoint)
            db.commit()
            
            logger.info(f"Created deployment {deployment.id} for scheduled task {task.id}")
            
            # Execute deployment in background thread (not async)
            import threading
            deployment_thread = threading.Thread(
                target=execute_deployment_background,
                args=(
                    deployment.id,
                    payload.get('software_ids', []),
                    list(target_device_ids),
                    payload.get('custom_software')
                ),
                daemon=True
            )
            deployment_thread.start()
            
            return deployment.id
            
        except Exception as e:
            logger.error(f"Error executing software deployment task: {e}", exc_info=True)
            raise
    
    async def _execute_file_deployment_task(self, db: Session, task: ScheduledTask,
                                           payload: Dict, device_ids: list, group_ids: list) -> Optional[int]:
        """Execute a file deployment task"""
        try:
            from app.files.models import FileDeployment, UploadedFile
            from app.files.routes import process_file_deployment_async
            from app.grouping.models import Device, DeviceGroupMap
            import asyncio
            
            # Collect all target device IDs
            target_device_ids = set(device_ids)
            
            # Add devices from groups
            if group_ids:
                group_device_ids = db.query(DeviceGroupMap.device_id).filter(
                    DeviceGroupMap.group_id.in_(group_ids)
                ).all()
                target_device_ids.update([d[0] for d in group_device_ids])
            
            if not target_device_ids:
                raise ValueError("No target devices found")
            
            # Log the payload for debugging
            logger.info(f"File deployment task payload: {payload}")
            
            # Get file objects
            file_ids = payload.get('file_ids', [])
            if not file_ids:
                logger.error(f"No file_ids found in payload. Full payload: {payload}")
                raise ValueError("No file IDs specified in payload")
            
            files = db.query(UploadedFile).filter(UploadedFile.id.in_(file_ids)).all()
            
            if not files:
                raise ValueError(f"No files found in database for IDs: {file_ids}. Files may have been deleted.")
            
            if len(files) < len(file_ids):
                found_ids = [f.id for f in files]
                missing_ids = [fid for fid in file_ids if fid not in found_ids]
                logger.warning(f"Some files not found: {missing_ids}. Proceeding with {len(files)} files.")
            
            # Don't fetch devices here - they'll be fetched in the async task with a fresh session
            # to avoid DetachedInstanceError
            
            # Create file deployment
            deployment_name = payload.get('deployment_name') or f"Scheduled: {task.task_name}"
            file_deployment = FileDeployment(
                deployment_name=deployment_name,
                created_by=task.created_by,
                status="in_progress",
                started_at=datetime.utcnow(),
                file_ids=json.dumps(file_ids),
                device_ids=json.dumps(list(target_device_ids)),
                target_path=payload.get('target_path')
            )
            db.add(file_deployment)
            db.commit()
            db.refresh(file_deployment)
            
            logger.info(f"Created file deployment {file_deployment.id} for scheduled task {task.id}")
            
            # Create deployment request object
            from app.files.models import FileDeploymentRequest
            deployment_request = FileDeploymentRequest(
                file_ids=file_ids,
                device_ids=list(target_device_ids),
                group_ids=[],
                target_path=payload.get('target_path'),
                create_path_if_not_exists=payload.get('create_path_if_not_exists', True),
                deployment_name=deployment_name
            )
            
            # Execute file deployment in background
            # Pass only IDs, not ORM objects, to avoid DetachedInstanceError
            asyncio.create_task(process_file_deployment_async(
                file_deployment.id,
                file_ids,  # Pass file IDs instead of file objects
                list(target_device_ids),  # Pass device IDs instead of device objects
                deployment_request
            ))
            
            return file_deployment.id
            
        except Exception as e:
            logger.error(f"Error executing file deployment task: {e}", exc_info=True)
            raise
    
    def load_existing_tasks(self, db: Session):
        """Load and schedule all existing pending/active tasks from database"""
        try:
            tasks = db.query(ScheduledTask).filter(
                ScheduledTask.status.in_([TaskStatus.PENDING, TaskStatus.PAUSED])
            ).all()
            
            scheduled_count = 0
            for task in tasks:
                # Only schedule if not in the past
                scheduled_time = task.scheduled_time
                if scheduled_time.tzinfo is None:
                    scheduled_time = pytz.UTC.localize(scheduled_time)
                
                current_time = datetime.now(pytz.UTC)
                if scheduled_time > current_time or task.recurrence_type != RecurrenceType.ONCE:
                    if self.schedule_task(db, task):
                        scheduled_count += 1
            
            logger.info(f"Loaded and scheduled {scheduled_count} existing tasks")
            
        except Exception as e:
            logger.error(f"Error loading existing tasks: {e}", exc_info=True)


# Global scheduler instance
task_scheduler = TaskScheduler()
