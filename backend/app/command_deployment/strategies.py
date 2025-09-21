"""
Deployment strategy implementations for command execution rollback capabilities.
"""
from typing import Dict, Protocol
import logging

logger = logging.getLogger(__name__)

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
        
        # Generate rollback command based on the original command
        rollback_command = self._generate_rollback_command(original_command)
        
        if rollback_command:
            return rollback_command
        else:
            return "# No automatic rollback available for this command"
    
    def _generate_rollback_command(self, original_command: str) -> str:
        """Generate a rollback command for the given original command."""
        cmd = original_command.strip().lower()
        
        # Directory operations
        if cmd.startswith('mkdir '):
            dir_name = original_command[6:].strip()
            return f"rmdir /s /q {dir_name}" if dir_name else "# Invalid directory name"
        elif cmd.startswith('rmdir ') or cmd.startswith('rd '):
            return "# Cannot rollback directory deletion - backup required for restoration"
        
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
            return "# Cannot rollback file deletion - file was removed (restore from backup)"
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
        """Restore from snapshot or generate rollback command."""
        logger.info("Rolling back to snapshot")
        original_command = config.get('original_command', '')
        
        # For snapshot deployments, we might want to restore from snapshot
        # but also provide the command-level rollback as backup
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

class HybridDeploymentStrategy:
    """Hybrid strategy selector that chooses appropriate deployment method."""
    
    def __init__(self):
        self.strategies = {
            "transactional": TransactionalDeployment(),
            "blue_green": BlueGreenDeployment(),
            "snapshot": SnapshotDeployment(),
            "canary": CanaryDeployment(),
        }

    def choose_strategy(self, deployment_type: str, risk_level: str, size: str) -> str:
        """Choose deployment strategy based on configuration parameters."""
        if deployment_type == "file_update" and size == "small":
            return "transactional"
        elif deployment_type == "service_deployment" and risk_level == "low":
            return "blue_green"
        elif deployment_type == "system_update" and risk_level == "high":
            return "canary"
        elif deployment_type == "critical_system" or size == "large":
            return "snapshot"
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