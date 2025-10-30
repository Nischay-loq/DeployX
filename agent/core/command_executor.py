"""Command executor for executing commands on remote systems."""
import asyncio
import logging
import os
from typing import Optional, List, Dict, Any, Callable
from dataclasses import dataclass

from .shell_manager import ShellManager
from .backup_manager import BackupManager
from .destructive_detector import DestructiveCommandDetector

logger = logging.getLogger(__name__)


@dataclass
class CommandResult:
    """Result of a command execution."""
    command: str
    success: bool
    output: str
    error: Optional[str] = None
    execution_time: float = 0.0
    command_index: Optional[int] = None
    backup_id: Optional[str] = None  # ID of backup created for this command
    backup_path: Optional[str] = None  # Path to backup file
    is_destructive: bool = False  # Whether command was detected as destructive
    destructive_info: Optional[Dict[str, Any]] = None  # Details about destructive nature


@dataclass
class BatchResult:
    """Result of a batch execution."""
    batch_id: str
    total_commands: int
    successful_commands: int
    failed_commands: int
    command_results: List[CommandResult]
    overall_success: bool
    total_execution_time: float = 0.0


class CommandExecutor:
    """Executes commands on remote systems."""
    
    def __init__(
        self,
        shell_manager: ShellManager,
        connection=None,
        backup_manager: Optional[BackupManager] = None,
        enable_auto_backup: bool = True
    ):
        """Initialize command executor.
        
        Args:
            shell_manager: Shell manager instance
            connection: Connection manager for emitting events
            backup_manager: Optional backup manager instance
            enable_auto_backup: Whether to automatically backup for destructive commands
        """
        self.shell_manager = shell_manager
        self.connection = connection
        
        # Initialize backup manager
        if backup_manager is None:
            backup_manager = BackupManager()
        self.backup_manager = backup_manager
        
        # Initialize destructive command detector
        self.detector = DestructiveCommandDetector()
        
        # Enable/disable auto backup
        self.enable_auto_backup = enable_auto_backup
        
        # Track active executions
        self.active_executions: Dict[str, bool] = {}
        
        # Track backups by command/batch
        self.command_backups: Dict[str, List[str]] = {}  # command_id -> [backup_ids]
        self.batch_backups: Dict[str, List[str]] = {}  # batch_id -> [backup_ids]
        
        logger.info(f"CommandExecutor initialized (auto_backup: {enable_auto_backup})")

    async def execute_command(
        self,
        command: str,
        working_dir: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        output_callback: Optional[Callable] = None,
        command_id: Optional[str] = None
    ) -> CommandResult:
        """Execute a single command.
        
        Args:
            command: Command to execute
            working_dir: Working directory for execution
            metadata: Optional metadata
            output_callback: Callback for command output
            command_id: Optional unique identifier for this command
        
        Returns:
            CommandResult with execution details
        """
        import time
        import uuid
        
        start_time = time.time()
        command_output = ""
        command_success = True
        error_msg = None
        backup_id = None
        backup_path = None
        is_destructive = False
        destructive_info = None
        
        # Generate command ID if not provided
        if command_id is None:
            command_id = f"cmd_{uuid.uuid4().hex[:8]}"
        
        try:
            # Analyze command for destructive operations
            analysis = self.detector.analyze_command(command)
            is_destructive = analysis['is_destructive']
            destructive_info = analysis
            
            if is_destructive:
                logger.warning(f"Destructive command detected: {command}")
                logger.warning(f"Analysis: {analysis}")
                
                # Emit warning if connection available
                if self.connection:
                    await self.connection.emit('destructive_command_detected', {
                        'command_id': command_id,
                        'command': command,
                        'analysis': analysis
                    })
                
                # Create backup if auto-backup is enabled and backup is required
                if self.enable_auto_backup and analysis['requires_backup']:
                    paths_to_backup = self.detector.get_backup_paths(command)
                    
                    if paths_to_backup:
                        logger.info(f"Creating backups for {len(paths_to_backup)} path(s)")
                        
                        # Emit backup start
                        if self.connection:
                            await self.connection.emit('backup_started', {
                                'command_id': command_id,
                                'command': command,
                                'paths': paths_to_backup
                            })
                        
                        # Create backup for each path
                        backup_ids = []
                        for idx, path in enumerate(paths_to_backup):
                            path_backup_id = f"{command_id}_path{idx}"
                            path_backup = self.backup_manager.create_backup(
                                target_path=path,
                                backup_id=path_backup_id,
                                command=command,
                                metadata={
                                    'command_id': command_id,
                                    'analysis': analysis,
                                    'working_dir': working_dir,
                                    'path_index': idx
                                }
                            )
                            
                            if path_backup:
                                backup_ids.append(path_backup_id)
                                logger.info(f"Created backup for {path}: {path_backup}")
                            else:
                                logger.warning(f"Failed to create backup for {path}")
                        
                        # Store primary backup info
                        if backup_ids:
                            backup_id = backup_ids[0]
                            backup_info = self.backup_manager.get_backup_info(backup_id)
                            if backup_info:
                                backup_path = backup_info['backup_path']
                            
                            # Track backups for this command
                            self.command_backups[command_id] = backup_ids
                            
                            # Emit backup complete
                            if self.connection:
                                await self.connection.emit('backup_completed', {
                                    'command_id': command_id,
                                    'backup_ids': backup_ids,
                                    'backup_count': len(backup_ids)
                                })
                        else:
                            logger.warning("No backups were created")
                    else:
                        logger.info("No existing paths to backup")
            
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
                success=command_success,
                output=command_output,
                error=error_msg,
                execution_time=execution_time,
                backup_id=backup_id,
                backup_path=backup_path,
                is_destructive=is_destructive,
                destructive_info=destructive_info
            )
            
        except Exception as e:
            execution_time = time.time() - start_time
            error_msg = f"Unexpected error during command execution: {str(e)}"
            logger.exception(error_msg)
            
            return CommandResult(
                command=command,
                success=False,
                output=command_output,
                error=error_msg,
                execution_time=execution_time,
                backup_id=backup_id,
                backup_path=backup_path,
                is_destructive=is_destructive,
                destructive_info=destructive_info
            )

    async def execute_batch(
        self,
        batch_id: str,
        commands: List[str],
        stop_on_failure: bool = True,
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
        successful_commands = 0
        failed_commands = 0
        
        try:
            logger.info(f"Starting batch execution {batch_id} with {len(commands)} commands")
            
            # Initialize batch backup tracking
            batch_backup_ids = []
            
            # Ensure shell is running
            if not (self.shell_manager.running and 
                    self.shell_manager.current_process and 
                    self.shell_manager.current_process.poll() is None):
                
                if shell:
                    logger.info(f"Starting shell {shell} for batch {batch_id}")
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
                            success=False,
                            output="",
                            error="Batch execution cancelled",
                            command_index=j
                        ))
                        failed_commands += 1
                    break
                
                try:
                    logger.info(f"Executing command {i + 1}/{len(commands)} in batch {batch_id}: {command}")
                    
                    # Emit start event
                    if self.connection:
                        await self.connection.emit('batch_command_start', {
                            'batch_id': batch_id,
                            'command_index': i,
                            'total_commands': len(commands),
                            'command': command
                        })
                    
                    # Execute the command with backup support
                    command_id = f"{batch_id}_cmd{i}"
                    result = await self.execute_command(
                        command=command,
                        working_dir=working_dir,
                        output_callback=output_callback,
                        command_id=command_id
                    )
                    
                    result.command_index = i
                    command_results.append(result)
                    
                    # Track backups from this command
                    if result.backup_id:
                        # Add all backups from this command to batch tracking
                        cmd_backups = self.command_backups.get(command_id, [])
                        batch_backup_ids.extend(cmd_backups)
                    
                    if result.success:
                        successful_commands += 1
                        logger.info(f"Command {i + 1} in batch {batch_id} succeeded")
                        
                        # Emit success event
                        if self.connection:
                            await self.connection.emit('batch_command_complete', {
                                'batch_id': batch_id,
                                'command_index': i,
                                'success': True,
                                'output': result.output,
                                'is_destructive': result.is_destructive,
                                'backup_created': result.backup_id is not None
                            })
                    else:
                        failed_commands += 1
                        logger.warning(f"Command {i + 1} in batch {batch_id} failed: {result.error}")
                        
                        # Emit failure event
                        if self.connection:
                            await self.connection.emit('batch_command_complete', {
                                'batch_id': batch_id,
                                'command_index': i,
                                'success': False,
                                'error': result.error,
                                'output': result.output
                            })
                        
                        # Check if we should stop on failure
                        if stop_on_failure:
                            logger.info(f"Stopping batch {batch_id} due to command failure")
                            # Mark remaining commands as skipped
                            for j in range(i + 1, len(commands)):
                                command_results.append(CommandResult(
                                    command=commands[j].strip(),
                                    success=False,
                                    output="",
                                    error="Previous command failed, batch execution stopped",
                                    command_index=j
                                ))
                                failed_commands += 1
                            break
                    
                except Exception as e:
                    error_msg = f"Unexpected error executing command {i + 1} in batch {batch_id}: {str(e)}"
                    logger.exception(error_msg)
                    
                    result = CommandResult(
                        command=command,
                        success=False,
                        output="",
                        error=error_msg,
                        command_index=i
                    )
                    command_results.append(result)
                    failed_commands += 1
                    
                    # Emit error event
                    if self.connection:
                        await self.connection.emit('batch_command_complete', {
                            'batch_id': batch_id,
                            'command_index': i,
                            'success': False,
                            'error': error_msg
                        })
                    
                    if stop_on_failure:
                        logger.info(f"Stopping batch {batch_id} due to exception")
                        # Mark remaining commands as skipped
                        for j in range(i + 1, len(commands)):
                            command_results.append(CommandResult(
                                command=commands[j].strip() if j < len(commands) else "",
                                success=False,
                                output="",
                                error="Previous command failed, batch execution stopped",
                                command_index=j
                            ))
                            failed_commands += 1
                        break
            
            # Store batch backups
            if batch_backup_ids:
                self.batch_backups[batch_id] = batch_backup_ids
                logger.info(f"Batch {batch_id} created {len(batch_backup_ids)} backup(s)")
            
            execution_time = time.time() - start_time
            overall_success = failed_commands == 0
            
            batch_result = BatchResult(
                batch_id=batch_id,
                total_commands=len(commands),
                successful_commands=successful_commands,
                failed_commands=failed_commands,
                command_results=command_results,
                overall_success=overall_success,
                total_execution_time=execution_time
            )
            
            # Emit batch complete event
            if self.connection:
                await self.connection.emit('batch_complete', {
                    'batch_id': batch_id,
                    'success': overall_success,
                    'total_commands': len(commands),
                    'successful_commands': successful_commands,
                    'failed_commands': failed_commands,
                    'execution_time': execution_time
                })
            
            logger.info(f"Batch {batch_id} completed: {successful_commands}/{len(commands)} commands succeeded")
            
            return batch_result
            
        except Exception as e:
            execution_time = time.time() - start_time
            error_msg = f"Batch execution error: {str(e)}"
            logger.exception(error_msg)
            
            return BatchResult(
                batch_id=batch_id,
                total_commands=len(commands),
                successful_commands=successful_commands,
                failed_commands=len(commands) - successful_commands,
                command_results=command_results,
                overall_success=False,
                total_execution_time=execution_time
            )
        finally:
            # Clean up tracking
            self.active_executions.pop(batch_id, None)

    async def cancel_batch(self, batch_id: str) -> bool:
        """Cancel a running batch execution.
        
        Args:
            batch_id: Batch ID to cancel
            
        Returns:
            True if batch was found and cancelled
        """
        if batch_id in self.active_executions:
            self.active_executions[batch_id] = False
            logger.info(f"Cancelled batch {batch_id}")
            return True
        
        logger.warning(f"Batch {batch_id} not found for cancellation")
        return False

    async def rollback_command(self, command_id: str) -> bool:
        """Rollback a command by restoring its backups.
        
        Args:
            command_id: Command ID to rollback
        
        Returns:
            True if rollback succeeded, False otherwise
        """
        try:
            if command_id not in self.command_backups:
                logger.error(f"No backups found for command {command_id}")
                return False
            
            backup_ids = self.command_backups[command_id]
            logger.info(f"Rolling back command {command_id} with {len(backup_ids)} backup(s)")
            
            # Emit rollback start
            if self.connection:
                await self.connection.emit('rollback_started', {
                    'command_id': command_id,
                    'backup_count': len(backup_ids)
                })
            
            success_count = 0
            for backup_id in backup_ids:
                if self.backup_manager.restore_backup(backup_id):
                    success_count += 1
                    logger.info(f"Restored backup {backup_id}")
                else:
                    logger.error(f"Failed to restore backup {backup_id}")
            
            success = success_count == len(backup_ids)
            
            # Emit rollback complete
            if self.connection:
                await self.connection.emit('rollback_completed', {
                    'command_id': command_id,
                    'success': success,
                    'restored_count': success_count,
                    'total_count': len(backup_ids)
                })
            
            logger.info(f"Rollback for command {command_id}: {'success' if success else 'partial/failed'} "
                       f"({success_count}/{len(backup_ids)} restored)")
            
            return success
            
        except Exception as e:
            logger.exception(f"Failed to rollback command {command_id}: {e}")
            return False

    async def restore_from_backup(
        self, 
        backup_id: str,
        output_callback: Optional[Callable] = None
    ) -> CommandResult:
        """Restore files from a specific backup.
        
        Args:
            backup_id: Backup ID to restore
            output_callback: Optional callback for output messages
        
        Returns:
            CommandResult with restoration details
        """
        try:
            logger.info(f"Restoring from backup: {backup_id}")
            
            # Get backup info to display meaningful name
            backup_info = self.backup_manager.get_backup_info(backup_id)
            original_path = "unknown"
            if backup_info:
                original_path = backup_info.get('original_path', 'unknown')
                # Get just the filename/folder name
                from pathlib import Path
                original_name = Path(original_path).name
            else:
                original_name = backup_id
            
            # Send initial output
            if output_callback:
                await output_callback(f"Starting backup restoration: {original_name}\n")
                await output_callback(f"Backup ID: {backup_id}\n")
            
            # Emit restore start
            if self.connection:
                await self.connection.emit('backup_restore_started', {
                    'backup_id': backup_id,
                    'original_path': original_path
                })
            
            # Restore the backup
            success = self.backup_manager.restore_backup(backup_id)
            
            if success:
                output_msg = f"Successfully restored: {original_name}\nOriginal path: {original_path}\n"
                logger.info(output_msg)
                if output_callback:
                    await output_callback(output_msg)
                
                # Emit restore complete
                if self.connection:
                    await self.connection.emit('backup_restore_completed', {
                        'backup_id': backup_id,
                        'success': True,
                        'original_path': original_path
                    })
                
                return CommandResult(
                    command=f"Restored {original_name}",
                    success=True,
                    output=output_msg,
                    error=None
                )
            else:
                error_msg = f"Failed to restore backup: {backup_id}"
                logger.error(error_msg)
                if output_callback:
                    await output_callback(f"ERROR: {error_msg}\n")
                
                # Emit restore failed
                if self.connection:
                    await self.connection.emit('backup_restore_completed', {
                        'backup_id': backup_id,
                        'success': False,
                        'error': error_msg
                    })
                
                return CommandResult(
                    command=f"Restore failed: {original_name}",
                    success=False,
                    output="",
                    error=error_msg
                )
                
        except Exception as e:
            error_msg = f"Exception during backup restoration: {str(e)}"
            logger.exception(error_msg)
            if output_callback:
                await output_callback(f"ERROR: {error_msg}\n")
            
            return CommandResult(
                command=f"Restore error",
                success=False,
                output="",
                error=error_msg
            )

    async def rollback_batch(self, batch_id: str) -> bool:
        """Rollback an entire batch by restoring all backups.
        
        Args:
            batch_id: Batch ID to rollback
        
        Returns:
            True if rollback succeeded, False otherwise
        """
        try:
            if batch_id not in self.batch_backups:
                logger.error(f"No backups found for batch {batch_id}")
                return False
            
            backup_ids = self.batch_backups[batch_id]
            logger.info(f"Rolling back batch {batch_id} with {len(backup_ids)} backup(s)")
            
            # Emit rollback start
            if self.connection:
                await self.connection.emit('batch_rollback_started', {
                    'batch_id': batch_id,
                    'backup_count': len(backup_ids)
                })
            
            # Restore in reverse order (last command first)
            success_count = 0
            for backup_id in reversed(backup_ids):
                if self.backup_manager.restore_backup(backup_id):
                    success_count += 1
                    logger.info(f"Restored backup {backup_id}")
                else:
                    logger.error(f"Failed to restore backup {backup_id}")
            
            success = success_count == len(backup_ids)
            
            # Emit rollback complete
            if self.connection:
                await self.connection.emit('batch_rollback_completed', {
                    'batch_id': batch_id,
                    'success': success,
                    'restored_count': success_count,
                    'total_count': len(backup_ids)
                })
            
            logger.info(f"Rollback for batch {batch_id}: {'success' if success else 'partial/failed'} "
                       f"({success_count}/{len(backup_ids)} restored)")
            
            return success
            
        except Exception as e:
            logger.exception(f"Failed to rollback batch {batch_id}: {e}")
            return False

    def get_command_backups(self, command_id: str) -> Optional[List[str]]:
        """Get backup IDs for a command.
        
        Args:
            command_id: Command ID
        
        Returns:
            List of backup IDs or None if not found
        """
        return self.command_backups.get(command_id)

    def get_batch_backups(self, batch_id: str) -> Optional[List[str]]:
        """Get backup IDs for a batch.
        
        Args:
            batch_id: Batch ID
        
        Returns:
            List of backup IDs or None if not found
        """
        return self.batch_backups.get(batch_id)

    def get_backup_info(self, backup_id: str) -> Optional[Dict[str, Any]]:
        """Get information about a backup.
        
        Args:
            backup_id: Backup ID
        
        Returns:
            Backup metadata or None if not found
        """
        return self.backup_manager.get_backup_info(backup_id)

    def list_all_backups(self) -> Dict[str, Any]:
        """List all backups with categorization.
        
        Returns:
            Dictionary with backup information
        """
        return {
            'command_backups': self.command_backups,
            'batch_backups': self.batch_backups,
            'all_backups': self.backup_manager.list_backups(),
            'backup_size': self.backup_manager.get_backup_size()
        }

    async def cleanup_old_backups(self, max_age_days: int = 30, max_backups: int = 100) -> int:
        """Clean up old backups.
        
        Args:
            max_age_days: Maximum age of backups to keep
            max_backups: Maximum number of backups to keep
        
        Returns:
            Number of backups deleted
        """
        try:
            deleted_count = self.backup_manager.cleanup_old_backups(max_age_days, max_backups)
            
            # Also clean up tracking
            all_backup_ids = set()
            for backup in self.backup_manager.list_backups():
                all_backup_ids.add(backup['backup_id'])
            
            # Remove deleted backups from tracking
            for cmd_id, backup_ids in list(self.command_backups.items()):
                self.command_backups[cmd_id] = [bid for bid in backup_ids if bid in all_backup_ids]
                if not self.command_backups[cmd_id]:
                    del self.command_backups[cmd_id]
            
            for batch_id, backup_ids in list(self.batch_backups.items()):
                self.batch_backups[batch_id] = [bid for bid in backup_ids if bid in all_backup_ids]
                if not self.batch_backups[batch_id]:
                    del self.batch_backups[batch_id]
            
            logger.info(f"Cleaned up {deleted_count} old backups")
            return deleted_count
            
        except Exception as e:
            logger.exception(f"Failed to cleanup old backups: {e}")
            return 0
