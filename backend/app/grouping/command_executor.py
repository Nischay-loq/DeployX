"""
Command executor for handling command execution on device groups.
Similar to the individual agent command executor but handles multiple agents at once.
"""
import asyncio
import logging
import uuid
from typing import Dict, List, Optional, Any
from datetime import datetime
from enum import Enum

logger = logging.getLogger(__name__)

# Import command queue for tracking group commands
try:
    from app.command_deployment.queue import command_queue, CommandStatus
except ImportError:
    logger.warning("Could not import command_queue, queue integration disabled")
    command_queue = None
    CommandStatus = None


class GroupCommandStatus(str, Enum):
    """Status of group command execution"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    PARTIAL_SUCCESS = "partial_success"  # Some devices succeeded, some failed
    FAILED = "failed"
    PAUSED = "paused"


class DeviceCommandResult:
    """Result of command execution on a single device"""
    def __init__(self, device_id: int, agent_id: str, device_name: str = None):
        self.device_id = device_id
        self.agent_id = agent_id
        self.device_name = device_name or f"Device-{device_id}"
        self.status = GroupCommandStatus.PENDING
        self.output = ""
        self.error = None
        self.started_at = None
        self.completed_at = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "device_id": self.device_id,
            "agent_id": self.agent_id,
            "device_name": self.device_name,
            "status": self.status,
            "output": self.output,
            "error": self.error,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }


class GroupCommandExecution:
    """Tracks execution of a command across multiple devices in a group"""
    def __init__(self, group_id: int, group_name: str, command: str, shell: str, strategy: str):
        self.execution_id = str(uuid.uuid4())
        self.group_id = group_id
        self.group_name = group_name
        self.command = command
        self.shell = shell
        self.strategy = strategy
        self.status = GroupCommandStatus.PENDING
        self.device_results: Dict[str, DeviceCommandResult] = {}  # keyed by agent_id
        self.started_at = None
        self.completed_at = None
        self.total_devices = 0
        self.successful_devices = 0
        self.failed_devices = 0
    
    def add_device(self, device_id: int, agent_id: str, device_name: str = None):
        """Add a device to track in this execution"""
        self.device_results[agent_id] = DeviceCommandResult(device_id, agent_id, device_name)
        self.total_devices += 1
    
    def update_device_status(self, agent_id: str, status: GroupCommandStatus, 
                           output: str = None, error: str = None):
        """Update status for a specific device"""
        if agent_id not in self.device_results:
            logger.warning(f"Device with agent {agent_id} not found in execution {self.execution_id}")
            return
        
        result = self.device_results[agent_id]
        old_status = result.status
        result.status = status
        
        if output:
            result.output += output
        
        if error:
            result.error = error
        
        # Update timestamps
        now = datetime.now()
        if status == GroupCommandStatus.RUNNING and old_status == GroupCommandStatus.PENDING:
            result.started_at = now
        elif status in [GroupCommandStatus.COMPLETED, GroupCommandStatus.FAILED]:
            result.completed_at = now
            
            # Update counters
            if status == GroupCommandStatus.COMPLETED:
                self.successful_devices += 1
            else:
                self.failed_devices += 1
            
            # Check if all devices are done
            self._check_completion()
    
    def _check_completion(self):
        """Check if all devices have completed and update overall status"""
        completed_count = self.successful_devices + self.failed_devices
        
        if completed_count >= self.total_devices:
            # All devices completed
            if self.failed_devices == 0:
                self.status = GroupCommandStatus.COMPLETED
            elif self.successful_devices == 0:
                self.status = GroupCommandStatus.FAILED
            else:
                self.status = GroupCommandStatus.PARTIAL_SUCCESS
            
            self.completed_at = datetime.now()
            logger.info(f"Group execution {self.execution_id} completed: {self.successful_devices} succeeded, {self.failed_devices} failed")
    
    def get_progress(self) -> float:
        """Get execution progress as percentage"""
        if self.total_devices == 0:
            return 0.0
        completed = self.successful_devices + self.failed_devices
        return (completed / self.total_devices) * 100
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses"""
        return {
            "execution_id": self.execution_id,
            "group_id": self.group_id,
            "group_name": self.group_name,
            "command": self.command,
            "shell": self.shell,
            "strategy": self.strategy,
            "status": self.status,
            "total_devices": self.total_devices,
            "successful_devices": self.successful_devices,
            "failed_devices": self.failed_devices,
            "progress": self.get_progress(),
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "device_results": [result.to_dict() for result in self.device_results.values()]
        }


class GroupBatchExecution:
    """Tracks sequential batch execution of multiple commands on a group"""
    def __init__(self, group_id: int, group_name: str, commands: List[str], 
                 shell: str, stop_on_failure: bool):
        self.batch_id = str(uuid.uuid4())
        self.group_id = group_id
        self.group_name = group_name
        self.commands = commands
        self.shell = shell
        self.stop_on_failure = stop_on_failure
        self.status = GroupCommandStatus.PENDING
        self.current_command_index = 0
        self.command_executions: List[GroupCommandExecution] = []
        self.started_at = None
        self.completed_at = None
    
    def get_progress_summary(self) -> str:
        """Get human-readable progress summary"""
        total = len(self.commands)
        current = self.current_command_index + 1
        return f"{current}/{total} commands executed"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses"""
        return {
            "batch_id": self.batch_id,
            "group_id": self.group_id,
            "group_name": self.group_name,
            "status": self.status,
            "total_commands": len(self.commands),
            "current_command_index": self.current_command_index,
            "stop_on_failure": self.stop_on_failure,
            "progress_summary": self.get_progress_summary(),
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "command_executions": [exec.to_dict() for exec in self.command_executions]
        }


class GroupCommandExecutor:
    """Handles execution of commands on device groups"""
    
    def __init__(self):
        self.sio = None
        self.conn_manager = None
        self.active_executions: Dict[str, GroupCommandExecution] = {}  # keyed by execution_id
        self.active_batches: Dict[str, GroupBatchExecution] = {}  # keyed by batch_id
        self.execution_locks: Dict[str, asyncio.Lock] = {}
    
    def set_socketio(self, sio, conn_manager):
        """Set the socket.io instance and connection manager"""
        self.sio = sio
        self.conn_manager = conn_manager
        logger.info("Group command executor initialized with Socket.IO")
    
    async def execute_group_command(self, group_id: int, group_name: str, 
                                   devices: List[Dict], command: str, 
                                   shell: str = "cmd", strategy: str = "transactional") -> str:
        """
        Execute a single command on all devices in a group.
        
        Args:
            group_id: Group identifier
            group_name: Name of the group
            devices: List of device dictionaries with id, agent_id, device_name
            command: Command to execute
            shell: Shell type (cmd, powershell, bash, etc.)
            strategy: Deployment strategy
        
        Returns:
            execution_id: Unique identifier for this execution
        """
        if not devices:
            raise ValueError("No devices in group")
        
        if not self.sio or not self.conn_manager:
            raise RuntimeError("Socket.IO not initialized")
        
        # Create execution tracker
        execution = GroupCommandExecution(group_id, group_name, command, shell, strategy)
        
        # Add all devices to execution
        for device in devices:
            execution.add_device(
                device_id=device['id'],
                agent_id=device.get('agent_id'),
                device_name=device.get('device_name')
            )
        
        # Store execution
        self.active_executions[execution.execution_id] = execution
        
        # Update status to running
        execution.status = GroupCommandStatus.RUNNING
        execution.started_at = datetime.now()
        
        logger.info(f"Starting group command execution {execution.execution_id} for group {group_name} with {len(devices)} devices")
        
        # Execute command on all devices in parallel
        tasks = []
        for device in devices:
            agent_id = device.get('agent_id')
            if agent_id:
                task = self._execute_on_device(execution, agent_id, device['id'])
                tasks.append(task)
        
        # Start all executions in background
        asyncio.create_task(self._execute_all_devices(execution, tasks))
        
        return execution.execution_id
    
    async def _execute_all_devices(self, execution: GroupCommandExecution, tasks: List):
        """Execute command on all devices and handle results"""
        try:
            await asyncio.gather(*tasks, return_exceptions=True)
            logger.info(f"All device executions completed for group execution {execution.execution_id}")
        except Exception as e:
            logger.error(f"Error in group execution {execution.execution_id}: {e}")
    
    async def _execute_on_device(self, execution: GroupCommandExecution, 
                                agent_id: str, device_id: int):
        """Execute command on a single device within a group execution"""
        try:
            # Check if agent is connected
            agent_sid = self.conn_manager.get_agent_sid(agent_id)
            if not agent_sid:
                # Log available agents for debugging
                available_agents = self.conn_manager.get_agent_list()
                logger.error(f"Agent {agent_id} not connected. Available agents: {available_agents}")
                execution.update_device_status(
                    agent_id, 
                    GroupCommandStatus.FAILED,
                    error=f"Agent not connected"
                )
                
                # Also add to command queue with failed status for visibility
                if command_queue and CommandStatus:
                    try:
                        config = {
                            'original_command': execution.command,
                            'group_execution': True,
                            'group_id': execution.group_id,
                            'group_name': execution.group_name,
                            'execution_id': execution.execution_id,
                            'device_id': device_id
                        }
                        queue_cmd_id = command_queue.add_command(
                            command=execution.command,
                            agent_id=agent_id,
                            shell=execution.shell,
                            strategy=execution.strategy,
                            config=config
                        )
                        command_queue.update_command_status(
                            queue_cmd_id, 
                            CommandStatus.FAILED,
                            error=f"Agent not connected. Device agent_id: {agent_id}, Connected agents: {available_agents}"
                        )
                    except Exception as e:
                        logger.error(f"Error adding failed command to queue: {e}")
                
                return
            
            # Check if agent is responsive
            if hasattr(self.conn_manager, 'is_agent_connected') and \
               not self.conn_manager.is_agent_connected(agent_id):
                logger.error(f"Agent {agent_id} is unresponsive")
                execution.update_device_status(
                    agent_id,
                    GroupCommandStatus.FAILED,
                    error="Agent is unresponsive"
                )
                return
            
            # Update status to running
            execution.update_device_status(agent_id, GroupCommandStatus.RUNNING)
            
            # Add to command queue for tracking first to get the queue command ID
            queue_cmd_id = None
            if command_queue and CommandStatus:
                try:
                    # Create config with group context
                    config = {
                        'original_command': execution.command,
                        'group_execution': True,
                        'group_id': execution.group_id,
                        'group_name': execution.group_name,
                        'execution_id': execution.execution_id,
                        'device_id': device_id
                    }
                    
                    # Add command to queue
                    queue_cmd_id = command_queue.add_command(
                        command=execution.command,
                        agent_id=agent_id,
                        shell=execution.shell,
                        strategy=execution.strategy,
                        config=config
                    )
                    
                    # Update to running status immediately
                    command_queue.update_command_status(queue_cmd_id, CommandStatus.RUNNING)
                    
                    # Store queue command ID for later updates
                    if not hasattr(execution, 'queue_command_ids'):
                        execution.queue_command_ids = {}
                    execution.queue_command_ids[agent_id] = queue_cmd_id
                    
                    # Emit event to frontend that command queue was updated
                    if self.sio:
                        await self.sio.emit('command_queue_updated', {
                            'command_id': queue_cmd_id,
                            'action': 'added',
                            'group_execution': True,
                            'execution_id': execution.execution_id
                        })
                    
                    logger.info(f"Added group command to queue: {queue_cmd_id} for agent {agent_id}")
                except Exception as e:
                    logger.error(f"Error adding command to queue: {e}")
            
            # Use queue command ID if available, otherwise use execution_id format
            cmd_id = queue_cmd_id if queue_cmd_id else f"{execution.execution_id}_{agent_id}"
            
            # Send command to agent with the queue command ID
            await self.sio.emit('execute_deployment_command', {
                'command_id': cmd_id,
                'command': execution.command,
                'shell': execution.shell,
                'execution_id': execution.execution_id,
                'group_execution': True
            }, room=agent_sid)
            
            logger.info(f"Sent command to agent {agent_id} for group execution {execution.execution_id}")
            
        except Exception as e:
            logger.error(f"Error executing on device {device_id} (agent {agent_id}): {e}")
            execution.update_device_status(
                agent_id,
                GroupCommandStatus.FAILED,
                error=str(e)
            )
    
    async def handle_device_command_completion(self, execution_id: str, agent_id: str,
                                              success: bool, output: str = "", error: str = ""):
        """Handle command completion from a device in a group execution"""
        try:
            execution = self.active_executions.get(execution_id)
            if not execution:
                logger.warning(f"Group execution {execution_id} not found")
                return
            
            status = GroupCommandStatus.COMPLETED if success else GroupCommandStatus.FAILED
            execution.update_device_status(agent_id, status, output=output, error=error)
            
            # Update command queue
            if command_queue and CommandStatus and hasattr(execution, 'queue_command_ids'):
                queue_cmd_id = execution.queue_command_ids.get(agent_id)
                if queue_cmd_id:
                    try:
                        queue_status = CommandStatus.COMPLETED if success else CommandStatus.FAILED
                        command_queue.update_command_status(
                            queue_cmd_id,
                            queue_status,
                            output=output,
                            error=error if not success else None
                        )
                        logger.info(f"Updated queue command {queue_cmd_id} with status: {queue_status}")
                    except Exception as e:
                        logger.error(f"Error updating command queue: {e}")
            
            logger.info(f"Device {agent_id} in group execution {execution_id} completed with status: {status}")
            
        except Exception as e:
            logger.error(f"Error handling device completion for execution {execution_id}: {e}")
    
    async def execute_batch_sequential(self, group_id: int, group_name: str,
                                      devices: List[Dict], commands: List[str],
                                      shell: str = "cmd", stop_on_failure: bool = True) -> str:
        """
        Execute multiple commands sequentially on a group.
        All devices execute command 1, then all execute command 2, etc.
        
        Args:
            group_id: Group identifier
            group_name: Name of the group
            devices: List of device dictionaries
            commands: List of commands to execute
            shell: Shell type
            stop_on_failure: Stop if any command fails
        
        Returns:
            batch_id: Unique identifier for this batch execution
        """
        if not devices:
            raise ValueError("No devices in group")
        
        if not commands:
            raise ValueError("No commands provided")
        
        # Create batch tracker
        batch = GroupBatchExecution(group_id, group_name, commands, shell, stop_on_failure)
        self.active_batches[batch.batch_id] = batch
        
        # Start batch execution in background
        asyncio.create_task(self._execute_batch_commands(batch, devices))
        
        return batch.batch_id
    
    async def _execute_batch_commands(self, batch: GroupBatchExecution, devices: List[Dict]):
        """Execute batch commands sequentially"""
        logger.info(f"=== _execute_batch_commands STARTED ===")
        logger.info(f"Batch ID: {batch.batch_id}")
        logger.info(f"Group: {batch.group_name}")
        logger.info(f"Number of commands: {len(batch.commands)}")
        logger.info(f"Number of devices: {len(devices)}")
        logger.info(f"Stop on failure: {batch.stop_on_failure}")
        
        try:
            batch.status = GroupCommandStatus.RUNNING
            batch.started_at = datetime.now()
            
            logger.info(f"Starting batch execution {batch.batch_id} for group {batch.group_name} with {len(batch.commands)} commands")
            logger.info(f"Commands to execute: {batch.commands}")
            
            for idx, command in enumerate(batch.commands):
                logger.info(f"[BATCH {batch.batch_id}] Starting command {idx+1}/{len(batch.commands)}: {command}")
                batch.current_command_index = idx
                
                logger.info(f"[BATCH {batch.batch_id}] Executing command {idx+1}/{len(batch.commands)}: {command}")
                
                # Execute this command on all devices
                logger.info(f"[BATCH {batch.batch_id}] Executing command {idx+1} on {len(devices)} devices")
                execution_id = await self.execute_group_command(
                    batch.group_id,
                    batch.group_name,
                    devices,
                    command,
                    batch.shell,
                    "transactional"
                )
                
<<<<<<< HEAD
                logger.info(f"[BATCH {batch.batch_id}] Command {idx+1} execution_id: {execution_id}")
=======
                logger.info(f"[BATCH {batch.batch_id}] Command {idx+1} execution ID: {execution_id}")
                
                # Give a moment for execution to be registered
                await asyncio.sleep(0.5)
>>>>>>> b7da72f24f9ac79f4438bbc8c6d23c5a4095208e
                
                # Wait for this command to complete on all devices
                execution = self.active_executions.get(execution_id)
                logger.info(f"[BATCH {batch.batch_id}] Retrieved execution object: {execution is not None}")
                logger.info(f"[BATCH {batch.batch_id}] Active executions: {list(self.active_executions.keys())}")
                
                if execution:
                    batch.command_executions.append(execution)
                    
                    # Wait for completion (with timeout)
                    timeout = 300  # 5 minutes per command
                    start_time = datetime.now()
                    
<<<<<<< HEAD
                    logger.info(f"[BATCH {batch.batch_id}] Waiting for command {idx+1} to complete (status: {execution.status})...")
                    
                    # Wait while status is PENDING or RUNNING
=======
                    logger.info(f"[BATCH {batch.batch_id}] Waiting for command {idx+1} to complete on all devices...")
                    logger.info(f"[BATCH {batch.batch_id}] Initial execution status: {execution.status}")
                    logger.info(f"[BATCH {batch.batch_id}] Execution has {len(execution.device_results)} devices")
                    
                    # Wait until execution is no longer running (could be COMPLETED, FAILED, or PARTIAL_SUCCESS)
>>>>>>> b7da72f24f9ac79f4438bbc8c6d23c5a4095208e
                    while execution.status in [GroupCommandStatus.PENDING, GroupCommandStatus.RUNNING]:
                        await asyncio.sleep(1)
                        
                        # Log progress every 5 seconds
                        elapsed = (datetime.now() - start_time).total_seconds()
                        if int(elapsed) % 5 == 0:
                            completed = sum(1 for r in execution.device_results.values() 
                                          if r.status in [GroupCommandStatus.COMPLETED, GroupCommandStatus.FAILED])
                            logger.info(f"[BATCH {batch.batch_id}] Command {idx+1} progress: {completed}/{len(execution.device_results)} devices completed")
                        
                        # Check timeout
                        if elapsed > timeout:
<<<<<<< HEAD
                            logger.warning(f"[BATCH {batch.batch_id}] Command {idx+1} timed out")
                            break
                    
                    logger.info(f"[BATCH {batch.batch_id}] Command {idx+1} completed with status: {execution.status}")
                    
                    # Only stop if ALL devices failed (complete failure), not partial success
                    if batch.stop_on_failure and execution.status == GroupCommandStatus.FAILED:
                        logger.warning(f"[BATCH {batch.batch_id}] Stopping - all devices failed on command {idx+1}")
=======
                            logger.warning(f"[BATCH {batch.batch_id}] Command {idx+1} timed out after {timeout}s")
                            break
                    
                    logger.info(f"[BATCH {batch.batch_id}] Command {idx+1} completed with status: {execution.status}")
                    logger.info(f"[BATCH {batch.batch_id}] Command {idx+1} device results: {[(k, v.status) for k, v in execution.device_results.items()]}")
                    
                    # Check if we should stop on failure
                    # Only stop on FAILED (all devices failed), not PARTIAL_SUCCESS
                    if batch.stop_on_failure and execution.status == GroupCommandStatus.FAILED:
                        logger.warning(f"[BATCH {batch.batch_id}] Stopping due to complete failure on command {idx+1}")
                        logger.warning(f"[BATCH {batch.batch_id}] Failed devices: {[k for k, v in execution.device_results.items() if v.status == GroupCommandStatus.FAILED]}")
>>>>>>> b7da72f24f9ac79f4438bbc8c6d23c5a4095208e
                        batch.status = GroupCommandStatus.FAILED
                        break
                    elif execution.status == GroupCommandStatus.PARTIAL_SUCCESS:
                        logger.warning(f"[BATCH {batch.batch_id}] Command {idx+1} had partial success, continuing with next command")
<<<<<<< HEAD
                        failed_devices = [k for k, v in execution.device_results.items() if v.status == GroupCommandStatus.FAILED]
                        logger.warning(f"[BATCH {batch.batch_id}] Failed devices: {failed_devices}")
                else:
                    logger.error(f"[BATCH {batch.batch_id}] Could not find execution {execution_id}")
                    batch.status = GroupCommandStatus.FAILED
                    break
=======
                        logger.warning(f"[BATCH {batch.batch_id}] Failed devices: {[k for k, v in execution.device_results.items() if v.status == GroupCommandStatus.FAILED]}")
                else:
                    logger.error(f"[BATCH {batch.batch_id}] Could not find execution {execution_id} for command {idx+1}")
                    logger.error(f"[BATCH {batch.batch_id}] This is a critical error - stopping batch")
                    batch.status = GroupCommandStatus.FAILED
                    break
                
                # Log that we're continuing to next command
                if idx < len(batch.commands) - 1:
                    logger.info(f"[BATCH {batch.batch_id}] Moving to next command ({idx+2}/{len(batch.commands)})")
>>>>>>> b7da72f24f9ac79f4438bbc8c6d23c5a4095208e
            
            # All commands completed
            if batch.status == GroupCommandStatus.RUNNING:
                batch.status = GroupCommandStatus.COMPLETED
                logger.info(f"[BATCH {batch.batch_id}] All commands completed successfully")
            
            batch.completed_at = datetime.now()
            logger.info(f"Batch execution {batch.batch_id} completed with status: {batch.status}")
            logger.info(f"=== _execute_batch_commands FINISHED ===")
            
        except Exception as e:
            logger.error(f"Error in batch execution {batch.batch_id}: {e}")
            logger.error(f"Exception type: {type(e).__name__}")
            logger.error(f"Exception details: {str(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            batch.status = GroupCommandStatus.FAILED
            batch.completed_at = datetime.now()
            logger.info(f"=== _execute_batch_commands FINISHED (with error) ===")
    
    def get_execution_status(self, execution_id: str) -> Optional[Dict]:
        """Get status of a group command execution"""
        execution = self.active_executions.get(execution_id)
        if execution:
            return execution.to_dict()
        return None
    
    def get_batch_status(self, batch_id: str) -> Optional[Dict]:
        """Get status of a batch execution"""
        batch = self.active_batches.get(batch_id)
        if batch:
            return batch.to_dict()
        return None
    
    def get_all_active_executions(self) -> Dict[str, Dict]:
        """Get all active group executions"""
        return {
            exec_id: execution.to_dict() 
            for exec_id, execution in self.active_executions.items()
        }
    
    def get_all_active_batches(self) -> Dict[str, Dict]:
        """Get all active batch executions"""
        return {
            batch_id: batch.to_dict()
            for batch_id, batch in self.active_batches.items()
        }
    
    def cleanup_completed_execution(self, execution_id: str) -> bool:
        """Remove a completed execution from active tracking"""
        if execution_id in self.active_executions:
            execution = self.active_executions[execution_id]
            if execution.status in [GroupCommandStatus.COMPLETED, GroupCommandStatus.FAILED, GroupCommandStatus.PARTIAL_SUCCESS]:
                del self.active_executions[execution_id]
                logger.info(f"Cleaned up execution {execution_id}")
                return True
        return False
    
    def cleanup_completed_batch(self, batch_id: str) -> bool:
        """Remove a completed batch from active tracking"""
        if batch_id in self.active_batches:
            batch = self.active_batches[batch_id]
            if batch.status in [GroupCommandStatus.COMPLETED, GroupCommandStatus.FAILED, GroupCommandStatus.PARTIAL_SUCCESS]:
                del self.active_batches[batch_id]
                logger.info(f"Cleaned up batch {batch_id}")
                return True
        return False


# Global group command executor instance
group_command_executor = GroupCommandExecutor()
