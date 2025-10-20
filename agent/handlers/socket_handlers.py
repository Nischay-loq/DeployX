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
            
            logger.info(f"Received deployment command {cmd_id}: {command}")
            
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
                            'error': error_msg
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
                            'error': error_msg
                        })
                    return
            
            logger.info(f"Executing deployment command: {command}")
            
            original_callback = self.shell_manager.output_callback
            
            async def deployment_specific_callback(output: str):
                # Call original callback if it exists
                if original_callback:
                    await original_callback(output)
                
                # Also send deployment-specific output
                if self._connection and self._connection.connected:
                    await self._connection.emit('deployment_command_output', {
                        'command_id': cmd_id,
                        'output': output
                    })
            
            self.shell_manager.output_callback = deployment_specific_callback
            
            command_output = ""
            command_success = True
            
            async def enhanced_deployment_callback(output: str):
                nonlocal command_output, command_success
                command_output += output
                
                if original_callback:
                    await original_callback(output)
                
                # Also send deployment-specific output
                if self._connection and self._connection.connected:
                    await self._connection.emit('deployment_command_output', {
                        'command_id': cmd_id,
                        'output': output
                    })
                
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
                    "syntax error"
                ]
                
                for indicator in error_indicators:
                    if indicator.lower() in output.lower():
                        command_success = False
                        break
            
            self.shell_manager.output_callback = enhanced_deployment_callback
            
            try:
                result = await self.shell_manager.execute_command(command + '\n')
                
                await asyncio.sleep(0.5)
                
                logger.info(f"Deployment command {cmd_id} completed with success: {command_success}")
                if self._connection and self._connection.connected:
                    await self._connection.emit('deployment_command_completed', {
                        'command_id': cmd_id,
                        'success': command_success,
                        'output': command_output,
                        'error': '' if command_success else 'Command execution failed (see output for details)'
                    })
                    
            except Exception as e:
                error_msg = f"Command execution failed: {str(e)}"
                logger.error(f"Deployment command {cmd_id} failed: {error_msg}")
                if self._connection and self._connection.connected:
                    await self._connection.emit('deployment_command_completed', {
                        'command_id': cmd_id,
                        'success': False,
                        'output': command_output,
                        'error': error_msg
                    })
            finally:
                self.shell_manager.output_callback = original_callback
                    
        except Exception as e:
            error_msg = f"Error handling deployment command: {str(e)}"
            logger.exception(error_msg)
            if self._connection and self._connection.connected:
                await self._connection.emit('deployment_command_completed', {
                    'command_id': data.get('command_id', ''),
                    'success': False,
                    'output': '',
                    'error': error_msg
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
            snapshot_id = data.get('snapshot_id')
            
            if not snapshot_id:
                error_msg = "Snapshot ID is required for rollback"
                logger.error(error_msg)
                if self._connection and self._connection.connected:
                    await self._connection.emit('rollback_result', {
                        'snapshot_id': snapshot_id,
                        'success': False,
                        'error': error_msg
                    })
                return
            
            logger.info(f"Received rollback request for snapshot {snapshot_id}")
            
            if not self.command_executor:
                error_msg = "Command executor not initialized"
                logger.error(error_msg)
                if self._connection and self._connection.connected:
                    await self._connection.emit('rollback_result', {
                        'snapshot_id': snapshot_id,
                        'success': False,
                        'error': error_msg
                    })
                return
            
            # Notify start of rollback
            if self._connection and self._connection.connected:
                await self._connection.emit('rollback_status', {
                    'snapshot_id': snapshot_id,
                    'status': 'in_progress',
                    'message': 'Starting rollback...'
                })
            
            # Perform rollback
            success = await self.command_executor.rollback_command(snapshot_id)
            
            # Send result
            if self._connection and self._connection.connected:
                await self._connection.emit('rollback_result', {
                    'snapshot_id': snapshot_id,
                    'success': success,
                    'message': 'Rollback completed successfully' if success else 'Rollback failed'
                })
            
            logger.info(f"Rollback for snapshot {snapshot_id}: {'success' if success else 'failed'}")
            
        except Exception as e:
            error_msg = f"Error handling rollback request: {str(e)}"
            logger.exception(error_msg)
            if self._connection and self._connection.connected:
                await self._connection.emit('rollback_result', {
                    'snapshot_id': data.get('snapshot_id'),
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
            
            # Notify start of rollback
            if self._connection and self._connection.connected:
                await self._connection.emit('batch_rollback_status', {
                    'batch_id': batch_id,
                    'status': 'in_progress',
                    'message': 'Starting batch rollback...'
                })
            
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
    
    async def handle_get_snapshot_info(self, data: Dict[str, Any]):
        """Handle request to get snapshot information."""
        try:
            snapshot_id = data.get('snapshot_id')
            
            if not snapshot_id:
                error_msg = "Snapshot ID is required"
                logger.error(error_msg)
                if self._connection and self._connection.connected:
                    await self._connection.emit('snapshot_info_result', {
                        'snapshot_id': snapshot_id,
                        'success': False,
                        'error': error_msg
                    })
                return
            
            if not self.command_executor:
                error_msg = "Command executor not initialized"
                logger.error(error_msg)
                if self._connection and self._connection.connected:
                    await self._connection.emit('snapshot_info_result', {
                        'snapshot_id': snapshot_id,
                        'success': False,
                        'error': error_msg
                    })
                return
            
            info = self.command_executor.get_snapshot_info(snapshot_id)
            
            if info:
                if self._connection and self._connection.connected:
                    await self._connection.emit('snapshot_info_result', {
                        'snapshot_id': snapshot_id,
                        'success': True,
                        'info': info
                    })
            else:
                if self._connection and self._connection.connected:
                    await self._connection.emit('snapshot_info_result', {
                        'snapshot_id': snapshot_id,
                        'success': False,
                        'error': 'Snapshot not found'
                    })
            
        except Exception as e:
            error_msg = f"Error getting snapshot info: {str(e)}"
            logger.exception(error_msg)
            if self._connection and self._connection.connected:
                await self._connection.emit('snapshot_info_result', {
                    'snapshot_id': data.get('snapshot_id'),
                    'success': False,
                    'error': error_msg
                })
    
    async def handle_get_batch_snapshots(self, data: Dict[str, Any]):
        """Handle request to get batch snapshot information."""
        try:
            batch_id = data.get('batch_id')
            
            if not batch_id:
                error_msg = "Batch ID is required"
                logger.error(error_msg)
                if self._connection and self._connection.connected:
                    await self._connection.emit('batch_snapshots_result', {
                        'batch_id': batch_id,
                        'success': False,
                        'error': error_msg
                    })
                return
            
            if not self.command_executor:
                error_msg = "Command executor not initialized"
                logger.error(error_msg)
                if self._connection and self._connection.connected:
                    await self._connection.emit('batch_snapshots_result', {
                        'batch_id': batch_id,
                        'success': False,
                        'error': error_msg
                    })
                return
            
            info = self.command_executor.get_batch_snapshots(batch_id)
            
            if info:
                if self._connection and self._connection.connected:
                    await self._connection.emit('batch_snapshots_result', {
                        'batch_id': batch_id,
                        'success': True,
                        'info': info
                    })
            else:
                if self._connection and self._connection.connected:
                    await self._connection.emit('batch_snapshots_result', {
                        'batch_id': batch_id,
                        'success': False,
                        'error': 'Batch not found'
                    })
            
        except Exception as e:
            error_msg = f"Error getting batch snapshots: {str(e)}"
            logger.exception(error_msg)
            if self._connection and self._connection.connected:
                await self._connection.emit('batch_snapshots_result', {
                    'batch_id': data.get('batch_id'),
                    'success': False,
                    'error': error_msg
                })
    
    async def handle_cleanup_snapshot(self, data: Dict[str, Any]):
        """Handle request to manually cleanup a snapshot."""
        try:
            snapshot_id = data.get('snapshot_id')
            
            if not snapshot_id:
                error_msg = "Snapshot ID is required"
                logger.error(error_msg)
                if self._connection and self._connection.connected:
                    await self._connection.emit('cleanup_result', {
                        'snapshot_id': snapshot_id,
                        'success': False,
                        'error': error_msg
                    })
                return
            
            if not self.command_executor:
                error_msg = "Command executor not initialized"
                logger.error(error_msg)
                if self._connection and self._connection.connected:
                    await self._connection.emit('cleanup_result', {
                        'snapshot_id': snapshot_id,
                        'success': False,
                        'error': error_msg
                    })
                return
            
            success = await self.command_executor.cleanup_snapshot(snapshot_id)
            
            if self._connection and self._connection.connected:
                await self._connection.emit('cleanup_result', {
                    'snapshot_id': snapshot_id,
                    'success': success,
                    'message': 'Snapshot cleaned up successfully' if success else 'Failed to cleanup snapshot'
                })
            
        except Exception as e:
            error_msg = f"Error cleaning up snapshot: {str(e)}"
            logger.exception(error_msg)
            if self._connection and self._connection.connected:
                await self._connection.emit('cleanup_result', {
                    'snapshot_id': data.get('snapshot_id'),
                    'success': False,
                    'error': error_msg
                })
    
    async def handle_list_snapshots(self, data: Dict[str, Any]):
        """Handle request to list all snapshots."""
        try:
            if not self.command_executor:
                error_msg = "Command executor not initialized"
                logger.error(error_msg)
                if self._connection and self._connection.connected:
                    await self._connection.emit('snapshots_list_result', {
                        'success': False,
                        'error': error_msg
                    })
                return
            
            snapshots = self.command_executor.snapshot_manager.list_snapshots()
            batches = self.command_executor.snapshot_manager.list_batches()
            
            if self._connection and self._connection.connected:
                await self._connection.emit('snapshots_list_result', {
                    'success': True,
                    'snapshots': snapshots,
                    'batches': batches
                })
            
        except Exception as e:
            error_msg = f"Error listing snapshots: {str(e)}"
            logger.exception(error_msg)
            if self._connection and self._connection.connected:
                await self._connection.emit('snapshots_list_result', {
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
            'get_snapshot_info': self.handle_get_snapshot_info,
            'get_batch_snapshots': self.handle_get_batch_snapshots,
            'cleanup_snapshot': self.handle_cleanup_snapshot,
            'list_snapshots': self.handle_list_snapshots
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
            
            all_output = ""
            successful_commands = 0
            failed_commands = 0
            execution_results = []
            
            for i, command in enumerate(commands):
                command = command.strip()
                if not command:
                    continue
                    
                logger.info(f"Executing command {i+1}/{len(commands)} in batch {batch_id}: {command}")
                
                command_output = ""
                command_success = True
                command_start_time = asyncio.get_event_loop().time()
                
                original_callback = self.shell_manager.output_callback
                
                async def command_specific_callback(output: str):
                    """Enhanced callback that captures output for this specific command."""
                    nonlocal command_output, command_success, all_output
                    command_output += output
                    all_output += output
                    
                    if original_callback:
                        await original_callback(output)
                    
                    if self._connection and self._connection.connected:
                        await self._connection.emit('batch_command_progress', {
                            'batch_id': batch_id,
                            'command_index': i,
                            'command': command,
                            'output': output,
                            'status': 'running'
                        })
                    
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
                        "syntax error"
                    ]
                    
                    for indicator in error_indicators:
                        if indicator.lower() in output.lower():
                            command_success = False
                            break
                
                self.shell_manager.output_callback = command_specific_callback
                
                try:
                    result = await self.shell_manager.execute_command(command + '\n')
                    
                    await self._wait_for_command_completion(command, timeout=0)
                    
                    command_end_time = asyncio.get_event_loop().time()
                    execution_time = command_end_time - command_start_time
                    
                    command_result = {
                        'command': command,
                        'index': i,
                        'success': command_success,
                        'output': command_output,
                        'execution_time': execution_time,
                        'error': '' if command_success else 'Command execution failed (see output for details)'
                    }
                    execution_results.append(command_result)
                    
                    if command_success:
                        successful_commands += 1
                        logger.info(f"Command {i+1} completed successfully")
                    else:
                        failed_commands += 1
                        logger.warning(f"Command {i+1} failed: {command}")
                        
                        if stop_on_failure:
                            logger.info(f"Stopping batch {batch_id} due to failure at command {i+1}")
                            for j in range(i + 1, len(commands)):
                                execution_results.append({
                                    'command': commands[j].strip(),
                                    'index': j,
                                    'success': False,
                                    'output': '',
                                    'execution_time': 0,
                                    'error': 'Skipped due to previous failure'
                                })
                            break
                    
                    if self._connection and self._connection.connected:
                        await self._connection.emit('batch_command_completed', {
                            'batch_id': batch_id,
                            'command_index': i,
                            'command': command,
                            'success': command_success,
                            'output': command_output,
                            'error': command_result['error']
                        })
                        
                except Exception as e:
                    failed_commands += 1
                    error_msg = f"Command execution failed: {str(e)}"
                    logger.error(f"Command {i+1} in batch {batch_id} failed: {error_msg}")
                    
                    execution_results.append({
                        'command': command,
                        'index': i,
                        'success': False,
                        'output': command_output,
                        'execution_time': asyncio.get_event_loop().time() - command_start_time,
                        'error': error_msg
                    })
                    
                    if stop_on_failure:
                        logger.info(f"Stopping batch {batch_id} due to error at command {i+1}")
                        break
                        
                finally:
                    # Restore original callback
                    self.shell_manager.output_callback = original_callback
            
            # Send final batch completion status
            overall_success = failed_commands == 0
            logger.info(f"Batch {batch_id} completed: {successful_commands} successful, {failed_commands} failed")
            
            if self._connection and self._connection.connected:
                await self._connection.emit('batch_execution_completed', {
                    'batch_id': batch_id,
                    'success': overall_success,
                    'total_commands': len(commands),
                    'successful_commands': successful_commands,
                    'failed_commands': failed_commands,
                    'execution_results': execution_results,
                    'output': all_output,
                    'error': '' if overall_success else f'{failed_commands} command(s) failed'
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