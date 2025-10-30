"""Socket.IO event handlers for DeployX agent."""
import asyncio
import logging
from typing import Any, Callable, Dict, Optional
from agent.core.shell_manager import ShellManager
import platform

logger = logging.getLogger(__name__)

class SocketEventHandler:
    def __init__(self, shell_manager: ShellManager, connection=None, command_executor=None):
        """Initialize the socket event handler.
        
        Args:
            shell_manager: Instance of ShellManager to handle shell operations
            connection: Instance of ConnectionManager for socket communication
            command_executor: Instance of CommandExecutor for snapshot/rollback operations
        """
        self.shell_manager = shell_manager
        self._connection = connection
        self.command_executor = command_executor

    async def handle_connect(self, data: Dict[str, Any] = None):
        """Handle socket connection event."""
        logger.info("Connected to backend server")

    async def handle_disconnect(self, data: Dict[str, Any] = None):
        """Handle socket disconnection event."""
        logger.info(f"Disconnected from backend server: {data}")
        await self.shell_manager.cleanup_process()

    async def handle_connect_error(self, data: Dict[str, Any]):
        """Handle connection error event."""
        logger.error(f"Connection error: {data}")

    async def handle_registration_success(self, data: Dict[str, Any]):
        """Handle successful registration event."""
        logger.info(f"Successfully registered with backend as {data['agent_id']}")

    async def handle_registration_error(self, data: Dict[str, Any]):
        """Handle registration error event."""
        logger.error(f"Registration failed: {data.get('error', 'Unknown error')}")

    async def handle_start_shell_request(self, data: Dict[str, Any]):
        """Handle request to start a shell."""
        try:
            logger.info(f"Handling start shell request with data: {data}")
            shell_name = data.get('shell', 'cmd')
            success = await self.start_shell_with_response(shell_name)
            
            if not success:
                error_msg = f"Failed to start shell {shell_name}"
                logger.error(error_msg)
                if self._connection and self._connection.connected:
                    await self._connection.emit('error', {'message': error_msg})
        except Exception as e:
            error_msg = f"Error handling start shell request: {str(e)}"
            logger.exception(error_msg)
            if self._connection and self._connection.connected:
                await self._connection.emit('error', {'message': error_msg})

    async def handle_command_input(self, data: Dict[str, Any]):
        """Handle incoming command input."""
        command = data.get('command', '')
        
        is_ping_command = command and "ping" in command.lower() and ("-t" in command or "-w" in command)
        
        if command in ['\u0003', '^C', '\x03']:
            logger.info("Received interrupt signal request")
            await self.shell_manager.send_interrupt(force=True)
        elif command in ['\u001A', '^Z', '\x1A']:
            logger.info("Received suspend signal request")
            if platform.system().lower() == "windows":
                await self.shell_manager.send_interrupt(force=True)
            else:
                await self.shell_manager.send_suspend(force=True)
        elif command in ['\u0004', '^D', '\x04']:
            logger.info("Received EOF signal request")
            await self.shell_manager.execute_command('\u0004')
        elif is_ping_command and platform.system().lower() == "windows":
            await self.shell_manager.execute_command(command)
        elif command in ['cls', 'clear']:
            logger.info("Received clear screen request")
            result = await self.shell_manager.clear_terminal()
            if result and result.get('type') == 'clear':
                if self._connection and self._connection.connected:
                    await self._connection.emit('clear_terminal')
        elif command == '\u001b[A':
            logger.info("Received get previous command request")
            await self.shell_manager.get_previous_command()
        elif command == '\u001b[B':
            logger.info("Received get next command request")
            await self.shell_manager.get_next_command()
        else:
            await self.shell_manager.execute_command(command)

    async def handle_interrupt_signal(self, data: Dict[str, Any]):
        """Handle interrupt signal request."""
        await self.shell_manager.send_interrupt()

    async def handle_get_shells(self, data: Dict[str, Any]):
        """Handle request for available shells."""
        logger.info("Received request for available shells")
        from agent.main import detect_shells
        shells = detect_shells()
        return list(shells.keys())

    async def start_shell_with_response(self, shell_name: str) -> bool:
        """Start a shell and handle response."""
        logger.info(f"Starting shell {shell_name}")
        
        from agent.main import detect_shells
        shells = detect_shells()
        
        if shell_name not in shells:
            logger.error(f"Shell {shell_name} not found in available shells: {list(shells.keys())}")
            return False
            
        shell_path = shells[shell_name]
        logger.info(f"Found shell path: {shell_path}")
        
        async def output_callback(output: str):
            logger.debug(f"Shell output: {output}")
            if self._connection and self._connection.connected:
                await self._connection.emit('command_output', {'output': output})
        
        success = await self.shell_manager.start_shell(shell_name, shell_path, output_callback)
        
        if success:
            logger.info(f"Shell {shell_name} started successfully")
            if self._connection and self._connection.connected:
                await self._connection.emit('shell_started', {'shell': shell_name})
                logger.info("Sent shell_started event to frontend")
            return True
        else:
            logger.error(f"Failed to start shell {shell_name}")
            return False

    async def handle_execute_deployment_command(self, data: Dict[str, Any]):
        """Handle deployment command execution request."""
        try:
            cmd_id = data.get('command_id')
            command = data.get('command', '')
            shell = data.get('shell', 'cmd')
            execution_id = data.get('execution_id')  # For group executions
            is_group_execution = data.get('group_execution', False)
            
            logger.info(f"Received deployment command {cmd_id}: {command}")
            if is_group_execution:
                logger.info(f"This is a group execution with execution_id: {execution_id}")
            
            if not cmd_id:
                logger.error("No command ID provided in deployment command")
                return
                
            shell_is_active = (self.shell_manager.running and 
                              self.shell_manager.current_process and 
                              self.shell_manager.current_process.poll() is None)
            
            if not shell_is_active:
                logger.info(f"Starting shell {shell} for deployment command")
                from agent.main import detect_shells
                shells = detect_shells()
                
                if shell not in shells:
                    error_msg = f"Shell {shell} not available"
                    logger.error(error_msg)
                    if self._connection and self._connection.connected:
                        await self._connection.emit('deployment_command_completed', {
                            'command_id': cmd_id,
                            'success': False,
                            'output': '',
                            'error': error_msg,
                            'execution_id': execution_id,
                            'group_execution': is_group_execution
                        })
                    return
                
                shell_path = shells[shell]
                
                async def deployment_output_callback(output: str):
                    if self._connection and self._connection.connected:
                        await self._connection.emit('deployment_command_output', {
                            'command_id': cmd_id,
                            'output': output
                        })
                
                success = await self.shell_manager.start_shell(shell, shell_path, deployment_output_callback)
                if not success:
                    error_msg = f"Failed to start shell {shell}"
                    logger.error(error_msg)
                    if self._connection and self._connection.connected:
                        await self._connection.emit('deployment_command_completed', {
                            'command_id': cmd_id,
                            'success': False,
                            'output': '',
                            'error': error_msg,
                            'execution_id': execution_id,
                            'group_execution': is_group_execution
                        })
                    return
            
            logger.info(f"Executing deployment command: {command}")
            
            # Check if this is a backup restore command
            is_backup_restore = command.startswith("RESTORE_BACKUP:")
            
            # Use CommandExecutor for automatic backup support
            async def deployment_output_callback(output: str):
                if self._connection and self._connection.connected:
                    await self._connection.emit('deployment_command_output', {
                        'command_id': cmd_id,
                        'output': output
                    })
            
            try:
                # Handle backup restoration
                if is_backup_restore:
                    backup_id = command.split(":", 1)[1].strip()
                    logger.info(f"Restoring from backup: {backup_id}")
                    
                    # Use command executor's restore_from_backup method
                    result = await self.command_executor.restore_from_backup(
                        backup_id=backup_id,
                        output_callback=deployment_output_callback
                    )
                else:
                    # Execute using CommandExecutor (includes backup functionality)
                    result = await self.command_executor.execute_command(
                        command=command,
                        command_id=cmd_id,
                        output_callback=deployment_output_callback
                    )
                
                logger.info(f"Deployment command {cmd_id} completed with success: {result.success}")
                
                # Emit backup info if created
                if result.is_destructive and result.backup_id:
                    logger.info(f"Backup created for deployment command: {result.backup_id}")
                
                if self._connection and self._connection.connected:
                    completion_data = {
                        'command_id': cmd_id,
                        'success': result.success,
                        'output': result.output,
                        'error': result.error or '',
                        'execution_id': execution_id,
                        'group_execution': is_group_execution,
                        'is_destructive': result.is_destructive,
                        'backup_id': result.backup_id,
                        'backup_created': result.backup_id is not None,
                        'display_command': result.command if is_backup_restore else None  # Send better command name for restores
                    }
                    logger.info(f"Sending deployment_command_completed with data: {completion_data}")
                    await self._connection.emit('deployment_command_completed', completion_data)
                    
            except Exception as e:
                error_msg = f"Command execution failed: {str(e)}"
                logger.error(f"Deployment command {cmd_id} failed: {error_msg}")
                if self._connection and self._connection.connected:
                    await self._connection.emit('deployment_command_completed', {
                        'command_id': cmd_id,
                        'success': False,
                        'output': '',
                        'error': error_msg,
                        'execution_id': execution_id,
                        'group_execution': is_group_execution
                    })
                    
        except Exception as e:
            error_msg = f"Error handling deployment command: {str(e)}"
            logger.exception(error_msg)
            if self._connection and self._connection.connected:
                await self._connection.emit('deployment_command_completed', {
                    'command_id': data.get('command_id', ''),
                    'success': False,
                    'output': '',
                    'error': error_msg,
                    'execution_id': data.get('execution_id'),
                    'group_execution': data.get('group_execution', False)
                })

    async def handle_receive_file(self, data: Dict[str, Any]):
        """Handle file transfer from backend."""
        try:
            import os
            import base64
            from pathlib import Path
            
            deployment_id = data.get('deployment_id')
            file_id = data.get('file_id')
            filename = data.get('filename')
            file_data = data.get('file_data')
            target_path = data.get('target_path')
            create_path = data.get('create_path_if_not_exists', True)
            
            logger.info(f"Received file transfer request: {filename} to {target_path}")
            
            if not all([deployment_id, file_id, filename, file_data, target_path]):
                error_msg = "Missing required file transfer parameters"
                logger.error(error_msg)
                if self._connection and self._connection.connected:
                    await self._connection.emit('file_transfer_result', {
                        'deployment_id': deployment_id,
                        'file_id': file_id,
                        'success': False,
                        'error': error_msg
                    })
                return
            
            try:
                file_bytes = base64.b64decode(file_data)
                
                target_dir = Path(target_path)
                if not target_dir.exists():
                    if create_path:
                        logger.info(f"Creating directory: {target_path}")
                        target_dir.mkdir(parents=True, exist_ok=True)
                        path_created = True
                    else:
                        error_msg = f"Target path does not exist: {target_path}"
                        logger.error(error_msg)
                        if self._connection and self._connection.connected:
                            await self._connection.emit('file_transfer_result', {
                                'deployment_id': deployment_id,
                                'file_id': file_id,
                                'success': False,
                                'error': error_msg
                            })
                        return
                else:
                    path_created = False
                
                file_path = target_dir / filename
                logger.info(f"Saving file to: {file_path}")
                
                with open(file_path, 'wb') as f:
                    f.write(file_bytes)
                
                file_size = len(file_bytes)
                success_msg = f"File saved successfully to {file_path} ({file_size} bytes)"
                if path_created:
                    success_msg += " (path created)"
                
                logger.info(success_msg)
                
                if self._connection and self._connection.connected:
                    await self._connection.emit('file_transfer_result', {
                        'deployment_id': deployment_id,
                        'file_id': file_id,
                        'success': True,
                        'message': success_msg,
                        'file_path': str(file_path),
                        'path_created': path_created
                    })
                    
            except PermissionError as e:
                error_msg = f"Permission denied: {str(e)}"
                logger.error(error_msg)
                if self._connection and self._connection.connected:
                    await self._connection.emit('file_transfer_result', {
                        'deployment_id': deployment_id,
                        'file_id': file_id,
                        'success': False,
                        'error': error_msg
                    })
            except Exception as e:
                error_msg = f"File save error: {str(e)}"
                logger.exception(error_msg)
                if self._connection and self._connection.connected:
                    await self._connection.emit('file_transfer_result', {
                        'deployment_id': deployment_id,
                        'file_id': file_id,
                        'success': False,
                        'error': error_msg
                    })
                    
        except Exception as e:
            error_msg = f"Error handling file transfer: {str(e)}"
            logger.exception(error_msg)
            if self._connection and self._connection.connected:
                await self._connection.emit('file_transfer_result', {
                    'deployment_id': data.get('deployment_id'),
                    'file_id': data.get('file_id'),
                    'success': False,
                    'error': error_msg
                })
    
    async def handle_rollback_command(self, data: Dict[str, Any]):
        """Handle rollback request for a single command."""
        try:
            command_id = data.get('command_id')
            
            if not command_id:
                error_msg = "Command ID is required for rollback"
                logger.error(error_msg)
                if self._connection and self._connection.connected:
                    await self._connection.emit('rollback_result', {
                        'command_id': command_id,
                        'success': False,
                        'error': error_msg
                    })
                return
            
            logger.info(f"Received rollback request for command {command_id}")
            
            if not self.command_executor:
                error_msg = "Command executor not initialized"
                logger.error(error_msg)
                if self._connection and self._connection.connected:
                    await self._connection.emit('rollback_result', {
                        'command_id': command_id,
                        'success': False,
                        'error': error_msg
                    })
                return
            
            # Perform rollback
            success = await self.command_executor.rollback_command(command_id)
            
            # Send result
            if self._connection and self._connection.connected:
                await self._connection.emit('rollback_result', {
                    'command_id': command_id,
                    'success': success,
                    'message': 'Rollback completed successfully' if success else 'Rollback failed'
                })
            
            logger.info(f"Rollback for command {command_id}: {'success' if success else 'failed'}")
            
        except Exception as e:
            error_msg = f"Error handling rollback request: {str(e)}"
            logger.exception(error_msg)
            if self._connection and self._connection.connected:
                await self._connection.emit('rollback_result', {
                    'command_id': data.get('command_id'),
                    'success': False,
                    'error': error_msg
                })
    
    async def handle_rollback_batch(self, data: Dict[str, Any]):
        """Handle rollback request for an entire batch."""
        try:
            batch_id = data.get('batch_id')
            
            if not batch_id:
                error_msg = "Batch ID is required for batch rollback"
                logger.error(error_msg)
                if self._connection and self._connection.connected:
                    await self._connection.emit('batch_rollback_result', {
                        'batch_id': batch_id,
                        'success': False,
                        'error': error_msg
                    })
                return
            
            logger.info(f"Received batch rollback request for batch {batch_id}")
            
            if not self.command_executor:
                error_msg = "Command executor not initialized"
                logger.error(error_msg)
                if self._connection and self._connection.connected:
                    await self._connection.emit('batch_rollback_result', {
                        'batch_id': batch_id,
                        'success': False,
                        'error': error_msg
                    })
                return
            
            # Perform batch rollback
            success = await self.command_executor.rollback_batch(batch_id)
            
            # Send result
            if self._connection and self._connection.connected:
                await self._connection.emit('batch_rollback_result', {
                    'batch_id': batch_id,
                    'success': success,
                    'message': 'Batch rollback completed successfully' if success else 'Batch rollback failed'
                })
            
            logger.info(f"Batch rollback for {batch_id}: {'success' if success else 'failed'}")
            
        except Exception as e:
            error_msg = f"Error handling batch rollback request: {str(e)}"
            logger.exception(error_msg)
            if self._connection and self._connection.connected:
                await self._connection.emit('batch_rollback_result', {
                    'batch_id': data.get('batch_id'),
                    'success': False,
                    'error': error_msg
                })
    
    async def handle_get_backup_info(self, data: Dict[str, Any]):
        """Handle request to get backup information."""
        try:
            backup_id = data.get('backup_id')
            
            if not backup_id:
                error_msg = "Backup ID is required"
                logger.error(error_msg)
                if self._connection and self._connection.connected:
                    await self._connection.emit('backup_info_result', {
                        'backup_id': backup_id,
                        'success': False,
                        'error': error_msg
                    })
                return
            
            if not self.command_executor:
                error_msg = "Command executor not initialized"
                logger.error(error_msg)
                if self._connection and self._connection.connected:
                    await self._connection.emit('backup_info_result', {
                        'backup_id': backup_id,
                        'success': False,
                        'error': error_msg
                    })
                return
            
            info = self.command_executor.get_backup_info(backup_id)
            
            if info:
                if self._connection and self._connection.connected:
                    await self._connection.emit('backup_info_result', {
                        'backup_id': backup_id,
                        'success': True,
                        'info': info
                    })
            else:
                if self._connection and self._connection.connected:
                    await self._connection.emit('backup_info_result', {
                        'backup_id': backup_id,
                        'success': False,
                        'error': 'Backup not found'
                    })
            
        except Exception as e:
            error_msg = f"Error getting backup info: {str(e)}"
            logger.exception(error_msg)
            if self._connection and self._connection.connected:
                await self._connection.emit('backup_info_result', {
                    'backup_id': data.get('backup_id'),
                    'success': False,
                    'error': error_msg
                })
    
    async def handle_list_backups(self, data: Dict[str, Any]):
        """Handle request to list all backups."""
        try:
            if not self.command_executor:
                error_msg = "Command executor not initialized"
                logger.error(error_msg)
                if self._connection and self._connection.connected:
                    await self._connection.emit('backups_list_result', {
                        'success': False,
                        'error': error_msg
                    })
                return
            
            backups_info = self.command_executor.list_all_backups()
            
            if self._connection and self._connection.connected:
                await self._connection.emit('backups_list_result', {
                    'success': True,
                    'backups': backups_info
                })
            
        except Exception as e:
            error_msg = f"Error listing backups: {str(e)}"
            logger.exception(error_msg)
            if self._connection and self._connection.connected:
                await self._connection.emit('backups_list_result', {
                    'success': False,
                    'error': error_msg
                })

    def get_handlers(self) -> Dict[str, Callable]:
        """Get all event handlers.
        
        Returns:
            Dictionary mapping event names to their handler functions
        """
        return {
            'connect': self.handle_connect,
            'disconnect': self.handle_disconnect,
            'connect_error': self.handle_connect_error,
            'registration_success': self.handle_registration_success,
            'registration_error': self.handle_registration_error,
            'start_shell_request': self.handle_start_shell_request,
            'command_input': self.handle_command_input,
            'interrupt_signal': self.handle_interrupt_signal,
            'get_shells': self.handle_get_shells,
            'stop_shell_request': self._handle_stop_shell_request,
            'execute_deployment_command': self.handle_execute_deployment_command,
            'execute_batch_persistent': self.handle_execute_batch_persistent,
            'receive_file': self.handle_receive_file,
            'install_software': self.handle_install_software,
            'install_custom_software': self.handle_install_custom_software,
            'rollback_command': self.handle_rollback_command,
            'rollback_batch': self.handle_rollback_batch,
            'get_backup_info': self.handle_get_backup_info,
            'list_backups': self.handle_list_backups
        }

    async def _handle_stop_shell_request(self, data: Dict[str, Any]):
        """Handle request to stop current shell."""
        try:
            logger.info("Handling stop shell request")
            await self.shell_manager.cleanup_process()
            if self._connection and self._connection.connected:
                await self._connection.emit('shell_stopped', {})
                logger.info("Sent shell_stopped event to backend")
        except Exception as e:
            logger.exception(f"Error handling stop shell request: {e}")

    async def handle_execute_batch_persistent(self, data: Dict[str, Any]):
        """Handle batch command execution with persistent shell session."""
        try:
            batch_id = data.get('batch_id')
            commands = data.get('commands', [])
            shell = data.get('shell', 'cmd')
            stop_on_failure = data.get('stop_on_failure', True)
            
            logger.info(f"Received persistent batch execution request {batch_id} with {len(commands)} commands")
            
            if not batch_id or not commands:
                error_msg = "Batch ID and commands are required for persistent batch execution"
                logger.error(error_msg)
                if self._connection and self._connection.connected:
                    await self._connection.emit('batch_execution_completed', {
                        'batch_id': batch_id,
                        'success': False,
                        'error': error_msg
                    })
                return
            
            if (self.shell_manager.running and 
                self.shell_manager.current_process and 
                self.shell_manager.current_process.poll() is None):
                logger.info(f"Using existing shell session for batch {batch_id}")
            else:
                logger.info(f"Starting new shell {shell} for batch {batch_id}")
                from agent.main import detect_shells
                shells = detect_shells()
                
                if shell not in shells:
                    error_msg = f"Shell {shell} not available"
                    logger.error(error_msg)
                    if self._connection and self._connection.connected:
                        await self._connection.emit('batch_execution_completed', {
                            'batch_id': batch_id,
                            'success': False,
                            'error': error_msg
                        })
                    return
                
                shell_path = shells[shell]
                
                async def batch_output_callback(output: str):
                    """Callback for batch command output."""
                    if self._connection and self._connection.connected:
                        await self._connection.emit('batch_command_output', {
                            'batch_id': batch_id,
                            'output': output
                        })
                
                success = await self.shell_manager.start_shell(shell, shell_path, batch_output_callback)
                if not success:
                    error_msg = f"Failed to start shell {shell} for batch execution"
                    logger.error(error_msg)
                    if self._connection and self._connection.connected:
                        await self._connection.emit('batch_execution_completed', {
                            'batch_id': batch_id,
                            'success': False,
                            'error': error_msg
                        })
                    return
            
            # Use CommandExecutor.execute_batch for automatic backup support
            async def batch_output_callback(output: str):
                """Callback for batch command output."""
                if self._connection and self._connection.connected:
                    await self._connection.emit('batch_command_output', {
                        'batch_id': batch_id,
                        'output': output
                    })
            
            try:
                # Execute batch using CommandExecutor (includes backup functionality)
                batch_result = await self.command_executor.execute_batch(
                    batch_id=batch_id,
                    commands=commands,
                    stop_on_failure=stop_on_failure,
                    shell=shell,
                    output_callback=batch_output_callback
                )
                
                # Send final batch completion status
                logger.info(f"Batch {batch_id} completed: {batch_result.successful_commands} successful, {batch_result.failed_commands} failed")
                
                # Check if any backups were created
                batch_backups = self.command_executor.get_batch_backups(batch_id)
                if batch_backups:
                    logger.info(f"Batch {batch_id} created {len(batch_backups)} backup(s)")
                
                # Build execution results for frontend
                execution_results = []
                for cmd_result in batch_result.command_results:
                    result_dict = {
                        'command': cmd_result.command,
                        'index': cmd_result.command_index,
                        'success': cmd_result.success,
                        'output': cmd_result.output,
                        'execution_time': cmd_result.execution_time,
                        'error': cmd_result.error or '',
                        'is_destructive': cmd_result.is_destructive,
                        'backup_id': cmd_result.backup_id
                    }
                    execution_results.append(result_dict)
                
                if self._connection and self._connection.connected:
                    await self._connection.emit('batch_execution_completed', {
                        'batch_id': batch_id,
                        'success': batch_result.overall_success,
                        'total_commands': batch_result.total_commands,
                        'successful_commands': batch_result.successful_commands,
                        'failed_commands': batch_result.failed_commands,
                        'execution_results': execution_results,
                        'output': '',  # Individual outputs sent via batch_command_output
                        'error': '' if batch_result.overall_success else f'{batch_result.failed_commands} command(s) failed',
                        'backup_created': batch_backups is not None and len(batch_backups) > 0,
                        'backup_count': len(batch_backups) if batch_backups else 0
                    })
                        
            except Exception as e:
                error_msg = f"Batch execution failed: {str(e)}"
                logger.exception(error_msg)
                if self._connection and self._connection.connected:
                    await self._connection.emit('batch_execution_completed', {
                        'batch_id': batch_id,
                        'success': False,
                        'error': error_msg
                    })
                    
        except Exception as e:
            error_msg = f"Error handling persistent batch execution: {str(e)}"
            logger.exception(error_msg)
            if self._connection and self._connection.connected:
                await self._connection.emit('batch_execution_completed', {
                    'batch_id': data.get('batch_id', ''),
                    'success': False,
                    'error': error_msg
                })

    async def _wait_for_command_completion(self, command: str, timeout: int = 0):
        """Wait for command completion by monitoring output for prompt return (no timeout for persistent execution)."""
        # Simple approach: wait a reasonable time for command to complete
        # This could be enhanced to detect shell prompts more intelligently
        await asyncio.sleep(1.0)  # Base wait time
        
        # For known long-running commands, wait longer but no timeout
        if any(keyword in command.lower() for keyword in ['ping', 'tracert', 'nslookup', 'download', 'install']):
            await asyncio.sleep(3.0)
        
        # Additional smart waiting could be implemented here based on shell type
        # and command patterns - timeout parameter ignored for persistent execution

    async def handle_install_software(self, data: Dict[str, Any]):
        """Handle software installation request from backend"""
        try:
            deployment_id = data.get('deployment_id')
            device_id = data.get('device_id')
            software_list = data.get('software_list', [])
            
            logger.info(f"[AGENT] Received install_software event for deployment {deployment_id}")
            logger.info(f"[AGENT] Device ID: {device_id}")
            logger.info(f"[AGENT] Installing {len(software_list)} package(s)")
            logger.info(f"[AGENT] Packages: {[s.get('name') for s in software_list]}")
            
            # Import installers
            from agent.installers.downloader import SoftwareDownloader
            from agent.installers.installer import SoftwareInstaller
            
            downloader = SoftwareDownloader()
            installer = SoftwareInstaller()
            
            # Send initial status
            if self._connection and self._connection.connected:
                await self._connection.emit('software_installation_status', {
                    'deployment_id': deployment_id,
                    'device_id': device_id,
                    'status': 'in_progress',
                    'progress': 0,
                    'message': 'Starting installation...'
                })
            
            total_software = len(software_list)
            completed = 0
            failed = 0
            
            for idx, software in enumerate(software_list):
                try:
                    name = software.get('name', 'Unknown')
                    download_url = software.get('download_url')
                    install_command = software.get('install_command')
                    checksum = software.get('checksum')
                    
                    logger.info(f"Processing {name} ({idx+1}/{total_software})")
                    
                    # Update progress - downloading
                    progress = int((idx / total_software) * 100)
                    if self._connection and self._connection.connected:
                        await self._connection.emit('software_installation_status', {
                            'deployment_id': deployment_id,
                            'device_id': device_id,
                            'status': 'downloading',
                            'progress': progress,
                            'message': f'Downloading {name}...',
                            'current_software': name
                        })
                    
                    # Download software
                    async def download_progress(percent):
                        if self._connection and self._connection.connected:
                            await self._connection.emit('software_download_progress', {
                                'deployment_id': deployment_id,
                                'device_id': device_id,
                                'software_name': name,
                                'progress': percent
                            })
                    
                    filepath = await downloader.download(
                        download_url,
                        checksum=checksum,
                        progress_callback=download_progress
                    )
                    
                    if not filepath:
                        error_msg = f"Failed to download {name} from {download_url}"
                        logger.error(error_msg)
                        failed += 1
                        
                        # Emit failure status for this software
                        if self._connection and self._connection.connected:
                            await self._connection.emit('software_installation_status', {
                                'deployment_id': deployment_id,
                                'device_id': device_id,
                                'status': 'failed',
                                'progress': int(((idx + 1) / total_software) * 100),
                                'message': error_msg,
                                'current_software': name,
                                'error': error_msg
                            })
                        continue
                    
                    logger.info(f"[AGENT] Downloaded {name} to: {filepath}")
                    
                    # Update progress - installing
                    if self._connection and self._connection.connected:
                        await self._connection.emit('software_installation_status', {
                            'deployment_id': deployment_id,
                            'device_id': device_id,
                            'status': 'installing',
                            'progress': progress + 5,
                            'message': f'Installing {name}...',
                            'current_software': name
                        })
                    
                    logger.info(f"[AGENT] Starting installation of {name} with command: {install_command}")
                    
                    # Install software
                    result = await installer.install(filepath, install_command)
                    
                    logger.info(f"[AGENT] Installation result for {name}: {result}")
                    
                    if result['success']:
                        logger.info(f"✓ Successfully installed {name}")
                        completed += 1
                        
                        # Emit success status for this software
                        if self._connection and self._connection.connected:
                            await self._connection.emit('software_installation_status', {
                                'deployment_id': deployment_id,
                                'device_id': device_id,
                                'status': 'in_progress',
                                'progress': int(((idx + 1) / total_software) * 100),
                                'message': f'✓ Successfully installed {name}',
                                'current_software': name
                            })
                    else:
                        error_msg = f"✗ Failed to install {name}: {result.get('error', 'Unknown error')}"
                        logger.error(error_msg)
                        failed += 1
                        
                        # Emit failure status for this software
                        if self._connection and self._connection.connected:
                            await self._connection.emit('software_installation_status', {
                                'deployment_id': deployment_id,
                                'device_id': device_id,
                                'status': 'in_progress',  # Keep overall as in_progress
                                'progress': int(((idx + 1) / total_software) * 100),
                                'message': error_msg,
                                'current_software': name,
                                'error': result.get('error', 'Unknown error'),
                                'output': result.get('output', '')
                            })
                    
                except Exception as e:
                    error_msg = f"Error processing software {software.get('name')}: {str(e)}"
                    logger.error(error_msg)
                    logger.exception(e)
                    failed += 1
                    
                    # Emit error status for this software
                    if self._connection and self._connection.connected:
                        await self._connection.emit('software_installation_status', {
                            'deployment_id': deployment_id,
                            'device_id': device_id,
                            'status': 'in_progress',
                            'progress': int(((idx + 1) / total_software) * 100),
                            'message': error_msg,
                            'current_software': software.get('name', 'Unknown'),
                            'error': str(e)
                        })
            
            # Send final status
            final_status = 'completed' if failed == 0 else ('failed' if completed == 0 else 'partial')
            
            if self._connection and self._connection.connected:
                await self._connection.emit('software_installation_status', {
                    'deployment_id': deployment_id,
                    'device_id': device_id,
                    'status': final_status,
                    'progress': 100,
                    'message': f'Installation complete: {completed} succeeded, {failed} failed',
                    'completed': completed,
                    'failed': failed,
                    'total': total_software
                })
            
            # Cleanup - keep files on failure for debugging
            downloader.cleanup(keep_files=(failed > 0))
            
            logger.info(f"Software installation completed: {completed}/{total_software} successful")
            
        except Exception as e:
            error_msg = f"Error handling software installation: {str(e)}"
            logger.exception(error_msg)
            
            if self._connection and self._connection.connected:
                await self._connection.emit('software_installation_status', {
                    'deployment_id': data.get('deployment_id'),
                    'device_id': data.get('device_id'),
                    'status': 'failed',
                    'progress': 0,
                    'message': error_msg,
                    'error': error_msg
                })
    
    async def handle_install_custom_software(self, data: Dict[str, Any]):
        """Handle custom software installation (command execution)"""
        try:
            deployment_id = data.get('deployment_id')
            device_id = data.get('device_id')
            command = data.get('command')
            
            logger.info(f"Executing custom software command: {command}")
            
            # Send initial status
            if self._connection and self._connection.connected:
                await self._connection.emit('software_installation_status', {
                    'deployment_id': deployment_id,
                    'device_id': device_id,
                    'status': 'in_progress',
                    'progress': 0,
                    'message': 'Executing custom command...'
                })
            
            # Execute command using shell manager
            success = await self.shell_manager.ensure_shell()
            
            if not success:
                raise Exception("Failed to start shell")
            
            # Execute the command
            await self.shell_manager.execute_command(command)
            
            # Wait for completion
            await asyncio.sleep(2)
            
            # Get output
            output = self.shell_manager.get_output()
            
            # Send completion status
            if self._connection and self._connection.connected:
                await self._connection.emit('software_installation_status', {
                    'deployment_id': deployment_id,
                    'device_id': device_id,
                    'status': 'completed',
                    'progress': 100,
                    'message': 'Custom command executed',
                    'output': output
                })
            
            logger.info("Custom software command completed")
            
        except Exception as e:
            error_msg = f"Error executing custom software command: {str(e)}"
            logger.exception(error_msg)
            
            if self._connection and self._connection.connected:
                await self._connection.emit('software_installation_status', {
                    'deployment_id': data.get('deployment_id'),
                    'device_id': data.get('device_id'),
                    'status': 'failed',
                    'progress': 0,
                    'message': error_msg,
                    'error': error_msg
                })