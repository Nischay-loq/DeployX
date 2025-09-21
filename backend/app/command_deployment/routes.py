"""
REST API endpoints for command deployment management.
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import asyncio
import logging

from .queue import command_queue, CommandStatus, CommandItem
from .strategies import HybridDeploymentStrategy

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/deployment", tags=["deployment"])

# Initialize deployment strategy
deployment_strategy = HybridDeploymentStrategy()

# Request/Response models
class CommandRequest(BaseModel):
    command: str
    agent_id: str
    shell: str = "cmd"
    strategy: str = "transactional"
    config: Dict[str, Any] = {}

class CommandBatchRequest(BaseModel):
    commands: List[str]
    agent_id: str
    shell: str = "cmd"
    strategy: str = "transactional"
    config: Dict[str, Any] = {}

class CommandResponse(BaseModel):
    id: str
    command: str
    status: str
    output: str
    strategy: str
    timestamp: str
    agent_id: Optional[str]
    shell: Optional[str]
    error: Optional[str]
    started_at: Optional[str]
    completed_at: Optional[str]

class QueueStatsResponse(BaseModel):
    stats: Dict[str, int]
    active_commands: int

@router.get("/strategies", response_model=List[str])
async def get_deployment_strategies():
    """Get available deployment strategies."""
    return deployment_strategy.get_available_strategies()

@router.post("/commands", response_model=CommandResponse)
async def add_command(request: CommandRequest, background_tasks: BackgroundTasks):
    """Add a single command to the execution queue."""
    try:
        # Validate request data
        if not request.command or not request.command.strip():
            raise HTTPException(status_code=400, detail="Command cannot be empty")
        
        if not request.agent_id or not request.agent_id.strip():
            raise HTTPException(status_code=400, detail="Agent ID cannot be empty")
        
        # Validate shell type
        valid_shells = ['cmd', 'powershell', 'pwsh', 'bash', 'sh']
        if request.shell not in valid_shells:
            logger.warning(f"Unknown shell type: {request.shell}, using 'cmd' as fallback")
            request.shell = 'cmd'
        
        # Validate strategy
        valid_strategies = ['transactional', 'blue_green', 'snapshot', 'canary']
        if request.strategy not in valid_strategies:
            logger.warning(f"Unknown strategy: {request.strategy}, using 'transactional' as fallback")
            request.strategy = 'transactional'
        
        # Sanitize command (basic security check)
        if len(request.command) > 1000:
            raise HTTPException(status_code=400, detail="Command too long (max 1000 characters)")
        
        cmd_id = command_queue.add_command(
            command=request.command.strip(),
            agent_id=request.agent_id.strip(),
            shell=request.shell,
            strategy=request.strategy,
            config=request.config or {}
        )
        
        # Start execution in background
        background_tasks.add_task(execute_command_async, cmd_id)
        
        cmd = command_queue.get_command(cmd_id)
        if not cmd:
            raise HTTPException(status_code=500, detail="Failed to create command")
        
        return CommandResponse(**cmd.dict())
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding command: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/commands/batch", response_model=List[CommandResponse])
async def add_command_batch(request: CommandBatchRequest, background_tasks: BackgroundTasks):
    """Add multiple commands to the execution queue."""
    try:
        cmd_ids = []
        responses = []
        
        for command in request.commands:
            cmd_id = command_queue.add_command(
                command=command,
                agent_id=request.agent_id,
                shell=request.shell,
                strategy=request.strategy,
                config=request.config
            )
            cmd_ids.append(cmd_id)
            
            cmd = command_queue.get_command(cmd_id)
            responses.append(CommandResponse(**cmd.dict()))
        
        # Start execution for all commands in background
        for cmd_id in cmd_ids:
            background_tasks.add_task(execute_command_async, cmd_id)
        
        return responses
    
    except Exception as e:
        logger.error(f"Error adding command batch: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/commands", response_model=List[CommandResponse])
async def get_all_commands():
    """Get all commands in the queue."""
    try:
        commands = command_queue.get_all_commands()
        return [CommandResponse(**cmd.dict()) for cmd in commands]
    except Exception as e:
        logger.error(f"Error getting commands: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/commands/{cmd_id}", response_model=CommandResponse)
async def get_command(cmd_id: str):
    """Get a specific command by ID."""
    try:
        cmd = command_queue.get_command(cmd_id)
        if not cmd:
            raise HTTPException(status_code=404, detail="Command not found")
        return CommandResponse(**cmd.dict())
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting command {cmd_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/commands/status/{status}", response_model=List[CommandResponse])
async def get_commands_by_status(status: CommandStatus):
    """Get commands by status."""
    try:
        commands = command_queue.get_commands_by_status(status)
        return [CommandResponse(**cmd.dict()) for cmd in commands]
    except Exception as e:
        logger.error(f"Error getting commands by status {status}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/commands/{cmd_id}/pause")
async def pause_command(cmd_id: str):
    """Pause a running command."""
    try:
        success = command_queue.pause_command(cmd_id)
        if not success:
            raise HTTPException(status_code=400, detail="Cannot pause command")
        return {"message": f"Command {cmd_id} paused"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error pausing command {cmd_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/commands/{cmd_id}/resume")
async def resume_command(cmd_id: str, background_tasks: BackgroundTasks):
    """Resume a paused command."""
    try:
        success = command_queue.resume_command(cmd_id)
        if not success:
            raise HTTPException(status_code=400, detail="Cannot resume command")
        
        # Restart execution in background
        background_tasks.add_task(execute_command_async, cmd_id)
        
        return {"message": f"Command {cmd_id} resumed"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resuming command {cmd_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/commands/{cmd_id}/rollback")
async def rollback_command(cmd_id: str, background_tasks: BackgroundTasks):
    """Rollback a completed command using its deployment strategy."""
    try:
        cmd = command_queue.get_command(cmd_id)
        if not cmd:
            raise HTTPException(status_code=404, detail="Command not found")
        
        if cmd.status != CommandStatus.COMPLETED:
            raise HTTPException(status_code=400, detail="Can only rollback completed commands")
        
        # Execute rollback using the deployment strategy
        strategy = deployment_strategy.strategies.get(cmd.strategy)
        if not strategy:
            raise HTTPException(status_code=400, detail=f"Strategy {cmd.strategy} not found")
        
        rollback_command_text = strategy.rollback(cmd.config)
        
        # Check if we got a real command or just a message
        if rollback_command_text.startswith('#'):
            # It's just a message, not an executable command
            return {
                "message": f"Rollback information for command {cmd_id}",
                "rollback_info": rollback_command_text,
                "executable": False
            }
        else:
            # It's an executable command, add it to the queue and execute it
            rollback_cmd_id = command_queue.add_command(
                command=rollback_command_text,
                agent_id=cmd.agent_id,
                shell=cmd.shell,
                strategy=cmd.strategy,
                config={
                    "is_rollback": True,
                    "original_command_id": cmd_id,
                    "original_command": cmd.command
                }
            )
            
            # Execute the rollback command in background
            background_tasks.add_task(execute_command_async, rollback_cmd_id)
            
            return {
                "message": f"Rollback command created and queued for execution",
                "original_command_id": cmd_id,
                "rollback_command_id": rollback_cmd_id,
                "rollback_command": rollback_command_text,
                "executable": True
            }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rolling back command {cmd_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/commands/{cmd_id}")
async def delete_command(cmd_id: str):
    """Delete a command from the queue."""
    try:
        success = command_queue.delete_command(cmd_id)
        if not success:
            raise HTTPException(status_code=404, detail="Command not found")
        return {"message": f"Command {cmd_id} deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting command {cmd_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/commands/completed")
async def clear_completed_commands():
    """Clear all completed and failed commands."""
    try:
        cleared_count = command_queue.clear_completed()
        return {"message": f"Cleared {cleared_count} completed commands"}
    except Exception as e:
        logger.error(f"Error clearing completed commands: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats", response_model=QueueStatsResponse)
async def get_queue_stats():
    """Get command queue statistics."""
    try:
        stats = command_queue.get_queue_stats()
        active_commands = stats.get('running', 0)
        return QueueStatsResponse(stats=stats, active_commands=active_commands)
    except Exception as e:
        logger.error(f"Error getting queue stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/validate")
async def validate_and_fix_queue():
    """Validate and fix any inconsistencies in the command queue."""
    try:
        fixes = command_queue.validate_and_fix_statuses()
        return {
            "message": f"Queue validation complete. {fixes} issues fixed.",
            "fixes_applied": fixes
        }
    except Exception as e:
        logger.error(f"Error validating queue: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def execute_command_async(cmd_id: str):
    """Execute a command asynchronously."""
    try:
        from .executor import command_executor
        await command_executor.execute_command(cmd_id)
    except Exception as e:
        logger.error(f"Error executing command {cmd_id}: {e}")
        command_queue.update_command_status(
            cmd_id, 
            CommandStatus.FAILED, 
            error=str(e)
        )