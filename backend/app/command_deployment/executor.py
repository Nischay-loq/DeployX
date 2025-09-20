"""
Command executor for handling command execution via socket.io with agents.
"""
import asyncio
import logging
from typing import Optional, Dict
from .queue import command_queue, CommandStatus
import uuid

logger = logging.getLogger(__name__)

class CommandExecutor:
    """Handles execution of commands through socket.io communication with agents."""
    
    def __init__(self):
        self.sio = None  # Will be set by the main app
        self.conn_manager = None  # Will be set by the main app
        self.pending_commands: Dict[str, str] = {}  # Maps command execution ID to command queue ID
        self.command_timeouts: Dict[str, asyncio.Task] = {}  # Track timeout tasks
        self.execution_locks: Dict[str, asyncio.Lock] = {}  # Prevent race conditions
    
    def set_socketio(self, sio, conn_manager):
        """Set the socket.io instance and connection manager."""
        self.sio = sio
        self.conn_manager = conn_manager
    
    async def execute_command(self, cmd_id: str, timeout: int = 300) -> bool:
        """Execute a command by sending it to the appropriate agent with timeout."""
        # Prevent race conditions with locks
        if cmd_id not in self.execution_locks:
            self.execution_locks[cmd_id] = asyncio.Lock()
        
        async with self.execution_locks[cmd_id]:
            try:
                cmd = command_queue.get_command(cmd_id)
                if not cmd:
                    logger.error(f"Command {cmd_id} not found")
                    return False
                
                # Check if command is already being executed or completed
                if cmd.status not in [CommandStatus.PENDING]:
                    logger.warning(f"Command {cmd_id} is not in pending status: {cmd.status}")
                    return cmd.status == CommandStatus.COMPLETED
                
                # Check if agent is connected
                if not self.conn_manager:
                    logger.error("Connection manager not initialized")
                    command_queue.update_command_status(
                        cmd_id, 
                        CommandStatus.FAILED, 
                        error="Connection manager not available"
                    )
                    return False
                
                agent_sid = self.conn_manager.get_agent_sid(cmd.agent_id)
                if not agent_sid:
                    logger.error(f"Agent {cmd.agent_id} not connected")
                    command_queue.update_command_status(
                        cmd_id, 
                        CommandStatus.FAILED, 
                        error=f"Agent {cmd.agent_id} not connected"
                    )
                    return False
                
                logger.info(f"Executing deployment command {cmd_id}: {cmd.command}")
                
                # Update status to running BEFORE sending command
                if not command_queue.update_command_status(cmd_id, CommandStatus.RUNNING):
                    logger.error(f"Failed to update command {cmd_id} status to running")
                    return False
                
                # Set up timeout handling
                timeout_task = asyncio.create_task(self._handle_command_timeout(cmd_id, timeout))
                self.command_timeouts[cmd_id] = timeout_task
                
                # Use the new deployment command system for better tracking
                await self.sio.emit('execute_deployment_command', {
                    'command_id': cmd_id,
                    'command': cmd.command,
                    'shell': cmd.shell
                }, room=agent_sid)
                
                logger.info(f"Sent deployment command {cmd_id} to agent {cmd.agent_id}")
                return True
                
            except Exception as e:
                logger.error(f"Error executing command {cmd_id}: {e}")
                command_queue.update_command_status(
                    cmd_id, 
                    CommandStatus.FAILED, 
                    error=str(e)
                )
                return False
            finally:
                # Clean up locks after a delay to prevent immediate re-execution
                asyncio.create_task(self._cleanup_lock(cmd_id, delay=1.0))
    
    async def _handle_command_timeout(self, cmd_id: str, timeout_seconds: int):
        """Handle command timeout."""
        try:
            await asyncio.sleep(timeout_seconds)
            
            # Check if command is still running
            cmd = command_queue.get_command(cmd_id)
            if cmd and cmd.status == CommandStatus.RUNNING:
                logger.warning(f"Command {cmd_id} timed out after {timeout_seconds} seconds")
                await self.handle_command_completion(
                    cmd_id, 
                    success=False, 
                    error=f"Command timed out after {timeout_seconds} seconds"
                )
        except asyncio.CancelledError:
            # Timeout was cancelled (command completed normally)
            pass
        except Exception as e:
            logger.error(f"Error in timeout handler for command {cmd_id}: {e}")
    
    async def _cleanup_lock(self, cmd_id: str, delay: float = 0.0):
        """Clean up execution lock after delay."""
        if delay > 0:
            await asyncio.sleep(delay)
        
        if cmd_id in self.execution_locks:
            del self.execution_locks[cmd_id]
    
    async def handle_command_output(self, cmd_id: str, output: str):
        """Handle output from command execution."""
        try:
            command_queue.update_command_status(cmd_id, CommandStatus.RUNNING, output=output)
            logger.debug(f"Updated output for command {cmd_id}")
        except Exception as e:
            logger.error(f"Error handling command output for {cmd_id}: {e}")
    
    async def handle_command_completion(self, cmd_id: str, success: bool, final_output: str = "", error: str = ""):
        """Handle command completion notification from agent."""
        try:
            # Cancel timeout if it exists
            if cmd_id in self.command_timeouts:
                timeout_task = self.command_timeouts[cmd_id]
                if not timeout_task.done():
                    timeout_task.cancel()
                del self.command_timeouts[cmd_id]
            
            status = CommandStatus.COMPLETED if success else CommandStatus.FAILED
            command_queue.update_command_status(
                cmd_id, 
                status, 
                output=final_output,
                error=error if not success else None
            )
            
            # Remove from active executions
            command_queue.remove_active_execution(cmd_id)
            
            logger.info(f"Command {cmd_id} completed with status: {status}")
        except Exception as e:
            logger.error(f"Error handling command completion for {cmd_id}: {e}")

# Global command executor instance
command_executor = CommandExecutor()