"""
REST API endpoints for command deployment management.
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import asyncio
import logging
import uuid
from datetime import datetime

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
    strategy: str = "batch"
    config: Dict[str, Any] = {}
    stop_on_failure: bool = True

class SequentialBatchRequest(BaseModel):
    commands: List[str]
    agent_id: str
    shell: str = "cmd"
    stop_on_failure: bool = True
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

class BatchStatusResponse(BaseModel):
    batch_id: str
    overall_status: str
    progress: str
    total_commands: int
    successful_commands: int
    failed_commands: int
    current_command_index: int
    started_at: Optional[str]
    completed_at: Optional[str]
    commands: List[Dict]
    execution_log: List[str]

class QueueStatsResponse(BaseModel):
    stats: Dict[str, int]
    active_commands: int

@router.get("/strategies", response_model=List[str])
async def get_deployment_strategies():
    """Get available deployment strategies."""
    return deployment_strategy.get_available_strategies()

@router.get("/strategies/recommend")
async def recommend_strategy(command: str, current_strategy: str = "transactional"):
    """Recommend the best deployment strategy for a given command."""
    try:
        if not command:
            raise HTTPException(status_code=400, detail="Command is required")
        
        recommended = deployment_strategy.choose_strategy_for_command(command)
        
        return {
            "command": command,
            "recommended_strategy": recommended,
            "current_strategy": current_strategy,
            "warning": None,
            "reason": f"Recommended '{recommended}' strategy for this type of operation"
        }
    except Exception as e:
        logger.error(f"Error recommending strategy: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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
        valid_strategies = ['transactional', 'blue_green', 'canary']
        if request.strategy and request.strategy not in valid_strategies:
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
    """Add multiple commands to the execution queue (parallel execution)."""
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
        
        # Start execution for all commands in background (parallel)
        for cmd_id in cmd_ids:
            background_tasks.add_task(execute_command_async, cmd_id)
        
        return responses
    
    except Exception as e:
        logger.error(f"Error adding command batch: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/commands/batch/sequential", response_model=BatchStatusResponse)
async def add_sequential_batch(request: SequentialBatchRequest, background_tasks: BackgroundTasks):
    """Add multiple commands for sequential execution with enhanced status tracking."""
    try:
        # Validate request
        if not request.commands or len(request.commands) == 0:
            raise HTTPException(status_code=400, detail="Commands list cannot be empty")
        
        if len(request.commands) > 50:  # Reasonable limit
            raise HTTPException(status_code=400, detail="Too many commands in batch (max 50)")
        
        # Validate agent
        if not request.agent_id or not request.agent_id.strip():
            raise HTTPException(status_code=400, detail="Agent ID cannot be empty")
        
        # Get batch strategy
        batch_strategy = deployment_strategy.get_batch_strategy()
        
        # Start sequential execution in background
        background_tasks.add_task(
            execute_sequential_batch_async, 
            batch_strategy,
            request.commands,
            request.agent_id.strip(),
            request.shell,
            request.stop_on_failure,
            request.config or {}
        )
        
        # Return initial status (will be updated as execution progresses)
        return BatchStatusResponse(
            batch_id="pending",  # Will be updated when batch starts
            overall_status="initializing",
            progress="⏳ Initializing batch execution...",
            total_commands=len(request.commands),
            successful_commands=0,
            failed_commands=0,
            current_command_index=0,
            started_at=None,
            completed_at=None,
            commands=[{
                "command": cmd,
                "cmd_id": "",
                "status": "⏳ pending",
                "output": "",
                "error": "",
                "started_at": None,
                "completed_at": None,
                "execution_time": 0
            } for cmd in request.commands],
            execution_log=["Batch execution queued for processing"]
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding sequential batch: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/batches", response_model=Dict[str, BatchStatusResponse])
async def get_all_batch_statuses():
    """Get status of all active batch executions."""
    try:
        batch_strategy = deployment_strategy.get_batch_strategy()
        active_batches = batch_strategy.get_all_active_batches()
        
        return {
            batch_id: BatchStatusResponse(**batch_data)
            for batch_id, batch_data in active_batches.items()
        }
    except Exception as e:
        logger.error(f"Error getting batch statuses: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/batches/{batch_id}", response_model=BatchStatusResponse)
async def get_batch_status(batch_id: str):
    """Get status of a specific batch execution."""
    try:
        batch_strategy = deployment_strategy.get_batch_strategy()
        batch_status = batch_strategy.get_batch_status(batch_id)
        
        if not batch_status:
            raise HTTPException(status_code=404, detail="Batch not found")
        
        return BatchStatusResponse(**batch_status)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting batch status for {batch_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/batches/{batch_id}")
async def cleanup_batch(batch_id: str):
    """Clean up a completed batch from active tracking."""
    try:
        batch_strategy = deployment_strategy.get_batch_strategy()
        success = batch_strategy.cleanup_completed_batch(batch_id)
        
        if not success:
            raise HTTPException(status_code=400, detail="Cannot cleanup batch (not found or still active)")
        
        return {"message": f"Batch {batch_id} cleaned up successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cleaning up batch {batch_id}: {e}")
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

@router.get("/blue-green/status")
async def get_blue_green_status():
    """Get blue-green deployment status."""
    try:
        bg_strategy = deployment_strategy.strategies.get("blue_green")
        if not bg_strategy:
            raise HTTPException(status_code=500, detail="Blue-green strategy not available")
        
        status = bg_strategy.get_deployment_status()
        return status
    
    except Exception as e:
        logger.error(f"Error getting blue-green status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/blue-green/{deployment_id}/complete")
async def complete_gradual_blue_green(deployment_id: str):
    """Complete a gradual blue-green deployment."""
    try:
        bg_strategy = deployment_strategy.strategies.get("blue_green")
        if not bg_strategy:
            raise HTTPException(status_code=500, detail="Blue-green strategy not available")
        
        # This would need to be implemented with proper deployment tracking
        config = {"deployment_id": deployment_id}
        result = bg_strategy.complete_gradual_deployment(config)
        
        return {"message": result}
    
    except Exception as e:
        logger.error(f"Error completing blue-green deployment {deployment_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/canary/{canary_id}/status")
async def get_canary_status(canary_id: str):
    """Get status of a specific canary deployment."""
    try:
        canary_strategy = deployment_strategy.strategies.get("canary")
        if not canary_strategy:
            raise HTTPException(status_code=500, detail="Canary strategy not available")
        
        status = canary_strategy.get_canary_status(canary_id)
        return status
    
    except Exception as e:
        logger.error(f"Error getting canary status for {canary_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/canary/status")
async def get_all_canary_status():
    """Get status of all canary deployments."""
    try:
        canary_strategy = deployment_strategy.strategies.get("canary")
        if not canary_strategy:
            raise HTTPException(status_code=500, detail="Canary strategy not available")
        
        status = canary_strategy.get_canary_status()
        return status
    
    except Exception as e:
        logger.error(f"Error getting canary status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/canary/{canary_id}/promote")
async def promote_canary(canary_id: str):
    """Promote a canary deployment to next percentage."""
    try:
        canary_strategy = deployment_strategy.strategies.get("canary")
        if not canary_strategy:
            raise HTTPException(status_code=500, detail="Canary strategy not available")
        
        result = canary_strategy.promote_canary(canary_id)
        return {"message": result}
    
    except Exception as e:
        logger.error(f"Error promoting canary {canary_id}: {e}")
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

@router.post("/commands/{cmd_id}/rollback", response_model=CommandResponse)
async def rollback_command(cmd_id: str, background_tasks: BackgroundTasks):
    """Rollback a completed command by executing an inverse operation."""
    try:
        # Get the original command
        original_cmd = command_queue.get_command(cmd_id)
        if not original_cmd:
            raise HTTPException(status_code=404, detail="Command not found")
        
        # Only allow rollback of completed commands
        if original_cmd.status != CommandStatus.COMPLETED:
            raise HTTPException(status_code=400, detail="Can only rollback completed commands")
        
        # Generate rollback command
        rollback_cmd_text = generate_rollback_command(original_cmd.command, original_cmd.shell)
        if not rollback_cmd_text:
            raise HTTPException(status_code=400, detail="Cannot generate rollback for this command type")
        
        # Create new command for rollback
        rollback_cmd_id = command_queue.add_command(
            command=rollback_cmd_text,
            agent_id=original_cmd.agent_id,
            shell=original_cmd.shell,
            strategy=original_cmd.strategy,
            config={
                "is_rollback": True,
                "original_command_id": cmd_id,
                "original_command": original_cmd.command
            }
        )
        
        # Execute rollback command in background
        background_tasks.add_task(execute_command_async, rollback_cmd_id)
        
        cmd = command_queue.get_command(rollback_cmd_id)
        return CommandResponse(**cmd.dict())
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rolling back command {cmd_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def generate_rollback_command(command: str, shell: str = "cmd") -> Optional[str]:
    """Generate a rollback command based on the original command."""
    cmd = command.strip().lower()
    original = command.strip()
    
    # File/Directory operations (Windows)
    if shell in ['cmd', 'powershell', 'pwsh']:
        # Copy file
        if cmd.startswith('copy '):
            parts = original.split()
            if len(parts) >= 3:
                dest = parts[-1].strip('"').strip("'")
                return f'del /f /q "{dest}"'
        
        # Move file
        if cmd.startswith('move '):
            parts = original.split()
            if len(parts) >= 3:
                src = parts[1].strip('"').strip("'")
                dest = parts[-1].strip('"').strip("'")
                return f'move /y "{dest}" "{src}"'
        
        # Rename
        if cmd.startswith('ren ') or cmd.startswith('rename '):
            parts = original.split()
            if len(parts) >= 3:
                old_name = parts[1].strip('"').strip("'")
                new_name = parts[-1].strip('"').strip("'")
                return f'ren "{new_name}" "{old_name}"'
        
        # Create directory
        if cmd.startswith('mkdir ') or cmd.startswith('md '):
            parts = original.split()
            if len(parts) >= 2:
                dir_name = ' '.join(parts[1:]).strip('"').strip("'")
                return f'rmdir /s /q "{dir_name}"'
        
        # Echo to file (redirect)
        if cmd.startswith('echo ') and '>' in cmd:
            import re
            # Match: echo content > file or echo content >> file
            match = re.search(r'>\s*([^\s]+)', original)
            if match:
                file_path = match.group(1).strip('"').strip("'")
                return f'del /f /q "{file_path}"'
        
        # Type file content to new file
        if cmd.startswith('type ') and '>' in cmd:
            import re
            match = re.search(r'>\s*([^\s]+)', original)
            if match:
                file_path = match.group(1).strip('"').strip("'")
                return f'del /f /q "{file_path}"'
        
        # XCOPY (advanced copy)
        if cmd.startswith('xcopy '):
            parts = original.split()
            if len(parts) >= 3:
                # Find destination (last non-flag argument)
                dest = None
                for i in range(len(parts) - 1, 0, -1):
                    if not parts[i].startswith('/'):
                        dest = parts[i].strip('"').strip("'")
                        break
                if dest:
                    return f'rmdir /s /q "{dest}" 2>nul || del /f /q "{dest}"'
        
        # ROBOCOPY
        if cmd.startswith('robocopy '):
            parts = original.split()
            if len(parts) >= 3:
                dest = parts[2].strip('"').strip("'")
                return f'rmdir /s /q "{dest}"'
        
        # Delete file (cannot rollback without backup)
        if cmd.startswith('del ') or cmd.startswith('erase '):
            return None  # Cannot rollback file deletion
        
        # Remove directory (cannot rollback without backup)
        if cmd.startswith('rmdir ') or cmd.startswith('rd '):
            return None  # Cannot rollback directory deletion
        
        # PowerShell specific
        if 'new-item' in cmd:
            import re
            # Check if it's a directory
            if '-itemtype' in cmd and ('directory' in cmd or 'dir' in cmd):
                match = re.search(r'-path\s+["\']?([^"\';\s]+)["\']?', original, re.IGNORECASE)
                if match:
                    path = match.group(1)
                    return f'Remove-Item -Path "{path}" -Force -Recurse -ErrorAction SilentlyContinue'
            # Check if it's a file
            elif '-itemtype' in cmd and 'file' in cmd:
                match = re.search(r'-path\s+["\']?([^"\';\s]+)["\']?', original, re.IGNORECASE)
                if match:
                    path = match.group(1)
                    return f'Remove-Item -Path "{path}" -Force -ErrorAction SilentlyContinue'
            # Default New-Item creates file
            else:
                match = re.search(r'-path\s+["\']?([^"\';\s]+)["\']?', original, re.IGNORECASE)
                if not match:
                    match = re.search(r'new-item\s+["\']?([^"\';\s]+)["\']?', original, re.IGNORECASE)
                if match:
                    path = match.group(1)
                    return f'Remove-Item -Path "{path}" -Force -ErrorAction SilentlyContinue'
        
        if 'copy-item' in cmd:
            import re
            match = re.search(r'-destination\s+["\']?([^"\';\s]+)["\']?', original, re.IGNORECASE)
            if match:
                dest = match.group(1)
                return f'Remove-Item -Path "{dest}" -Force -Recurse -ErrorAction SilentlyContinue'
        
        if 'move-item' in cmd:
            import re
            src_match = re.search(r'-path\s+["\']?([^"\';\s]+)["\']?', original, re.IGNORECASE)
            dest_match = re.search(r'-destination\s+["\']?([^"\';\s]+)["\']?', original, re.IGNORECASE)
            if src_match and dest_match:
                src = src_match.group(1)
                dest = dest_match.group(1)
                return f'Move-Item -Path "{dest}" -Destination "{src}" -Force'
        
        # Out-File / Set-Content (create file)
        if 'out-file' in cmd or 'set-content' in cmd:
            import re
            match = re.search(r'-path\s+["\']?([^"\';\s]+)["\']?', original, re.IGNORECASE)
            if not match:
                match = re.search(r'>\s*["\']?([^"\';\s]+)["\']?', original)
            if match:
                path = match.group(1)
                return f'Remove-Item -Path "{path}" -Force -ErrorAction SilentlyContinue'
        
        # Add-Content (append to file) - can't rollback without knowing what was added
        if 'add-content' in cmd:
            return None
        
        # Remove-Item (delete) - can't rollback
        if 'remove-item' in cmd:
            return None
    
    # File/Directory operations (Linux/Unix)
    elif shell in ['bash', 'sh']:
        # Copy file
        if cmd.startswith('cp '):
            import re
            # Handle flags like -r, -a, etc.
            parts = original.split()
            if len(parts) >= 3:
                dest = parts[-1].strip('"').strip("'")
                # If copying directory (with -r flag), use rm -rf
                if '-r' in cmd or '-a' in cmd:
                    return f'rm -rf "{dest}"'
                else:
                    return f'rm -f "{dest}"'
        
        # Move file
        if cmd.startswith('mv '):
            parts = original.split()
            if len(parts) >= 3:
                src = parts[-2].strip('"').strip("'")
                dest = parts[-1].strip('"').strip("'")
                return f'mv "{dest}" "{src}"'
        
        # Create directory
        if cmd.startswith('mkdir '):
            import re
            parts = original.split()
            # Handle mkdir -p flag
            dirs = []
            for part in parts[1:]:
                if not part.startswith('-'):
                    dirs.append(part.strip('"').strip("'"))
            if dirs:
                # Remove all created directories
                dir_name = dirs[-1] if len(dirs) == 1 else ' '.join(dirs)
                return f'rm -rf {dir_name}'
        
        # Create file
        if cmd.startswith('touch '):
            parts = original.split()
            if len(parts) >= 2:
                file_name = parts[-1].strip('"').strip("'")
                return f'rm -f "{file_name}"'
        
        # Echo to file
        if cmd.startswith('echo ') and '>' in cmd:
            import re
            match = re.search(r'>\s*([^\s]+)', original)
            if match:
                file_path = match.group(1).strip('"').strip("'")
                return f'rm -f "{file_path}"'
        
        # Cat to file
        if cmd.startswith('cat ') and '>' in cmd:
            import re
            match = re.search(r'>\s*([^\s]+)', original)
            if match:
                file_path = match.group(1).strip('"').strip("'")
                return f'rm -f "{file_path}"'
        
        # Tee command (write to file)
        if 'tee' in cmd:
            import re
            # Extract filename after tee
            match = re.search(r'tee\s+([^\s|]+)', original)
            if match:
                file_path = match.group(1).strip('"').strip("'")
                return f'rm -f "{file_path}"'
        
        # Remove file or directory (cannot rollback)
        if cmd.startswith('rm '):
            return None  # Cannot rollback file/directory deletion
        
        # Remove directory (cannot rollback)
        if cmd.startswith('rmdir '):
            return None  # Cannot rollback directory deletion
    
    # Service operations (Windows)
    if shell in ['cmd', 'powershell', 'pwsh']:
        if 'start-service' in cmd or 'net start' in cmd or 'sc start' in cmd:
            import re
            match = re.search(r'start-service\s+["\']?-?name\s+["\']?([^"\';\s]+)["\']?', original, re.IGNORECASE)
            if not match:
                match = re.search(r'start-service\s+["\']?([^"\';\s]+)["\']?', original, re.IGNORECASE)
            if match:
                service = match.group(1)
                return f'Stop-Service -Name "{service}" -Force -ErrorAction SilentlyContinue'
            
            match = re.search(r'net start\s+["\']?([^"\']+)["\']?', original, re.IGNORECASE)
            if match:
                service = match.group(1).strip()
                return f'net stop "{service}"'
            
            match = re.search(r'sc start\s+([^\s]+)', original, re.IGNORECASE)
            if match:
                service = match.group(1)
                return f'sc stop {service}'
        
        if 'stop-service' in cmd or 'net stop' in cmd or 'sc stop' in cmd:
            import re
            match = re.search(r'stop-service\s+["\']?-?name\s+["\']?([^"\';\s]+)["\']?', original, re.IGNORECASE)
            if not match:
                match = re.search(r'stop-service\s+["\']?([^"\';\s]+)["\']?', original, re.IGNORECASE)
            if match:
                service = match.group(1)
                return f'Start-Service -Name "{service}" -ErrorAction SilentlyContinue'
            
            match = re.search(r'net stop\s+["\']?([^"\']+)["\']?', original, re.IGNORECASE)
            if match:
                service = match.group(1).strip()
                return f'net start "{service}"'
            
            match = re.search(r'sc stop\s+([^\s]+)', original, re.IGNORECASE)
            if match:
                service = match.group(1)
                return f'sc start {service}'
        
        # Restart service - rollback would be another restart (not very useful)
        if 'restart-service' in cmd:
            import re
            match = re.search(r'restart-service\s+["\']?-?name\s+["\']?([^"\';\s]+)["\']?', original, re.IGNORECASE)
            if not match:
                match = re.search(r'restart-service\s+["\']?([^"\';\s]+)["\']?', original, re.IGNORECASE)
            if match:
                service = match.group(1)
                return f'Restart-Service -Name "{service}" -Force -ErrorAction SilentlyContinue'
    
    # Service operations (Linux)
    elif shell in ['bash', 'sh']:
        if 'systemctl start' in cmd or ('service' in cmd and 'start' in cmd):
            import re
            match = re.search(r'systemctl start\s+([^\s;|&]+)', original)
            if match:
                service = match.group(1)
                return f'systemctl stop {service}'
            match = re.search(r'service\s+([^\s]+)\s+start', original)
            if match:
                service = match.group(1)
                return f'service {service} stop'
        
        if 'systemctl stop' in cmd or ('service' in cmd and 'stop' in cmd):
            import re
            match = re.search(r'systemctl stop\s+([^\s;|&]+)', original)
            if match:
                service = match.group(1)
                return f'systemctl start {service}'
            match = re.search(r'service\s+([^\s]+)\s+stop', original)
            if match:
                service = match.group(1)
                return f'service {service} start'
        
        if 'systemctl restart' in cmd or ('service' in cmd and 'restart' in cmd):
            import re
            match = re.search(r'systemctl restart\s+([^\s;|&]+)', original)
            if match:
                service = match.group(1)
                return f'systemctl restart {service}'
            match = re.search(r'service\s+([^\s]+)\s+restart', original)
            if match:
                service = match.group(1)
                return f'service {service} restart'
        
        # Enable/Disable service
        if 'systemctl enable' in cmd:
            import re
            match = re.search(r'systemctl enable\s+([^\s;|&]+)', original)
            if match:
                service = match.group(1)
                return f'systemctl disable {service}'
        
        if 'systemctl disable' in cmd:
            import re
            match = re.search(r'systemctl disable\s+([^\s;|&]+)', original)
            if match:
                service = match.group(1)
                return f'systemctl enable {service}'
                return f'service {service} start'
    
    return None  # Cannot generate rollback for this command

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

async def execute_sequential_batch_async(batch_strategy, commands: List[str], agent_id: str, 
                                       shell: str, stop_on_failure: bool, config: Dict[str, Any]):
    """Execute a batch of commands sequentially with status updates."""
    try:
        logger.info(f"Starting sequential batch execution for agent {agent_id} with {len(commands)} commands")
        
        # Define callback for real-time status updates (could be extended for WebSocket notifications)
        async def status_callback(batch_result):
            logger.info(f"Batch {batch_result.batch_id} progress: {batch_result.get_progress_summary()}")
            # Here you could emit WebSocket events for real-time UI updates
            # await emit_batch_status_update(batch_result)
        
        # Execute the batch
        result = await batch_strategy.execute_batch_sequential(
            commands=commands,
            agent_id=agent_id,
            shell=shell,
            stop_on_failure=stop_on_failure,
            callback=status_callback
        )
        
        logger.info(f"Sequential batch {result.batch_id} completed with status: {result.overall_status}")
        
    except Exception as e:
        logger.error(f"Error in sequential batch execution: {e}")
        # Here you could update the batch status to show the error