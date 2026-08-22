"""
Deployment strategies for command deployment.

Implements blue-green, canary and sequential batch deployment flows on top of
the shared command queue + Socket.IO command executor.
"""
import asyncio
import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List

logger = logging.getLogger(__name__)


@dataclass
class BatchExecutionResult:
    """Result of a sequential batch execution."""
    batch_id: str
    overall_status: str = "completed"
    commands: List[str] = field(default_factory=list)
    successful_commands: int = 0
    failed_commands: int = 0
    started_at: str = ""
    completed_at: str = ""

    def get_progress_summary(self) -> str:
        total = len(self.commands)
        done = self.successful_commands + self.failed_commands
        return f"{done}/{total} commands executed"


class BaseStrategy:
    """Base strategy class with minimal deploy functionality."""

    def deploy(self, config: Dict) -> str:
        """Deploy with basic execution."""
        return "Deployment initiated"


class BatchDeploymentStrategy(BaseStrategy):
    """Executes batches of commands sequentially against a single agent."""

    def __init__(self):
        self.active_batches: Dict[str, dict] = {}

    async def execute_batch_sequential(self, commands: List[str], agent_id: str,
                                       shell: str = "cmd", stop_on_failure: bool = True,
                                       callback=None) -> BatchExecutionResult:
        """Enqueue and execute commands one at a time, waiting for each to finish."""
        from .executor import command_executor
        from .queue import command_queue, CommandStatus

        batch_id = str(uuid.uuid4())
        result = BatchExecutionResult(
            batch_id=batch_id,
            commands=list(commands),
            started_at=datetime.utcnow().isoformat(),
        )
        self.active_batches[batch_id] = {
            "batch_id": batch_id,
            "agent_id": agent_id,
            "status": "running",
            "result": result,
        }
        logger.info(f"Executing batch {batch_id} with {len(commands)} commands for agent {agent_id}")

        for index, command in enumerate(commands):
            cmd_id = command_queue.add_command(
                command=command,
                agent_id=agent_id,
                shell=shell,
                strategy="batch",
                config={"batch_id": batch_id, "batch_index": index},
            )
            completion_event = command_executor.register_completion_event(cmd_id)

            sent = await command_executor.execute_command(cmd_id)
            if not sent:
                result.failed_commands += 1
                logger.error(f"Batch {batch_id}: failed to dispatch command {index + 1}: {command}")
                if stop_on_failure:
                    result.overall_status = "failed"
                    break
                continue

            try:
                await asyncio.wait_for(completion_event.wait(), timeout=1800)
            except asyncio.TimeoutError:
                logger.error(f"Batch {batch_id}: command {index + 1} timed out")
                result.failed_commands += 1
                command_queue.update_command_status(cmd_id, CommandStatus.FAILED, error="Batch timeout")
                if stop_on_failure:
                    result.overall_status = "failed"
                    break
                continue

            cmd = command_queue.get_command(cmd_id)
            if cmd and cmd.status == CommandStatus.COMPLETED:
                result.successful_commands += 1
            else:
                result.failed_commands += 1
                if stop_on_failure:
                    result.overall_status = "failed"
                    break

            if callback:
                await callback(result)

        if result.overall_status != "failed" or (result.successful_commands + result.failed_commands) == len(commands):
            if result.failed_commands == 0:
                result.overall_status = "completed"
            elif result.successful_commands == 0:
                result.overall_status = "failed"
            else:
                result.overall_status = "partial_success"
        result.completed_at = datetime.utcnow().isoformat()

        self.active_batches[batch_id]["status"] = result.overall_status
        logger.info(f"Sequential batch {batch_id} completed with status: {result.overall_status}")
        return result

    def get_batch_status(self, batch_id: str):
        """Get batch status."""
        return self.active_batches.get(batch_id)

    def get_all_active_batches(self):
        """Get all active batches."""
        return self.active_batches


class BlueGreenStrategy(BaseStrategy):
    """Minimal blue-green strategy tracking the active environment."""

    def __init__(self):
        self.current_environment = "blue"

    def get_current_environment(self):
        """Get currently active environment."""
        return self.current_environment

    def switch_environment(self, target: str):
        """Switch environment stub."""
        return True, f"Switched to {target}"

    def deploy_gradual(self, config: Dict, percentage: int = 50):
        """Gradual deployment stub."""
        return f"Gradual deployment to {percentage}%"

    def get_deployment_status(self) -> Dict[str, Any]:
        """Return current blue-green deployment state."""
        return {
            "strategy": "blue_green",
            "current_environment": self.current_environment,
            "idle_environment": "green" if self.current_environment == "blue" else "blue",
        }

    def complete_gradual_deployment(self, config: Dict[str, Any]) -> str:
        """Finalize a gradual deployment by switching to the target environment."""
        target = config.get("target_environment") or ("green" if self.current_environment == "blue" else "blue")
        switched, message = self.switch_environment(target)
        if not switched:
            raise RuntimeError(message)
        return message


class CanaryStrategy(BaseStrategy):
    """Minimal canary strategy tracking canary deployments in memory."""

    def __init__(self):
        self.canaries: Dict[str, Dict[str, Any]] = {}

    def start_canary(self, config: Dict, percentage: int = 10):
        """Start a canary deployment."""
        canary_id = str(uuid.uuid4())
        self.canaries[canary_id] = {
            "canary_id": canary_id,
            "percentage": percentage,
            "status": "running",
            "started_at": datetime.utcnow().isoformat(),
            "config": config,
        }
        return canary_id, f"Canary {canary_id} started at {percentage}%"

    def promote_canary(self, canary_id: str):
        """Promote a running canary to full deployment."""
        canary = self.canaries.get(canary_id)
        if not canary:
            return False, f"Canary {canary_id} not found"
        if canary["status"] != "running":
            return False, f"Canary {canary_id} is not running (status: {canary['status']})"
        canary["status"] = "promoted"
        canary["percentage"] = 100
        return True, f"Canary {canary_id} promoted to full deployment"

    def abort_canary(self, canary_id: str):
        """Abort a running canary."""
        canary = self.canaries.get(canary_id)
        if not canary:
            return False, f"Canary {canary_id} not found"
        canary["status"] = "aborted"
        return True, f"Canary {canary_id} aborted"

    def get_canary_status(self, canary_id: str = None):
        """Status of one canary, or all canaries when no ID is given."""
        if canary_id is not None:
            canary = self.canaries.get(canary_id)
            if not canary:
                return {"error": f"Canary {canary_id} not found"}
            return canary
        return {"canaries": list(self.canaries.values())}


class HybridDeploymentStrategy:
    """Hybrid strategy selector without rollback functionality."""

    def __init__(self):
        self.strategies = {
            "transactional": BaseStrategy(),
            "blue_green": BlueGreenStrategy(),
            "canary": CanaryStrategy(),
            "batch": BatchDeploymentStrategy(),
        }

    def get_available_strategies(self) -> List[str]:
        """Return list of available deployment strategies."""
        return list(self.strategies.keys())

    def get_batch_strategy(self) -> BatchDeploymentStrategy:
        """Get the batch deployment strategy instance."""
        return self.strategies["batch"]

    def choose_strategy_for_command(self, command: str) -> str:
        """Choose the best strategy based on command analysis."""
        cmd = command.strip().lower()

        # Service operations benefit from blue-green
        service_patterns = [
            "systemctl", "service", "sc start", "sc stop", "net start", "net stop"
        ]

        for pattern in service_patterns:
            if pattern in cmd:
                return "blue_green"

        # Default to transactional
        return "transactional"

    def deploy(self, config: Dict) -> str:
        """Deploy using chosen strategy."""
        strategy_name = config.get("strategy", "transactional")
        strategy = self.strategies.get(strategy_name, self.strategies["transactional"])
        return strategy.deploy(config)
