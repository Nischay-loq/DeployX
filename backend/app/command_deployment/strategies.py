"""
Deployment strategy implementations for command execution rollback capabilities.
"""
from typing import Dict, Protocol, List, Optional
import logging
import asyncio
from datetime import datetime
from enum import Enum

logger = logging.getLogger(__name__)

class BatchCommandStatus(str, Enum):
    """Status for individual commands in a batch."""
    PENDING = "⏳ pending"
    RUNNING = "🔄 running"
    COMPLETED = "✅ completed"
    FAILED = "❌ failed"
    SKIPPED = "⏭️ skipped"

class BatchExecutionResult:
    """Result of batch execution with detailed status tracking."""
    def __init__(self):
        self.batch_id: str = ""
        self.commands: List[Dict] = []
        self.current_command_index: int = 0
        self.overall_status: str = "pending"
        self.started_at: Optional[str] = None
        self.completed_at: Optional[str] = None
        self.total_commands: int = 0
        self.successful_commands: int = 0
        self.failed_commands: int = 0
        self.execution_log: List[str] = []
    
    def add_command(self, command: str, cmd_id: str):
        """Add a command to the batch tracking."""
        self.commands.append({
            "command": command,
            "cmd_id": cmd_id,
            "status": BatchCommandStatus.PENDING,
            "output": "",
            "error": "",
            "started_at": None,
            "completed_at": None,
            "execution_time": 0
        })
        self.total_commands += 1
    
    def update_command_status(self, cmd_index: int, status: BatchCommandStatus, 
                            output: str = "", error: str = ""):
        """Update status of a specific command in the batch."""
        if 0 <= cmd_index < len(self.commands):
            cmd = self.commands[cmd_index]
            old_status = cmd["status"]
            cmd["status"] = status
            
            if output:
                cmd["output"] += output
            if error:
                cmd["error"] = error
            
            now = datetime.now().isoformat()
            if status == BatchCommandStatus.RUNNING and old_status == BatchCommandStatus.PENDING:
                cmd["started_at"] = now
                self.execution_log.append(f"[{now}] Started command {cmd_index + 1}: {cmd['command']}")
            elif status in [BatchCommandStatus.COMPLETED, BatchCommandStatus.FAILED, BatchCommandStatus.SKIPPED]:
                cmd["completed_at"] = now
                if cmd["started_at"]:
                    start_time = datetime.fromisoformat(cmd["started_at"])
                    end_time = datetime.fromisoformat(now)
                    cmd["execution_time"] = (end_time - start_time).total_seconds()
                
                if status == BatchCommandStatus.COMPLETED:
                    self.successful_commands += 1
                    self.execution_log.append(f"[{now}] ✅ Completed command {cmd_index + 1}")
                elif status == BatchCommandStatus.FAILED:
                    self.failed_commands += 1
                    self.execution_log.append(f"[{now}] ❌ Failed command {cmd_index + 1}: {error}")
                elif status == BatchCommandStatus.SKIPPED:
                    self.execution_log.append(f"[{now}] ⏭️ Skipped command {cmd_index + 1}")
    
    def get_progress_summary(self) -> str:
        """Get a visual progress summary of the batch execution."""
        progress_icons = []
        for cmd in self.commands:
            if cmd["status"] == BatchCommandStatus.PENDING:
                progress_icons.append("⏳")
            elif cmd["status"] == BatchCommandStatus.RUNNING:
                progress_icons.append("🔄")
            elif cmd["status"] == BatchCommandStatus.COMPLETED:
                progress_icons.append("✅")
            elif cmd["status"] == BatchCommandStatus.FAILED:
                progress_icons.append("❌")
            elif cmd["status"] == BatchCommandStatus.SKIPPED:
                progress_icons.append("⏭️")
        
        progress_bar = "".join(progress_icons)
        percentage = ((self.successful_commands + self.failed_commands) / self.total_commands * 100) if self.total_commands > 0 else 0
        
        return f"{progress_bar} ({self.successful_commands + self.failed_commands}/{self.total_commands}) {percentage:.1f}% complete"
    
    def get_detailed_status(self) -> Dict:
        """Get detailed status information for the batch."""
        return {
            "batch_id": self.batch_id,
            "overall_status": self.overall_status,
            "progress": self.get_progress_summary(),
            "total_commands": self.total_commands,
            "successful_commands": self.successful_commands,
            "failed_commands": self.failed_commands,
            "current_command_index": self.current_command_index,
            "started_at": self.started_at,
            "completed_at": self.completed_at,
            "commands": self.commands,
            "execution_log": self.execution_log
        }

# Common interface
class DeploymentStrategy(Protocol):
    """Protocol for deployment strategies with deploy and rollback capabilities."""
    def deploy(self, config: Dict) -> str: ...
    def rollback(self, config: Dict) -> str: ...

class TransactionalDeployment(DeploymentStrategy):
    """Transactional deployment strategy using package manager transactions."""
    
    def deploy(self, config: Dict) -> str:
        """Execute deployment using package manager transaction."""
        logger.info("Executing transactional deployment")
        # Implementation would run package manager transaction
        # For example: dnf transaction or apt-get with transaction support
        return "Transactional deployment complete"
    
    def rollback(self, config: Dict) -> str:
        """Rollback using package manager history or reverse command."""
        logger.info("Rolling back transactional deployment")
        original_command = config.get('original_command', '')
        
        # For transactional strategy, we need more sophisticated rollback
        rollback_command = self._generate_transactional_rollback(original_command, config)
        
        if rollback_command:
            return rollback_command
        else:
            return "# No automatic rollback available for this command"
    
    def _generate_transactional_rollback(self, original_command: str, config: Dict) -> str:
        """Generate a transactional rollback command that considers data preservation."""
        cmd = original_command.strip().lower()
        
        # For rmdir commands with /s flag (recursive delete), we need special handling
        if (cmd.startswith('rmdir ') and ('/s' in cmd or '/S' in cmd)) or cmd.startswith('rd '):
            # Extract directory name
            if cmd.startswith('rmdir '):
                dir_name = original_command[6:].strip()
                # Remove flags but preserve original casing
                for flag in ['/s', '/q', '/S', '/Q']:
                    dir_name = dir_name.replace(flag, '').strip()
            else:  # rd command
                dir_name = original_command[3:].strip()
                for flag in ['/s', '/q', '/S', '/Q']:
                    dir_name = dir_name.replace(flag, '').strip()
            
            if dir_name:
                # For transactional rollback, we should warn about data loss
                return f"# TRANSACTIONAL ROLLBACK LIMITATION: '{original_command}' deleted directory '{dir_name}' with all contents. Only empty directory can be recreated. To enable full rollback, use snapshot strategy for destructive operations. Recreating empty directory: mkdir {dir_name}"
            else:
                return "# Cannot determine directory name for transactional rollback"
        
        # For other commands, use the standard rollback logic
        return self._generate_rollback_command(original_command)
    
    def _generate_rollback_command(self, original_command: str) -> str:
        """Generate a rollback command for the given original command."""
        cmd = original_command.strip().lower()
        
        # Directory operations
        if cmd.startswith('mkdir '):
            dir_name = original_command[6:].strip()
            return f"rmdir /s /q {dir_name}" if dir_name else "# Invalid directory name"
        elif cmd.startswith('rmdir ') or cmd.startswith('rd '):
            # Extract directory name from rmdir command
            if cmd.startswith('rmdir '):
                dir_name = original_command[6:].strip()
                # Remove common flags
                dir_name = dir_name.replace('/s', '').replace('/q', '').replace('/S', '').replace('/Q', '').strip()
            else:  # rd command
                dir_name = original_command[3:].strip()
                dir_name = dir_name.replace('/s', '').replace('/q', '').replace('/S', '').replace('/Q', '').strip()
            
            if dir_name:
                # Create the directory back (though it will be empty)
                return f"mkdir {dir_name}"
            else:
                return "# Cannot determine directory name for rollback"
        
        # File operations  
        elif cmd.startswith('touch '):
            filename = original_command[6:].strip()
            return f"del {filename}" if filename else "# Invalid filename"
        elif cmd.startswith('echo ') and ' > ' in cmd:
            # Extract filename after > 
            if ' > ' in original_command:
                filename = original_command.split(' > ')[1].strip()
                return f"del {filename}" if filename else "# Cannot determine file to rollback"
            return "# Cannot determine file to rollback"
        elif cmd.startswith('del ') or cmd.startswith('rm '):
            # For file deletion, we can't restore the file, but we can tell what was deleted
            if cmd.startswith('del '):
                filename = original_command[4:].strip()
            else:  # rm command
                filename = original_command[3:].strip()
                # Remove common flags like -f, -rf, etc.
                filename = filename.replace('-f', '').replace('-rf', '').replace('-r', '').strip()
            
            if filename:
                return f"# Cannot restore deleted file '{filename}' - restore from backup if needed"
            else:
                return "# Cannot rollback file deletion - restore from backup required"
        elif cmd.startswith('copy ') or cmd.startswith('cp '):
            parts = original_command.split()
            if len(parts) >= 3:
                dest = parts[-1]  # Last argument is usually destination
                return f"del {dest}"
            return "# Cannot determine destination file to rollback copy operation"
        elif cmd.startswith('move ') or cmd.startswith('mv '):
            # Try to reverse move operation
            parts = original_command.split()
            if len(parts) >= 3:
                source = parts[1]
                dest = parts[2]
                return f"move {dest} {source}"
            return "# Cannot determine source/destination for move rollback"
        
        # Service operations
        elif 'systemctl start' in cmd or 'sc start' in cmd or 'net start' in cmd:
            if 'systemctl start' in cmd:
                service_name = cmd.split('systemctl start')[1].strip()
                return f"systemctl stop {service_name}" if service_name else "# Invalid service name"
            elif 'sc start' in cmd:
                service_name = cmd.split('sc start')[1].strip()
                return f"sc stop {service_name}" if service_name else "# Invalid service name"
            elif 'net start' in cmd:
                service_name = cmd.split('net start')[1].strip()
                return f"net stop {service_name}" if service_name else "# Invalid service name"
        elif 'systemctl stop' in cmd or 'sc stop' in cmd or 'net stop' in cmd:
            if 'systemctl stop' in cmd:
                service_name = cmd.split('systemctl stop')[1].strip()
                return f"systemctl start {service_name}" if service_name else "# Invalid service name"
            elif 'sc stop' in cmd:
                service_name = cmd.split('sc stop')[1].strip()
                return f"sc start {service_name}" if service_name else "# Invalid service name"
            elif 'net stop' in cmd:
                service_name = cmd.split('net stop')[1].strip()
                return f"net start {service_name}" if service_name else "# Invalid service name"
        
        # Package operations (Linux)
        elif cmd.startswith('apt install ') or cmd.startswith('yum install ') or cmd.startswith('dnf install '):
            parts = original_command.split()
            package_manager = parts[0]
            packages = ' '.join(parts[2:])  # Skip 'install'
            return f"{package_manager} remove {packages}" if packages else "# No packages specified"
        elif cmd.startswith('apt remove ') or cmd.startswith('yum remove ') or cmd.startswith('dnf remove '):
            return "# Cannot rollback package removal - would require reinstallation with specific versions"
        
        # Windows package operations
        elif cmd.startswith('choco install '):
            packages = cmd.replace('choco install ', '').strip()
            return f"choco uninstall {packages}" if packages else "# No packages specified"
        elif cmd.startswith('choco uninstall '):
            return "# Cannot rollback package uninstallation - would require reinstallation"
        elif cmd.startswith('winget install '):
            packages = cmd.replace('winget install ', '').strip()
            return f"winget uninstall {packages}" if packages else "# No packages specified"
        
        # Registry operations (Windows)
        elif cmd.startswith('reg add '):
            # Extract registry key for deletion
            if '/v ' in cmd:
                key_part = cmd.split('/v ')[0].replace('reg add ', '').strip()
                value_part = cmd.split('/v ')[1].split()[0]
                return f"reg delete {key_part} /v {value_part} /f"
            else:
                key_part = cmd.replace('reg add ', '').split()[0]
                return f"reg delete {key_part} /f"
        elif cmd.startswith('reg delete '):
            return "# Cannot rollback registry deletion - backup required for restoration"
        
        # Configuration file changes
        elif 'sed -i' in cmd or 'awk' in cmd:
            return "# Manual rollback required for configuration file changes - restore from backup"
        
        # Git operations
        elif cmd.startswith('git clone '):
            # Extract repository directory name
            if ' ' in cmd:
                repo_url = cmd.split()[-1]
                if '/' in repo_url:
                    repo_name = repo_url.split('/')[-1].replace('.git', '')
                    return f"rmdir /s /q {repo_name}"
            return "# Cannot determine repository directory for rollback"
        elif cmd.startswith('git pull') or cmd.startswith('git fetch'):
            return "git reset --hard HEAD~1  # Warning: This may lose commits"
        elif cmd.startswith('git commit'):
            return "git reset --soft HEAD~1  # Undoes the commit but keeps changes"
        elif cmd.startswith('git push'):
            return "# Cannot automatically rollback git push - requires manual revert"
        
        # Database operations (basic examples)
        elif 'create database' in cmd.lower():
            db_name = None
            if 'create database ' in cmd:
                db_name = cmd.split('create database ')[1].split()[0]
            return f"drop database {db_name};" if db_name else "# Cannot determine database name"
        elif 'drop database' in cmd.lower():
            return "# Cannot rollback database drop - restore from backup required"
        
        # Default case
        return "# No automatic rollback available for this command type"

class BlueGreenDeployment(DeploymentStrategy):
    """Blue-Green deployment strategy for zero-downtime deployments."""
    
    def deploy(self, config: Dict) -> str:
        """Deploy to green environment and switch traffic."""
        logger.info("Executing Blue-Green deployment")
        # Implementation would:
        # 1. Deploy to green environment
        # 2. Test green environment
        # 3. Switch traffic from blue to green
        return "Blue-Green deployment complete"
    
    def rollback(self, config: Dict) -> str:
        """Switch traffic back to blue environment or generate rollback command."""
        logger.info("Rolling back Blue-Green deployment")
        original_command = config.get('original_command', '')
        
        # For Blue-Green, we might want to use the same rollback logic as transactional
        # but with additional traffic switching considerations
        rollback_command = TransactionalDeployment()._generate_rollback_command(original_command)
        
        if rollback_command and not rollback_command.startswith('#'):
            return f"{rollback_command} # Blue-Green rollback"
        else:
            return "# Blue-Green rollback: switch traffic back to previous version"

class SnapshotDeployment(DeploymentStrategy):
    """Snapshot-based deployment strategy for critical system changes."""
    
    def deploy(self, config: Dict) -> str:
        """Take system snapshot before deployment."""
        logger.info("Executing snapshot deployment")
        # Implementation would:
        # 1. Take system snapshot (filesystem, containers, VMs)
        # 2. Execute deployment
        return "Snapshot taken + deployment complete"
    
    def rollback(self, config: Dict) -> str:
        """Restore from snapshot or generate comprehensive rollback command."""
        logger.info("Rolling back to snapshot")
        original_command = config.get('original_command', '')
        cmd = original_command.strip().lower()
        
        # For snapshot deployments, provide comprehensive rollback for destructive operations
        if (cmd.startswith('rmdir ') and ('/s' in cmd or '/S' in cmd)) or cmd.startswith('rd '):
            # Extract directory name
            if cmd.startswith('rmdir '):
                dir_name = original_command[6:].strip()
                for flag in ['/s', '/q', '/S', '/Q']:
                    dir_name = dir_name.replace(flag, '').strip()
            else:
                dir_name = original_command[3:].strip()
                for flag in ['/s', '/q', '/S', '/Q']:
                    dir_name = dir_name.replace(flag, '').strip()
            
            if dir_name:
                return f"# SNAPSHOT ROLLBACK: Restore '{dir_name}' from filesystem snapshot. Manual steps: 1) Locate snapshot containing '{dir_name}', 2) Restore directory with: 'robocopy <snapshot_path>\\{dir_name} {dir_name} /E /COPYALL', 3) Verify restored contents"
            else:
                return "# Cannot determine directory name for snapshot rollback"
        
        # For other commands, use standard logic with snapshot context
        rollback_command = TransactionalDeployment()._generate_rollback_command(original_command)
        
        if rollback_command and not rollback_command.startswith('#'):
            return f"{rollback_command} # Snapshot rollback"
        else:
            return "# Snapshot rollback: restore from system snapshot"

class CanaryDeployment(DeploymentStrategy):
    """Canary deployment strategy for gradual rollouts."""
    
    def deploy(self, config: Dict) -> str:
        """Deploy to small subset of infrastructure."""
        logger.info("Executing canary deployment")
        # Implementation would:
        # 1. Deploy to small percentage of servers
        # 2. Monitor metrics
        # 3. Gradually increase percentage
        return "Canary deployment running"
    
    def rollback(self, config: Dict) -> str:
        """Revert canary deployment, keep stable version."""
        logger.info("Rolling back canary deployment")
        original_command = config.get('original_command', '')
        
        # For canary deployments, rollback the canary but keep stable
        rollback_command = TransactionalDeployment()._generate_rollback_command(original_command)
        
        if rollback_command and not rollback_command.startswith('#'):
            return f"{rollback_command} # Canary rollback"
        else:
            return "# Canary rollback: revert canary deployment, stable version maintained"

class BatchDeploymentStrategy(DeploymentStrategy):
    """Sequential batch deployment strategy with reliable execution and status tracking."""
    
    def __init__(self):
        self.active_batches: Dict[str, BatchExecutionResult] = {}
        self.execution_callbacks = {}
    
    def deploy(self, config: Dict) -> str:
        """Deploy commands sequentially with proper status tracking."""
        logger.info("Executing batch deployment")
        return "Batch deployment initiated with sequential execution"
    
    def rollback(self, config: Dict) -> str:
        """Generate rollback for batch operations."""
        logger.info("Rolling back batch deployment")
        original_command = config.get('original_command', '')
        
        rollback_command = TransactionalDeployment()._generate_rollback_command(original_command)
        
        if rollback_command and not rollback_command.startswith('#'):
            return f"{rollback_command} # Batch rollback"
        else:
            return "# Batch rollback: review individual command rollbacks"
    
    async def execute_batch_sequential(self, commands: List[str], agent_id: str, 
                                     shell: str = "cmd", stop_on_failure: bool = True,
                                     callback=None) -> BatchExecutionResult:
        """
        Execute commands sequentially with proper status tracking using persistent shell session.
        
        Args:
            commands: List of commands to execute
            agent_id: Target agent ID
            shell: Shell type to use
            stop_on_failure: Whether to stop batch on first failure
            callback: Optional callback function for status updates
            
        Returns:
            BatchExecutionResult with detailed status information
        """
        from .executor import command_executor
        import uuid
        
        # Create batch tracking
        batch_result = BatchExecutionResult()
        batch_result.batch_id = str(uuid.uuid4())
        batch_result.started_at = datetime.now().isoformat()
        batch_result.overall_status = "running"
        
        self.active_batches[batch_result.batch_id] = batch_result
        
        logger.info(f"Starting persistent batch execution {batch_result.batch_id} with {len(commands)} commands")
        
        try:
            # Add all commands to tracking first
            for i, command in enumerate(commands):
                batch_result.add_command(command.strip(), f"batch_{batch_result.batch_id}_{i}")
                
            if callback:
                await callback(batch_result)
            
            # Check if agent is connected
            if not command_executor.conn_manager:
                logger.error("Connection manager not initialized")
                batch_result.overall_status = "error"
                batch_result.execution_log.append(f"[{datetime.now().isoformat()}] ❌ Connection manager not available")
                return batch_result
            
            agent_sid = command_executor.conn_manager.get_agent_sid(agent_id)
            if not agent_sid:
                logger.error(f"Agent {agent_id} not connected")
                batch_result.overall_status = "error"
                batch_result.execution_log.append(f"[{datetime.now().isoformat()}] ❌ Agent {agent_id} not connected")
                return batch_result
            
            # Use the new persistent batch execution via socket.io
            execution_completed = asyncio.Event()
            execution_result = {"success": False, "results": []}
            
            # Set up event listeners for batch execution feedback
            @command_executor.sio.on('batch_command_progress')
            async def handle_batch_progress(sid, data):
                if data.get('batch_id') == batch_result.batch_id:
                    command_index = data.get('command_index', 0)
                    if 0 <= command_index < len(batch_result.commands):
                        batch_result.update_command_status(command_index, BatchCommandStatus.RUNNING)
                        if callback:
                            await callback(batch_result)
            
            @command_executor.sio.on('batch_command_completed')
            async def handle_batch_command_completed(sid, data):
                if data.get('batch_id') == batch_result.batch_id:
                    command_index = data.get('command_index', 0)
                    success = data.get('success', False)
                    output = data.get('output', '')
                    error = data.get('error', '')
                    
                    if 0 <= command_index < len(batch_result.commands):
                        status = BatchCommandStatus.COMPLETED if success else BatchCommandStatus.FAILED
                        batch_result.update_command_status(command_index, status, output, error)
                        if callback:
                            await callback(batch_result)
            
            @command_executor.sio.on('batch_execution_completed')
            async def handle_batch_execution_completed(sid, data):
                if data.get('batch_id') == batch_result.batch_id:
                    execution_result["success"] = data.get('success', False)
                    execution_result["results"] = data.get('execution_results', [])
                    execution_result["total_commands"] = data.get('total_commands', 0)
                    execution_result["successful_commands"] = data.get('successful_commands', 0)
                    execution_result["failed_commands"] = data.get('failed_commands', 0)
                    execution_completed.set()
            
            # Send batch execution request to agent
            await command_executor.sio.emit('execute_batch_persistent', {
                'batch_id': batch_result.batch_id,
                'commands': commands,
                'shell': shell,
                'stop_on_failure': stop_on_failure
            }, room=agent_sid)
            
            logger.info(f"Sent persistent batch execution request {batch_result.batch_id} to agent {agent_id}")
            
            # Wait for batch completion with timeout
            try:
                await asyncio.wait_for(execution_completed.wait(), timeout=300)  # 5 minutes timeout
            except asyncio.TimeoutError:
                logger.error(f"Batch execution {batch_result.batch_id} timed out")
                batch_result.overall_status = "error"
                batch_result.execution_log.append(f"[{datetime.now().isoformat()}] ❌ Batch execution timed out")
                return batch_result
            
            # Update final batch status based on execution results
            if execution_result["success"]:
                batch_result.successful_commands = execution_result.get("successful_commands", 0)
                batch_result.failed_commands = execution_result.get("failed_commands", 0)
                batch_result.overall_status = "completed_successfully" if batch_result.failed_commands == 0 else "completed_with_failures"
            else:
                batch_result.overall_status = "completed_with_failures"
            
            batch_result.completed_at = datetime.now().isoformat()
            
            logger.info(f"Persistent batch {batch_result.batch_id} completed: {batch_result.successful_commands} successful, {batch_result.failed_commands} failed")
            
        except Exception as e:
            logger.error(f"Error in persistent batch execution {batch_result.batch_id}: {e}")
            batch_result.overall_status = "error"
            batch_result.execution_log.append(f"[{datetime.now().isoformat()}] ❌ Batch execution error: {str(e)}")
            batch_result.completed_at = datetime.now().isoformat()
        
        finally:
            if callback:
                await callback(batch_result)
        
        return batch_result
    
    def get_batch_status(self, batch_id: str) -> Optional[Dict]:
        """Get current status of a batch execution."""
        if batch_id in self.active_batches:
            return self.active_batches[batch_id].get_detailed_status()
        return None
    
    def get_all_active_batches(self) -> Dict[str, Dict]:
        """Get status of all active batches."""
        return {batch_id: batch.get_detailed_status() 
                for batch_id, batch in self.active_batches.items()}
    
    def cleanup_completed_batch(self, batch_id: str) -> bool:
        """Remove a completed batch from active tracking."""
        if batch_id in self.active_batches:
            batch = self.active_batches[batch_id]
            if batch.overall_status in ["completed_successfully", "completed_with_failures", "error"]:
                del self.active_batches[batch_id]
                return True
        return False

class HybridDeploymentStrategy:
    """Hybrid strategy selector that chooses appropriate deployment method."""
    
    def __init__(self):
        self.strategies = {
            "transactional": TransactionalDeployment(),
            "blue_green": BlueGreenDeployment(),
            "snapshot": SnapshotDeployment(),
            "canary": CanaryDeployment(),
            "batch": BatchDeploymentStrategy(),
        }

    def choose_strategy(self, deployment_type: str, risk_level: str, size: str) -> str:
        """Choose deployment strategy based on configuration parameters."""
        if deployment_type == "batch":
            return "batch"
        elif deployment_type == "file_update" and size == "small":
            return "transactional"
        elif deployment_type == "service_deployment" and risk_level == "low":
            return "blue_green"
        elif deployment_type == "system_update" and risk_level == "high":
            return "canary"
        elif deployment_type == "critical_system" or size == "large":
            return "snapshot"
        # For destructive operations like rmdir /s, recommend snapshot strategy
        elif deployment_type == "destructive_operation":
            return "snapshot"
        return "transactional"
    
    def choose_strategy_for_command(self, command: str) -> str:
        """Choose the best strategy based on command analysis."""
        cmd = command.strip().lower()
        
        # Detect destructive operations that need snapshot strategy
        destructive_patterns = [
            'rmdir /s', 'rmdir /S', 'rd /s', 'rd /S',  # Recursive directory deletion
            'del /s', 'rm -rf', 'rm -r',               # Recursive file deletion
            'format', 'fdisk',                         # Disk operations
            'drop database', 'truncate table',        # Database operations
            'git reset --hard', 'git clean -fd'       # Git destructive operations
        ]
        
        for pattern in destructive_patterns:
            if pattern in cmd:
                return "snapshot"
        
        # High-risk operations that benefit from blue-green
        service_patterns = [
            'systemctl', 'service', 'sc start', 'sc stop', 'net start', 'net stop'
        ]
        
        for pattern in service_patterns:
            if pattern in cmd:
                return "blue_green"
        
        # Default to transactional for simple operations
        return "transactional"

    def deploy(self, package_config: Dict) -> str:
        """Deploy using automatically chosen strategy."""
        strategy_name = self.choose_strategy(
            package_config.get('type', 'file_update'),
            package_config.get('risk_level', 'medium'),
            package_config.get('size', 'small')
        )
        strategy = self.strategies[strategy_name]
        logger.info(f"Using deployment strategy: {strategy_name}")
        return strategy.deploy(package_config)

    def rollback(self, package_config: Dict) -> str:
        """Rollback using the same strategy that was used for deployment."""
        strategy_name = self.choose_strategy(
            package_config.get('type', 'file_update'),
            package_config.get('risk_level', 'medium'),
            package_config.get('size', 'small')
        )
        strategy = self.strategies[strategy_name]
        logger.info(f"Rolling back using strategy: {strategy_name}")
        return strategy.rollback(package_config)

    def get_available_strategies(self) -> list:
        """Return list of available deployment strategies."""
        return list(self.strategies.keys())
    
    def get_batch_strategy(self) -> BatchDeploymentStrategy:
        """Get the batch deployment strategy instance."""
        return self.strategies["batch"]