"""
Command queue management for tracking command execution status.
"""
import json
import uuid
import asyncio
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from pathlib import Path
from pydantic import BaseModel
from enum import Enum

logger = logging.getLogger(__name__)

class CommandStatus(str, Enum):
    """Enumeration of possible command execution statuses."""
    PENDING = "pending"
    RUNNING = "running" 
    COMPLETED = "completed"
    FAILED = "failed"
    PAUSED = "paused"

class CommandItem(BaseModel):
    """Model for a command queue item."""
    id: str
    command: str
    status: CommandStatus
    output: str = ""
    strategy: str = "transactional"
    timestamp: str
    agent_id: Optional[str] = None
    shell: Optional[str] = None
    error: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    config: Dict[str, Any] = {}

class CommandQueue:
    """Manager for command queue operations with JSON persistence."""
    
    def __init__(self, data_dir: str = "data"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(exist_ok=True)
        self.queue_file = self.data_dir / "command_queue.json"
        self._commands: Dict[str, CommandItem] = {}
        self._active_executions: Dict[str, asyncio.Task] = {}
        self._load_from_file()

    def _load_from_file(self) -> None:
        """Load command queue from JSON file."""
        try:
            if self.queue_file.exists():
                with open(self.queue_file, 'r') as f:
                    data = json.load(f)
                    for cmd_data in data.get('commands', []):
                        cmd = CommandItem(**cmd_data)
                        # Fix inconsistent status - if completed_at exists but status is not completed/failed
                        if cmd.completed_at and cmd.status not in [CommandStatus.COMPLETED, CommandStatus.FAILED]:
                            logger.warning(f"Fixing inconsistent status for command {cmd.id}: {cmd.status} -> completed")
                            cmd.status = CommandStatus.COMPLETED
                        # Fix missing started_at for running/completed commands
                        elif cmd.status in [CommandStatus.RUNNING, CommandStatus.COMPLETED, CommandStatus.FAILED] and not cmd.started_at:
                            cmd.started_at = cmd.timestamp
                        self._commands[cmd.id] = cmd
                logger.info(f"Loaded {len(self._commands)} commands from queue file")
                # Save the cleaned data back to file
                if any(cmd.completed_at and cmd.status not in [CommandStatus.COMPLETED, CommandStatus.FAILED] 
                       for cmd in self._commands.values()):
                    self._save_to_file()
                    logger.info("Saved cleaned command queue data")
            else:
                logger.info("No existing command queue file found, starting fresh")
        except Exception as e:
            logger.error(f"Error loading command queue: {e}")
            self._commands = {}

    def _save_to_file(self) -> None:
        """Save command queue to JSON file."""
        try:
            data = {
                'commands': [cmd.dict() for cmd in self._commands.values()],
                'last_updated': datetime.now().isoformat()
            }
            with open(self.queue_file, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving command queue: {e}")

    def add_command(self, 
                   command: str, 
                   agent_id: str,
                   shell: str = "cmd",
                   strategy: str = "transactional",
                   config: Dict[str, Any] = None) -> str:
        """Add a new command to the queue."""
        cmd_id = str(uuid.uuid4())
        
        # Ensure config includes the original command for rollback purposes
        if config is None:
            config = {}
        config['original_command'] = command
        
        cmd = CommandItem(
            id=cmd_id,
            command=command,
            status=CommandStatus.PENDING,
            strategy=strategy,
            timestamp=datetime.now().isoformat(),
            agent_id=agent_id,
            shell=shell,
            config=config
        )
        
        self._commands[cmd_id] = cmd
        self._save_to_file()
        logger.info(f"Added command {cmd_id} to queue: {command[:50]}...")
        return cmd_id

    def get_command(self, cmd_id: str) -> Optional[CommandItem]:
        """Get a command by ID."""
        return self._commands.get(cmd_id)

    def get_all_commands(self) -> List[CommandItem]:
        """Get all commands in the queue."""
        return list(self._commands.values())

    def get_commands_by_status(self, status: CommandStatus) -> List[CommandItem]:
        """Get commands by status."""
        return [cmd for cmd in self._commands.values() if cmd.status == status]

    def update_command_status(self, cmd_id: str, status: CommandStatus, 
                            output: str = None, error: str = None) -> bool:
        """Update command status and optionally output/error."""
        if cmd_id not in self._commands:
            logger.error(f"Command {cmd_id} not found")
            return False

        cmd = self._commands[cmd_id]
        old_status = cmd.status
        cmd.status = status
        
        if output is not None:
            cmd.output += output
        
        if error is not None:
            cmd.error = error

        # Update timestamps
        now = datetime.now().isoformat()
        if status == CommandStatus.RUNNING and old_status == CommandStatus.PENDING:
            cmd.started_at = now
        elif status in [CommandStatus.COMPLETED, CommandStatus.FAILED]:
            cmd.completed_at = now
            # Remove from active executions when completed
            self.remove_active_execution(cmd_id)

        self._save_to_file()
        logger.info(f"Updated command {cmd_id} status: {old_status} -> {status}")
        return True

    def validate_and_fix_statuses(self) -> int:
        """Validate and fix inconsistent command statuses. Returns number of fixes made."""
        fixes = 0
        for cmd_id, cmd in self._commands.items():
            # Fix commands that have completion time but wrong status
            if cmd.completed_at and cmd.status not in [CommandStatus.COMPLETED, CommandStatus.FAILED]:
                logger.warning(f"Fixing inconsistent status for command {cmd_id}: {cmd.status} -> completed")
                cmd.status = CommandStatus.COMPLETED
                fixes += 1
            # Fix commands missing started_at timestamp
            elif cmd.status in [CommandStatus.RUNNING, CommandStatus.COMPLETED, CommandStatus.FAILED] and not cmd.started_at:
                cmd.started_at = cmd.timestamp
                fixes += 1
            # Fix commands that are running but have completion time
            elif cmd.status == CommandStatus.RUNNING and cmd.completed_at:
                cmd.status = CommandStatus.COMPLETED
                fixes += 1
        
        if fixes > 0:
            self._save_to_file()
            logger.info(f"Fixed {fixes} inconsistent command statuses")
        
        return fixes

    def pause_command(self, cmd_id: str) -> bool:
        """Pause a running command."""
        if cmd_id not in self._commands:
            return False
        
        cmd = self._commands[cmd_id]
        if cmd.status == CommandStatus.RUNNING:
            cmd.status = CommandStatus.PAUSED
            # Cancel the running task
            if cmd_id in self._active_executions:
                self._active_executions[cmd_id].cancel()
                del self._active_executions[cmd_id]
            
            self._save_to_file()
            logger.info(f"Paused command {cmd_id}")
            return True
        return False

    def resume_command(self, cmd_id: str) -> bool:
        """Resume a paused command."""
        if cmd_id not in self._commands:
            return False
        
        cmd = self._commands[cmd_id]
        if cmd.status == CommandStatus.PAUSED:
            cmd.status = CommandStatus.PENDING
            self._save_to_file()
            logger.info(f"Resumed command {cmd_id}")
            return True
        return False

    def delete_command(self, cmd_id: str) -> bool:
        """Delete a command from the queue."""
        if cmd_id in self._commands:
            # Cancel if running
            if cmd_id in self._active_executions:
                self._active_executions[cmd_id].cancel()
                del self._active_executions[cmd_id]
            
            del self._commands[cmd_id]
            self._save_to_file()
            logger.info(f"Deleted command {cmd_id}")
            return True
        return False

    def clear_completed(self) -> int:
        """Clear all completed and failed commands."""
        to_remove = [
            cmd_id for cmd_id, cmd in self._commands.items() 
            if cmd.status in [CommandStatus.COMPLETED, CommandStatus.FAILED]
        ]
        
        for cmd_id in to_remove:
            del self._commands[cmd_id]
        
        if to_remove:
            self._save_to_file()
        
        logger.info(f"Cleared {len(to_remove)} completed/failed commands")
        return len(to_remove)

    def get_queue_stats(self) -> Dict[str, int]:
        """Get statistics about the command queue."""
        stats = {}
        for status in CommandStatus:
            stats[status.value] = len(self.get_commands_by_status(status))
        stats['total'] = len(self._commands)
        return stats

    def set_active_execution(self, cmd_id: str, task: asyncio.Task) -> None:
        """Track an active command execution task."""
        self._active_executions[cmd_id] = task

    def remove_active_execution(self, cmd_id: str) -> None:
        """Remove tracking of an active command execution."""
        if cmd_id in self._active_executions:
            del self._active_executions[cmd_id]

# Global command queue instance
command_queue = CommandQueue()