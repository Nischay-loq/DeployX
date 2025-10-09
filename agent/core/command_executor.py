"""Command executor with automatic snapshot and rollback support."""
import asyncio
import logging
import os
from typing import Optional, List, Dict, Any, Callable
from dataclasses import dataclass

from .shell_manager import ShellManager
from .snapshot_manager import SnapshotManager

logger = logging.getLogger(__name__)


@dataclass
class CommandResult:
    """Result of a command execution."""
    command: str
    snapshot_id: Optional[str]
    success: bool
    output: str
    error: Optional[str] = None
    execution_time: float = 0.0
    command_index: Optional[int] = None


@dataclass
class BatchResult:
    """Result of a batch execution."""
    batch_id: str
    total_commands: int
    successful_commands: int
    failed_commands: int
    command_results: List[CommandResult]
    snapshot_ids: List[str]
    overall_success: bool
    total_execution_time: float = 0.0


class CommandExecutor:
    """Executes commands with automatic snapshot creation and rollback support."""
    
    def __init__(
        self,
        shell_manager: ShellManager,
        snapshot_manager: SnapshotManager,
        connection=None
    ):
        """Initialize command executor.
        
        Args:
            shell_manager: Shell manager instance
            snapshot_manager: Snapshot manager instance
            connection: Connection manager for emitting events
        """
        self.shell_manager = shell_manager
        self.snapshot_manager = snapshot_manager
        self.connection = connection
        
        # Track active executions
        self.active_executions: Dict[str, bool] = {}
        
        logger.info("CommandExecutor initialized")

    async def execute_command(
        self,
        command: str,
        create_snapshot: bool = True,
        working_dir: Optional[str] = None,
        monitored_paths: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        output_callback: Optional[Callable] = None
    ) -> CommandResult:
        """Execute a single command with optional snapshot creation.
        
        Args:
            command: Command to execute
            create_snapshot: Whether to create a snapshot before execution
            working_dir: Working directory for snapshot
            monitored_paths: Specific paths to monitor in snapshot
            metadata: Additional metadata for snapshot
            output_callback: Callback for command output
        
        Returns:
            CommandResult with execution details
        """
        import time
        start_time = time.time()
        snapshot_id = None
        command_output = ""
        command_success = True
        error_msg = None
        
        try:
            # Create snapshot before command execution
            if create_snapshot:
                try:
                    if working_dir is None:
                        working_dir = os.getcwd()
                    
                    snapshot_id = await self.snapshot_manager.create_snapshot(
                        command=command,
                        working_dir=working_dir,
                        monitored_paths=monitored_paths,
                        metadata=metadata
                    )
                    logger.info(f"Created snapshot {snapshot_id} before executing: {command}")
                except Exception as e:
                    logger.error(f"Failed to create snapshot: {e}")
                    error_msg = f"Snapshot creation failed: {str(e)}"
                    # Continue with execution even if snapshot fails
            
            # Execute command
            try:
                # Setup output capture
                original_callback = self.shell_manager.output_callback
                
                async def enhanced_callback(output: str):
                    nonlocal command_output, command_success
                    command_output += output
                    
                    # Call original callback if exists
                    if original_callback:
                        await original_callback(output)
                    
                    # Call custom callback if provided
                    if output_callback:
                        await output_callback(output)
                    
                    # Check for errors in output
                    error_indicators = [
                        "Access is denied",
                        "The system cannot find",
                        "Permission denied",
                        "No such file or directory",
                        "command not found",
                        "is not recognized as an internal or external command",
                        "The filename, directory name, or volume label syntax is incorrect",
                        "Cannot remove",
                        "Failed to",
                        "Error:",
                        "FATAL:",
                        "syntax error",
                        "cannot access"
                    ]
                    
                    for indicator in error_indicators:
                        if indicator.lower() in output.lower():
                            command_success = False
                            break
                
                self.shell_manager.output_callback = enhanced_callback
                
                # Execute the command
                result = await self.shell_manager.execute_command(command + '\n')
                
                # Wait for command to complete
                await asyncio.sleep(0.5)  # Base wait time
                
                # Restore original callback
                self.shell_manager.output_callback = original_callback
                
                if not result:
                    command_success = False
                    error_msg = "Failed to execute command"
                
            except Exception as e:
                command_success = False
                error_msg = f"Command execution failed: {str(e)}"
                logger.error(error_msg)
            
            execution_time = time.time() - start_time
            
            return CommandResult(
                command=command,
                snapshot_id=snapshot_id,
                success=command_success,
                output=command_output,
                error=error_msg,
                execution_time=execution_time
            )
            
        except Exception as e:
            execution_time = time.time() - start_time
            error_msg = f"Unexpected error during command execution: {str(e)}"
            logger.exception(error_msg)
            
            return CommandResult(
                command=command,
                snapshot_id=snapshot_id,
                success=False,
                output=command_output,
                error=error_msg,
                execution_time=execution_time
            )

    async def execute_batch(
        self,
        batch_id: str,
        commands: List[str],
        stop_on_failure: bool = True,
        create_snapshots: bool = True,
        working_dir: Optional[str] = None,
        shell: Optional[str] = None,
        output_callback: Optional[Callable] = None
    ) -> BatchResult:
        """Execute a batch of commands with persistent shell context.
        
        This maintains the same shell session across all commands, so context
        (like cd commands) is preserved between commands.
        
        Args:
            batch_id: Unique identifier for this batch
            commands: List of commands to execute
            stop_on_failure: Stop execution if a command fails
            create_snapshots: Create snapshots before each command
            working_dir: Working directory
            shell: Shell to use (default: current shell)
            output_callback: Callback for batch output
        
        Returns:
            BatchResult with batch execution details
        """
        import time
        start_time = time.time()
        
        self.active_executions[batch_id] = True
        
        command_results = []
        snapshot_ids = []
        successful_commands = 0
        failed_commands = 0
        
        try:
            logger.info(f"Starting batch execution {batch_id} with {len(commands)} commands")
            
            # Ensure shell is running
            if not (self.shell_manager.running and 
                    self.shell_manager.current_process and 
                    self.shell_manager.current_process.poll() is None):
                
                if shell:
                    logger.info(f"Starting shell {shell} for batch {batch_id}")
                    # Shell start logic would need to be coordinated with socket handler
                    # For now, assume shell is already started
                else:
                    logger.warning(f"No shell active for batch {batch_id}")
            
            # Execute each command in sequence
            for i, command in enumerate(commands):
                command = command.strip()
                if not command:
                    continue
                
                # Check if batch was cancelled
                if not self.active_executions.get(batch_id, False):
                    logger.info(f"Batch {batch_id} was cancelled")
                    # Mark remaining commands as skipped
                    for j in range(i, len(commands)):
                        command_results.append(CommandResult(
                            command=commands[j].strip(),
                            snapshot_id=None,
                            success=False,
                            output='',
                            error='Batch execution cancelled',
                            command_index=j
                        ))
                    break
                
                logger.info(f"Executing command {i+1}/{len(commands)} in batch {batch_id}: {command}")
                
                # Create metadata for this command
                metadata = {
                    'batch_id': batch_id,
                    'command_index': i,
                    'total_commands': len(commands)
                }
                
                # Execute command with snapshot
                result = await self.execute_command(
                    command=command,
                    create_snapshot=create_snapshots,
                    working_dir=working_dir,
                    metadata=metadata,
                    output_callback=output_callback
                )
                
                result.command_index = i
                command_results.append(result)
                
                if result.snapshot_id:
                    snapshot_ids.append(result.snapshot_id)
                
                if result.success:
                    successful_commands += 1
                    logger.info(f"Command {i+1} completed successfully")
                else:
                    failed_commands += 1
                    logger.warning(f"Command {i+1} failed: {command}")
                    
                    if stop_on_failure:
                        logger.info(f"Stopping batch {batch_id} due to failure at command {i+1}")
                        # Mark remaining commands as skipped
                        for j in range(i + 1, len(commands)):
                            command_results.append(CommandResult(
                                command=commands[j].strip(),
                                snapshot_id=None,
                                success=False,
                                output='',
                                error='Skipped due to previous failure',
                                command_index=j
                            ))
                        break
                
                # Emit progress event if connection available
                if self.connection and self.connection.connected:
                    await self.connection.emit('batch_command_completed', {
                        'batch_id': batch_id,
                        'command_index': i,
                        'command': command,
                        'success': result.success,
                        'output': result.output,
                        'error': result.error,
                        'snapshot_id': result.snapshot_id
                    })
            
            total_execution_time = time.time() - start_time
            overall_success = failed_commands == 0
            
            logger.info(f"Batch {batch_id} completed: {successful_commands} successful, {failed_commands} failed")
            
            return BatchResult(
                batch_id=batch_id,
                total_commands=len(commands),
                successful_commands=successful_commands,
                failed_commands=failed_commands,
                command_results=command_results,
                snapshot_ids=snapshot_ids,
                overall_success=overall_success,
                total_execution_time=total_execution_time
            )
            
        except Exception as e:
            logger.exception(f"Error executing batch {batch_id}: {e}")
            total_execution_time = time.time() - start_time
            
            return BatchResult(
                batch_id=batch_id,
                total_commands=len(commands),
                successful_commands=successful_commands,
                failed_commands=failed_commands,
                command_results=command_results,
                snapshot_ids=snapshot_ids,
                overall_success=False,
                total_execution_time=total_execution_time
            )
            
        finally:
            # Clean up tracking
            if batch_id in self.active_executions:
                del self.active_executions[batch_id]

    async def rollback_command(self, snapshot_id: str) -> bool:
        """Rollback a single command using its snapshot.
        
        Args:
            snapshot_id: Snapshot ID to rollback
        
        Returns:
            True if rollback successful
        """
        try:
            logger.info(f"Rolling back command with snapshot {snapshot_id}")
            
            success = await self.snapshot_manager.rollback_snapshot(snapshot_id)
            
            if success:
                logger.info(f"Successfully rolled back snapshot {snapshot_id}")
                
                # Emit event if connection available
                if self.connection and self.connection.connected:
                    await self.connection.emit('rollback_completed', {
                        'snapshot_id': snapshot_id,
                        'success': True
                    })
            else:
                logger.error(f"Failed to rollback snapshot {snapshot_id}")
                
                if self.connection and self.connection.connected:
                    await self.connection.emit('rollback_completed', {
                        'snapshot_id': snapshot_id,
                        'success': False,
                        'error': 'Rollback failed'
                    })
            
            return success
            
        except Exception as e:
            error_msg = f"Error during rollback: {str(e)}"
            logger.exception(error_msg)
            
            if self.connection and self.connection.connected:
                await self.connection.emit('rollback_completed', {
                    'snapshot_id': snapshot_id,
                    'success': False,
                    'error': error_msg
                })
            
            return False

    async def rollback_batch(self, batch_id: str) -> bool:
        """Rollback all commands in a batch.
        
        Args:
            batch_id: Batch ID to rollback
        
        Returns:
            True if all rollbacks successful
        """
        try:
            logger.info(f"Rolling back batch {batch_id}")
            
            # Cancel any active execution of this batch
            if batch_id in self.active_executions:
                self.active_executions[batch_id] = False
                logger.info(f"Cancelled active execution of batch {batch_id}")
            
            success = await self.snapshot_manager.rollback_batch(batch_id)
            
            if success:
                logger.info(f"Successfully rolled back batch {batch_id}")
                
                if self.connection and self.connection.connected:
                    await self.connection.emit('batch_rollback_completed', {
                        'batch_id': batch_id,
                        'success': True
                    })
            else:
                logger.error(f"Failed to rollback batch {batch_id}")
                
                if self.connection and self.connection.connected:
                    await self.connection.emit('batch_rollback_completed', {
                        'batch_id': batch_id,
                        'success': False,
                        'error': 'Batch rollback failed'
                    })
            
            return success
            
        except Exception as e:
            error_msg = f"Error during batch rollback: {str(e)}"
            logger.exception(error_msg)
            
            if self.connection and self.connection.connected:
                await self.connection.emit('batch_rollback_completed', {
                    'batch_id': batch_id,
                    'success': False,
                    'error': error_msg
                })
            
            return False

    async def cancel_batch(self, batch_id: str) -> bool:
        """Cancel an active batch execution.
        
        Args:
            batch_id: Batch ID to cancel
        
        Returns:
            True if batch was active and cancelled
        """
        if batch_id in self.active_executions:
            self.active_executions[batch_id] = False
            logger.info(f"Cancelled batch {batch_id}")
            return True
        else:
            logger.warning(f"Batch {batch_id} is not active")
            return False

    def get_snapshot_info(self, snapshot_id: str) -> Optional[Dict[str, Any]]:
        """Get information about a snapshot.
        
        Args:
            snapshot_id: Snapshot ID
        
        Returns:
            Snapshot information or None
        """
        return self.snapshot_manager.get_snapshot_info(snapshot_id)

    def get_batch_snapshots(self, batch_id: str) -> Optional[Dict[str, Any]]:
        """Get information about a batch's snapshots.
        
        Args:
            batch_id: Batch ID
        
        Returns:
            Batch snapshot information or None
        """
        return self.snapshot_manager.get_batch_info(batch_id)

    async def cleanup_snapshot(self, snapshot_id: str) -> bool:
        """Manually cleanup a snapshot.
        
        Args:
            snapshot_id: Snapshot ID to cleanup
        
        Returns:
            True if cleanup successful
        """
        return await self.snapshot_manager.delete_snapshot(snapshot_id)

    async def cleanup_batch_snapshots(self, batch_id: str) -> bool:
        """Manually cleanup all snapshots for a batch.
        
        Args:
            batch_id: Batch ID
        
        Returns:
            True if cleanup successful
        """
        return await self.snapshot_manager.delete_batch_snapshots(batch_id)
