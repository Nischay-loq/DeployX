"""
REST API endpoints for unified logs management.
Provides a centralized view of all deployment, execution, and scheduling logs.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_, and_, func
from typing import List, Optional
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel
import json
from pathlib import Path
import pytz

from app.auth.database import get_db, User
from app.auth.utils import get_current_user
from app.Deployments.models import Deployment, DeploymentTarget
from app.files.models import FileDeployment, FileDeploymentResult, UploadedFile
from app.schedule.models import ScheduledTask, ScheduledTaskExecution
from app.grouping.models import Device

router = APIRouter(prefix="/api/logs", tags=["logs"])

# Helper function to convert UTC to IST
def convert_to_ist(utc_dt):
    """Convert UTC datetime to Indian Standard Time (IST)"""
    if utc_dt is None:
        return None
    
    # If datetime is naive (no timezone info), assume it's UTC
    if utc_dt.tzinfo is None:
        utc_dt = pytz.UTC.localize(utc_dt)
    
    # Convert to IST
    ist = pytz.timezone('Asia/Kolkata')
    ist_dt = utc_dt.astimezone(ist)
    
    # Return as naive datetime (remove timezone info for consistency)
    return ist_dt.replace(tzinfo=None)


class LogEntry(BaseModel):
    """Unified log entry schema"""
    id: str  # Combination of type and ID
    log_type: str  # 'software_deployment', 'file_deployment', 'command_execution', 'scheduled_task'
    title: str
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    initiated_by: Optional[str] = None
    target_type: Optional[str] = None  # 'device', 'group', 'batch'
    target_count: int
    success_count: int
    failure_count: int
    details: dict
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }


class LogsResponse(BaseModel):
    """Response containing logs and pagination info"""
    logs: List[LogEntry]
    total: int
    page: int
    page_size: int
    total_pages: int


class LogStats(BaseModel):
    """Statistics for logs dashboard"""
    total_deployments: int
    total_executions: int
    total_scheduled: int
    success_rate: float
    last_24h_count: int
    by_type: dict
    by_status: dict


@router.get("/", response_model=LogsResponse)
async def get_all_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    log_type: Optional[str] = Query(None, description="Filter by: software_deployment, file_deployment, command_execution, scheduled_task"),
    status: Optional[str] = Query(None, description="Filter by status: pending, running, completed, failed, etc."),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    search: Optional[str] = Query(None, description="Search in deployment/task names"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get unified logs from all sources with filtering and pagination.
    Combines software deployments, file deployments, command executions, and scheduled tasks.
    """
    
    all_logs = []
    
    # Fetch Software Deployments
    if not log_type or log_type == 'software_deployment':
        software_query = db.query(Deployment)
        
        if status:
            software_query = software_query.filter(Deployment.status == status)
        if date_from:
            software_query = software_query.filter(Deployment.started_at >= date_from)
        if date_to:
            software_query = software_query.filter(Deployment.started_at <= date_to)
        if search:
            software_query = software_query.filter(Deployment.deployment_name.ilike(f"%{search}%"))
        
        software_deployments = software_query.order_by(desc(Deployment.started_at)).all()
        
        # Batch load targets and users for all deployments
        deployment_ids = [d.id for d in software_deployments]
        targets_dict = {}
        users_dict = {}
        
        if deployment_ids:
            targets = db.query(DeploymentTarget).filter(
                DeploymentTarget.deployment_id.in_(deployment_ids)
            ).all()
            for target in targets:
                if target.deployment_id not in targets_dict:
                    targets_dict[target.deployment_id] = []
                targets_dict[target.deployment_id].append(target)
            
            # Batch load users
            user_ids = [d.initiated_by for d in software_deployments if d.initiated_by]
            if user_ids:
                users = db.query(User).filter(User.id.in_(user_ids)).all()
                users_dict = {u.id: u.username for u in users}
        
        print(f"Found {len(software_deployments)} software deployments")
        
        for deployment in software_deployments:
            deployment_targets = targets_dict.get(deployment.id, [])
            success_count = sum(1 for t in deployment_targets if t.status == 'completed')
            failure_count = sum(1 for t in deployment_targets if t.status == 'failed')
            
            # Get username
            username = users_dict.get(deployment.initiated_by, "Unknown User") if deployment.initiated_by else "System"
            
            # Convert dates to IST
            created_at_ist = convert_to_ist(deployment.started_at) if deployment.started_at else datetime.utcnow()
            completed_at_ist = convert_to_ist(deployment.ended_at)
            
            all_logs.append(LogEntry(
                id=f"software_{deployment.id}",
                log_type="software_deployment",
                title=deployment.deployment_name or f"Software Deployment #{deployment.id}",
                status=deployment.status,
                created_at=created_at_ist,
                completed_at=completed_at_ist,
                initiated_by=username,
                target_type="device",
                target_count=len(deployment_targets),
                success_count=success_count,
                failure_count=failure_count,
                details={
                    "software": [],
                    "custom_software": deployment.custom_software,
                    "rollback_performed": deployment.rollback_performed
                }
            ))
    
    # Fetch File Deployments
    if not log_type or log_type == 'file_deployment':
        file_query = db.query(FileDeployment)
        
        if status:
            file_query = file_query.filter(FileDeployment.status == status)
        if date_from:
            file_query = file_query.filter(FileDeployment.created_at >= date_from)
        if date_to:
            file_query = file_query.filter(FileDeployment.created_at <= date_to)
        if search:
            file_query = file_query.filter(FileDeployment.deployment_name.ilike(f"%{search}%"))
        
        file_deployments = file_query.order_by(desc(FileDeployment.created_at)).all()
        
        # Batch load results and users
        deployment_ids = [d.id for d in file_deployments]
        results_dict = {}
        users_dict = {}
        
        if deployment_ids:
            results = db.query(FileDeploymentResult).filter(
                FileDeploymentResult.deployment_id.in_(deployment_ids)
            ).all()
            for result in results:
                if result.deployment_id not in results_dict:
                    results_dict[result.deployment_id] = []
                results_dict[result.deployment_id].append(result)
            
            # Batch load users
            user_ids = [d.created_by for d in file_deployments if d.created_by]
            if user_ids:
                users = db.query(User).filter(User.id.in_(user_ids)).all()
                users_dict = {u.id: u.username for u in users}
        
        print(f"Found {len(file_deployments)} file deployments")
        
        for deployment in file_deployments:
            deployment_results = results_dict.get(deployment.id, [])
            success_count = sum(1 for r in deployment_results if r.status == 'success')
            failure_count = sum(1 for r in deployment_results if r.status == 'failed')
            
            # Get username
            username = users_dict.get(deployment.created_by, "Unknown User") if deployment.created_by else "System"
            
            # Determine target type
            target_type = "mixed"
            device_ids = json.loads(deployment.device_ids) if deployment.device_ids else []
            group_ids = json.loads(deployment.group_ids) if deployment.group_ids else []
            
            if group_ids and not device_ids:
                target_type = "group"
            elif device_ids and not group_ids:
                target_type = "device"
            
            # Convert dates to IST
            created_at_ist = convert_to_ist(deployment.created_at)
            completed_at_ist = convert_to_ist(deployment.completed_at)
            
            all_logs.append(LogEntry(
                id=f"file_{deployment.id}",
                log_type="file_deployment",
                title=deployment.deployment_name or f"File Deployment #{deployment.id}",
                status=deployment.status,
                created_at=created_at_ist,
                completed_at=completed_at_ist,
                initiated_by=username,
                target_type=target_type,
                target_count=len(deployment_results),
                success_count=success_count,
                failure_count=failure_count,
                details={
                    "files": [],
                    "target_path": deployment.target_path,
                    "device_count": len(device_ids),
                    "group_count": len(group_ids)
                }
            ))
    
    # Fetch Scheduled Tasks Executions
    if not log_type or log_type == 'scheduled_task':
        # Build a more efficient query - directly query executions with joins
        executions_query = db.query(ScheduledTaskExecution, ScheduledTask).join(
            ScheduledTask, ScheduledTaskExecution.task_id == ScheduledTask.id
        )
        
        if status:
            executions_query = executions_query.filter(ScheduledTaskExecution.status == status)
        if date_from:
            executions_query = executions_query.filter(ScheduledTaskExecution.execution_time >= date_from)
        if date_to:
            executions_query = executions_query.filter(ScheduledTaskExecution.execution_time <= date_to)
        if search:
            executions_query = executions_query.filter(ScheduledTask.task_name.ilike(f"%{search}%"))
        
        executions_with_tasks = executions_query.order_by(desc(ScheduledTaskExecution.execution_time)).all()
        
        print(f"Found {len(executions_with_tasks)} scheduled task executions")
        
        # Batch load users for tasks
        task_ids = [task.id for _, task in executions_with_tasks]
        users_dict = {}
        if task_ids:
            tasks_with_users = db.query(ScheduledTask).filter(ScheduledTask.id.in_(task_ids)).all()
            user_ids = [t.created_by for t in tasks_with_users if t.created_by]
            if user_ids:
                users = db.query(User).filter(User.id.in_(user_ids)).all()
                users_dict = {u.id: u.username for u in users}
        
        for execution, task in executions_with_tasks:
            username = users_dict.get(task.created_by, "Unknown User") if task.created_by else "Scheduler"
            
            # Convert dates to IST
            created_at_ist = convert_to_ist(execution.execution_time)
            completed_at_ist = convert_to_ist(execution.completed_time)
            
            all_logs.append(LogEntry(
                id=f"scheduled_{execution.id}",
                log_type="scheduled_task",
                title=f"{task.task_name} (Scheduled Execution)",
                status=execution.status,
                created_at=created_at_ist,
                completed_at=completed_at_ist,
                initiated_by=username,
                target_type="scheduled",
                target_count=1,
                success_count=1 if execution.status == 'completed' else 0,
                failure_count=1 if execution.status == 'failed' else 0,
                details={
                    "task_type": task.task_type,
                    "deployment_id": execution.deployment_id,
                    "error": execution.error_message,
                    "result": execution.result or {}
                }
            ))
    
    # Fetch Command Executions from queue file
    if not log_type or log_type == 'command_execution':
        try:
            queue_file = Path("data/command_queue.json")
            if queue_file.exists():
                with open(queue_file, 'r') as f:
                    queue_data = json.load(f)
                    commands = queue_data.get('commands', [])
                    
                    print(f"Found {len(commands)} command executions in queue")
                    
                    # Apply filters first before device lookup
                    filtered_commands = []
                    for cmd in commands:
                        # Parse timestamps
                        created_at = datetime.fromisoformat(cmd['timestamp']) if cmd.get('timestamp') else datetime.utcnow()
                        
                        # Apply filters
                        if status and cmd.get('status') != status:
                            continue
                        if date_from and created_at < date_from:
                            continue
                        if date_to and created_at > date_to:
                            continue
                        if search and search.lower() not in cmd.get('command', '').lower():
                            continue
                        
                        filtered_commands.append(cmd)
                    
                    # Batch load devices for all filtered commands
                    agent_ids = [cmd.get('agent_id') for cmd in filtered_commands if cmd.get('agent_id')]
                    devices_dict = {}
                    if agent_ids:
                        devices = db.query(Device).filter(Device.agent_id.in_(agent_ids)).all()
                        devices_dict = {d.agent_id: d.device_name for d in devices}
                    
                    for cmd in filtered_commands:
                        created_at = datetime.fromisoformat(cmd['timestamp']) if cmd.get('timestamp') else datetime.utcnow()
                        completed_at = datetime.fromisoformat(cmd['completed_at']) if cmd.get('completed_at') else None
                        
                        # NOTE: Command timestamps are already in IST format, no conversion needed
                        # Database deployments are in UTC, so they need conversion
                        # Keep command times as-is
                        created_at_ist = created_at
                        completed_at_ist = completed_at
                        
                        # Determine success/failure
                        cmd_status = cmd.get('status', 'pending')
                        success_count = 1 if cmd_status == 'completed' else 0
                        failure_count = 1 if cmd_status == 'failed' else 0
                        
                        # Get device name from batch loaded data
                        agent_id = cmd.get('agent_id')
                        device_name = devices_dict.get(agent_id, agent_id) if agent_id else "Unknown"
                        
                        # Try to get username from config if available (for scheduled commands)
                        initiated_by = "User"
                        if cmd.get('config', {}).get('group_name', '').startswith('Scheduled:'):
                            initiated_by = "Scheduler"
                        
                        all_logs.append(LogEntry(
                            id=f"command_{cmd['id']}",
                            log_type="command_execution",
                            title=f"Command: {cmd['command'][:50]}{'...' if len(cmd['command']) > 50 else ''}",
                            status=cmd_status,
                            created_at=created_at_ist,
                            completed_at=completed_at_ist,
                            initiated_by=initiated_by,
                            target_type="device",
                            target_count=1,
                            success_count=success_count,
                            failure_count=failure_count,
                            details={
                                "command": cmd.get('command'),
                                "agent_id": agent_id,
                                "device_name": device_name,
                                "shell": cmd.get('shell'),
                                "strategy": cmd.get('strategy'),
                                "output": cmd.get('output', '')[:500] if cmd.get('output') else '',
                                "error": cmd.get('error')
                            }
                        ))
            else:
                print("Command queue file not found")
        except Exception as e:
            print(f"Error loading command executions: {e}")
    
    # Sort all logs by created_at (most recent first)
    # Handle None values by putting them at the end
    print(f"Total logs before sort: {len(all_logs)}")
    
    # Debug: Show some dates before sorting
    if all_logs:
        print("Sample dates before sort (first 5):")
        for i, log in enumerate(all_logs[:5]):
            print(f"  {log.log_type}: {log.created_at}")
    
    all_logs.sort(key=lambda x: x.created_at if x.created_at else datetime(1970, 1, 1), reverse=True)
    
    # Debug: Print log type breakdown
    log_type_counts = {}
    for log in all_logs:
        log_type_counts[log.log_type] = log_type_counts.get(log.log_type, 0) + 1
    print(f"Log type breakdown: {log_type_counts}")
    
    # Debug: Print first 5 logs after sorting
    if all_logs:
        print("First 5 logs after sort (most recent first):")
        for i, log in enumerate(all_logs[:5]):
            print(f"  {i+1}. {log.log_type}: {log.title[:50]} | {log.created_at}")
    
    # Pagination
    total = len(all_logs)
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    paginated_logs = all_logs[start_idx:end_idx]
    
    total_pages = (total + page_size - 1) // page_size
    
    print(f"Returning {len(paginated_logs)} logs out of {total} total logs (page {page}/{total_pages})")
    
    return LogsResponse(
        logs=paginated_logs,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/stats", response_model=LogStats)
async def get_log_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get statistics about all logs"""
    
    # Count software deployments (all deployments, not just user's)
    software_count = db.query(Deployment).count()
    
    # Count file deployments (all deployments, not just user's)
    file_count = db.query(FileDeployment).count()
    
    # Count scheduled task executions (all executions)
    scheduled_count = db.query(ScheduledTaskExecution).count()
    
    # Count command executions from queue file
    command_count = 0
    last_24h_commands = 0
    try:
        queue_file = Path("data/command_queue.json")
        if queue_file.exists():
            with open(queue_file, 'r') as f:
                queue_data = json.load(f)
                commands = queue_data.get('commands', [])
                command_count = len(commands)
                
                # Count last 24h commands
                yesterday = datetime.utcnow() - timedelta(days=1)
                last_24h_commands = sum(
                    1 for cmd in commands 
                    if cmd.get('timestamp') and datetime.fromisoformat(cmd['timestamp']) >= yesterday
                )
    except Exception as e:
        print(f"Error counting commands: {e}")
    
    # Count last 24h
    yesterday = datetime.utcnow() - timedelta(days=1)
    last_24h_software = db.query(Deployment).filter(
        Deployment.started_at >= yesterday
    ).count()
    last_24h_files = db.query(FileDeployment).filter(
        FileDeployment.created_at >= yesterday
    ).count()
    last_24h_scheduled = db.query(ScheduledTaskExecution).filter(
        ScheduledTaskExecution.execution_time >= yesterday
    ).count()
    
    print(f"Stats: software={software_count}, files={file_count}, scheduled={scheduled_count}, commands={command_count}")
    
    # Calculate success rate
    total_deployments = software_count + file_count + command_count
    if total_deployments > 0:
        successful_software = db.query(Deployment).filter(
            Deployment.status == 'completed'
        ).count()
        successful_files = db.query(FileDeployment).filter(
            FileDeployment.status == 'completed'
        ).count()
        
        # Count successful command executions
        successful_commands = 0
        try:
            queue_file = Path("data/command_queue.json")
            if queue_file.exists():
                with open(queue_file, 'r') as f:
                    queue_data = json.load(f)
                    commands = queue_data.get('commands', [])
                    successful_commands = sum(1 for cmd in commands if cmd.get('status') == 'completed')
        except Exception as e:
            print(f"Error counting successful commands: {e}")
        
        success_rate = ((successful_software + successful_files + successful_commands) / total_deployments) * 100
    else:
        success_rate = 0.0
    
    # By status counts
    status_counts = {}
    for status_val in ['pending', 'running', 'completed', 'failed', 'cancelled']:
        software_status = db.query(Deployment).filter(
            Deployment.status == status_val
        ).count()
        file_status = db.query(FileDeployment).filter(
            FileDeployment.status == status_val
        ).count()
        
        # Count command executions by status
        command_status = 0
        try:
            queue_file = Path("data/command_queue.json")
            if queue_file.exists():
                with open(queue_file, 'r') as f:
                    queue_data = json.load(f)
                    commands = queue_data.get('commands', [])
                    command_status = sum(1 for cmd in commands if cmd.get('status') == status_val)
        except Exception as e:
            print(f"Error counting command status: {e}")
        
        status_counts[status_val] = software_status + file_status + command_status
    
    return LogStats(
        total_deployments=software_count,
        total_executions=file_count,
        total_scheduled=scheduled_count,
        success_rate=round(success_rate, 2),
        last_24h_count=last_24h_software + last_24h_files + last_24h_scheduled + last_24h_commands,
        by_type={
            "software_deployment": software_count,
            "file_deployment": file_count,
            "scheduled_task": scheduled_count,
            "command_execution": command_count
        },
        by_status=status_counts
    )


@router.get("/{log_id}/details")
async def get_log_details(
    log_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific log entry"""
    
    log_type, entity_id = log_id.split('_', 1)
    
    # For command executions, entity_id is a UUID string, not an integer
    if log_type != 'command':
        entity_id = int(entity_id)
    
    if log_type == 'software':
        deployment = db.query(Deployment).filter(Deployment.id == entity_id).first()
        if not deployment:
            raise HTTPException(status_code=404, detail="Deployment not found")
        
        targets = db.query(DeploymentTarget).filter(
            DeploymentTarget.deployment_id == deployment.id
        ).all()
        
        target_details = []
        for target in targets:
            device = db.query(Device).filter(Device.id == target.device_id).first()
            target_details.append({
                "device_id": target.device_id,
                "device_name": device.device_name if device else "Unknown",
                "status": target.status,
                "progress": target.progress_percent,
                "error": target.error_message,
                "started_at": target.started_at.isoformat() if target.started_at else None,
                "completed_at": target.completed_at.isoformat() if target.completed_at else None
            })
        
        return {
            "id": deployment.id,
            "type": "software_deployment",
            "name": deployment.deployment_name,
            "status": deployment.status,
            "started_at": deployment.started_at.isoformat() if deployment.started_at else None,
            "ended_at": deployment.ended_at.isoformat() if deployment.ended_at else None,
            "rollback_performed": deployment.rollback_performed,
            "targets": target_details
        }
    
    elif log_type == 'file':
        deployment = db.query(FileDeployment).filter(FileDeployment.id == entity_id).first()
        if not deployment:
            raise HTTPException(status_code=404, detail="File deployment not found")
        
        results = db.query(FileDeploymentResult).filter(
            FileDeploymentResult.deployment_id == deployment.id
        ).all()
        
        result_details = []
        for result in results:
            device = db.query(Device).filter(Device.id == result.device_id).first()
            file_obj = db.query(UploadedFile).filter(UploadedFile.id == result.file_id).first()
            
            result_details.append({
                "device_id": result.device_id,
                "device_name": device.device_name if device else "Unknown",
                "file_name": file_obj.original_filename if file_obj else "Unknown",
                "status": result.status,
                "message": result.message,
                "path_created": result.path_created,
                "deployed_at": result.deployed_at.isoformat() if result.deployed_at else None,
                "error": result.error_details
            })
        
        return {
            "id": deployment.id,
            "type": "file_deployment",
            "name": deployment.deployment_name,
            "status": deployment.status,
            "target_path": deployment.target_path,
            "created_at": deployment.created_at.isoformat(),
            "completed_at": deployment.completed_at.isoformat() if deployment.completed_at else None,
            "results": result_details
        }
    
    elif log_type == 'scheduled':
        execution = db.query(ScheduledTaskExecution).filter(ScheduledTaskExecution.id == entity_id).first()
        if not execution:
            raise HTTPException(status_code=404, detail="Execution not found")
        
        task = db.query(ScheduledTask).filter(ScheduledTask.id == execution.task_id).first()
        
        return {
            "id": execution.id,
            "type": "scheduled_task",
            "task_name": task.task_name if task else "Unknown",
            "task_type": task.task_type if task else "unknown",
            "status": execution.status,
            "execution_time": execution.execution_time.isoformat(),
            "completed_time": execution.completed_time.isoformat() if execution.completed_time else None,
            "deployment_id": execution.deployment_id,
            "result": execution.result,
            "error": execution.error_message
        }
    
    elif log_type == 'command':
        # Load command execution from queue file
        try:
            queue_file = Path("data/command_queue.json")
            if not queue_file.exists():
                raise HTTPException(status_code=404, detail="Command queue file not found")
            
            with open(queue_file, 'r') as f:
                queue_data = json.load(f)
                commands = queue_data.get('commands', [])
                
                # Find command by ID (entity_id is the UUID string)
                command = next((cmd for cmd in commands if cmd.get('id') == entity_id), None)
                
                if not command:
                    raise HTTPException(status_code=404, detail="Command execution not found")
                
                # Get device information
                agent_id = command.get('agent_id')
                device = None
                if agent_id:
                    device = db.query(Device).filter(Device.agent_id == agent_id).first()
                
                return {
                    "id": command['id'],
                    "type": "command_execution",
                    "command": command.get('command'),
                    "status": command.get('status'),
                    "shell": command.get('shell'),
                    "strategy": command.get('strategy'),
                    "agent_id": agent_id,
                    "device_name": device.device_name if device else agent_id,
                    "timestamp": command.get('timestamp'),
                    "started_at": command.get('started_at'),
                    "completed_at": command.get('completed_at'),
                    "output": command.get('output'),
                    "error": command.get('error'),
                    "config": command.get('config', {})
                }
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error loading command details: {e}")
            raise HTTPException(status_code=500, detail=f"Error loading command details: {str(e)}")
    
    else:
        raise HTTPException(status_code=400, detail="Invalid log type")
