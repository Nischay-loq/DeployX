"""Command executor for executing commands on remote systems."""
import asyncio
import logging
import os
from typing import Optional, List, Dict, Any, Callable
from dataclasses import dataclass

from .shell_manager import ShellManager

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
        connection=None
    ):
        """Initialize command executor.
        
        Args:
            shell_manager: Shell manager instance
            connection: Connection manager for emitting events
        """
        self.shell_manager = shell_manager
        self.connection = connection
        
        # Track active executions
        self.active_executions: Dict[str, bool] = {}
        
        logger.info("CommandExecutor initialized")

    async def execute_command(
        self,
        command: str,
        working_dir: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        output_callback: Optional[Callable] = None
    ) -> CommandResult:
        """Execute a single command.
        
        Args:
            command: Command to execute
            working_dir: Working directory for execution
            metadata: Optional metadata
            output_callback: Callback for command output
        
        Returns:
            CommandResult with execution details
        """
        import time
        start_time = time.time()
        command_output = ""
        command_success = True
        error_msg = None
        
        try:
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
                execution_time=execution_time
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
                execution_time=execution_time
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
                    
                    # Execute the command
                    result = await self.execute_command(
                        command=command,
                        working_dir=working_dir,
                        output_callback=output_callback
                    )
                    
                    result.command_index = i
                    command_results.append(result)
                    
                    if result.success:
                        successful_commands += 1
                        logger.info(f"Command {i + 1} in batch {batch_id} succeeded")
                        
                        # Emit success event
                        if self.connection:
                            await self.connection.emit('batch_command_complete', {
                                'batch_id': batch_id,
                                'command_index': i,
                                'success': True,
                                'output': result.output
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
