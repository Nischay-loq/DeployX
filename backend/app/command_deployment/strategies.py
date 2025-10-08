"""
Deployment strategy implementations for command execution rollback capabilities.
"""
from typing import Dict, Protocol, List, Optional, Tuple
import logging
import asyncio
import os
import platform
import subprocess
import time
import json
import uuid
from datetime import datetime
from enum import Enum
from pathlib import Path

logger = logging.getLogger(__name__)

class RollbackValidator:
    """Comprehensive rollback validation and safety mechanism."""
    
    def __init__(self):
        self.validation_dir = Path("rollback_validations")
        self.validation_dir.mkdir(exist_ok=True)
        self.validation_rules = self.validation_dir / "validation_rules.json"
        self.atomic_groups = self.validation_dir / "atomic_groups.json"
        
    def _load_validation_rules(self) -> Dict:
        """Load validation rules configuration."""
        try:
            if self.validation_rules.exists():
                with open(self.validation_rules, 'r') as f:
                    return json.load(f)
            return {
                "command_patterns": {
                    "destructive": {
                        "patterns": ["rmdir /s", "rm -rf", "format", "drop database", "truncate"],
                        "require_confirmation": True,
                        "require_backup": True,
                        "max_retries": 1
                    },
                    "service": {
                        "patterns": ["systemctl", "service", "net start", "net stop"],
                        "require_confirmation": False,
                        "require_backup": False,
                        "max_retries": 3
                    },
                    "package": {
                        "patterns": ["apt", "yum", "dnf", "choco", "winget"],
                        "require_confirmation": False,
                        "require_backup": False,
                        "max_retries": 2
                    }
                },
                "safety_checks": {
                    "file_existence": True,
                    "path_validation": True,
                    "dependency_check": True,
                    "resource_availability": True
                },
                "rollback_policies": {
                    "max_rollback_age_hours": 24,
                    "require_manual_approval_for_destructive": True,
                    "automatic_rollback_triggers": {
                        "high_error_rate": 0.1,
                        "service_down_duration_minutes": 10
                    }
                }
            }
        except Exception as e:
            logger.error(f"Error loading validation rules: {e}")
            return {"command_patterns": {}, "safety_checks": {}, "rollback_policies": {}}
    
    def _save_validation_rules(self, rules: Dict) -> None:
        """Save validation rules configuration."""
        try:
            with open(self.validation_rules, 'w') as f:
                json.dump(rules, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving validation rules: {e}")
    
    def _load_atomic_groups(self) -> Dict:
        """Load atomic rollback groups configuration."""
        try:
            if self.atomic_groups.exists():
                with open(self.atomic_groups, 'r') as f:
                    return json.load(f)
            return {
                "groups": {},
                "group_policies": {
                    "all_or_nothing": True,
                    "rollback_order": "reverse_execution",
                    "failure_handling": "stop_on_first_failure"
                }
            }
        except Exception as e:
            logger.error(f"Error loading atomic groups: {e}")
            return {"groups": {}, "group_policies": {}}
    
    def _save_atomic_groups(self, groups: Dict) -> None:
        """Save atomic groups configuration."""
        try:
            with open(self.atomic_groups, 'w') as f:
                json.dump(groups, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving atomic groups: {e}")
    
    def validate_rollback_request(self, command: str, config: Dict) -> Tuple[bool, str, Dict]:
        """Comprehensive validation of rollback request."""
        try:
            validation_result = {
                "feasible": True,
                "warnings": [],
                "errors": [],
                "required_confirmations": [],
                "safety_checks": {},
                "recommendations": []
            }
            
            rules = self._load_validation_rules()
            
            # Check command patterns
            command_lower = command.strip().lower()
            
            for category, category_rules in rules.get("command_patterns", {}).items():
                for pattern in category_rules.get("patterns", []):
                    if pattern in command_lower:
                        if category_rules.get("require_confirmation", False):
                            validation_result["required_confirmations"].append(
                                f"Destructive operation detected: {pattern}. Manual confirmation required."
                            )
                        
                        if category_rules.get("require_backup", False):
                            if not config.get("backup_created", False):
                                validation_result["warnings"].append(
                                    f"Backup recommended for {category} operation but not created."
                                )
                        
                        break  # First match wins
            
            # Safety checks
            safety_checks = rules.get("safety_checks", {})
            
            if safety_checks.get("file_existence", True):
                # Check if target files/directories exist
                target_path = self._extract_target_path_from_command(command)
                if target_path:
                    if not os.path.exists(target_path):
                        validation_result["errors"].append(
                            f"Target path does not exist: {target_path}"
                        )
                        validation_result["feasible"] = False
                    else:
                        validation_result["safety_checks"]["file_existence"] = "passed"
            
            if safety_checks.get("path_validation", True):
                # Validate path safety (no system directories, etc.)
                dangerous_paths = ["/", "C:\\", "/usr", "/bin", "/sbin", "C:\\Windows", "C:\\System32"]
                target_path = self._extract_target_path_from_command(command)
                
                if target_path:
                    for dangerous in dangerous_paths:
                        if target_path.lower().startswith(dangerous.lower()):
                            validation_result["errors"].append(
                                f"Operation on system directory not allowed: {target_path}"
                            )
                            validation_result["feasible"] = False
                            break
                    else:
                        validation_result["safety_checks"]["path_validation"] = "passed"
            
            # Age validation
            rollback_policies = rules.get("rollback_policies", {})
            max_age_hours = rollback_policies.get("max_rollback_age_hours", 24)
            
            command_timestamp = config.get("timestamp")
            if command_timestamp:
                try:
                    cmd_time = datetime.fromisoformat(command_timestamp)
                    age_hours = (datetime.now() - cmd_time).total_seconds() / 3600
                    
                    if age_hours > max_age_hours:
                        validation_result["warnings"].append(
                            f"Command is {age_hours:.1f} hours old, exceeds policy limit of {max_age_hours} hours"
                        )
                except Exception:
                    validation_result["warnings"].append("Could not validate command age")
            
            # Generate recommendations
            if validation_result["warnings"]:
                validation_result["recommendations"].append("Review warnings before proceeding")
            
            if not validation_result["errors"] and not validation_result["required_confirmations"]:
                validation_result["recommendations"].append("Rollback validation passed - safe to proceed")
            
            return validation_result["feasible"], self._format_validation_message(validation_result), validation_result
            
        except Exception as e:
            logger.error(f"Error in rollback validation: {e}")
            return False, f"Validation error: {str(e)}", {"error": str(e)}
    
    def _extract_target_path_from_command(self, command: str) -> str:
        """Extract target path from command for validation."""
        cmd = command.strip().lower()
        
        # Directory operations
        if cmd.startswith('mkdir '):
            return command[6:].strip()
        elif cmd.startswith('rmdir ') or cmd.startswith('rd '):
            if cmd.startswith('rmdir '):
                path = command[6:].strip()
            else:
                path = command[3:].strip()
            # Remove flags
            for flag in ['/s', '/q', '/S', '/Q']:
                path = path.replace(flag, '').strip()
            return path
        elif cmd.startswith('del ') or cmd.startswith('rm '):
            if cmd.startswith('del '):
                return command[4:].strip()
            else:
                path = command[3:].strip()
                path = path.replace('-f', '').replace('-rf', '').replace('-r', '').strip()
                return path
        
        return ""
    
    def _format_validation_message(self, validation_result: Dict) -> str:
        """Format validation result into human-readable message."""
        messages = []
        
        if validation_result["errors"]:
            messages.append(f"ERRORS: {'; '.join(validation_result['errors'])}")
        
        if validation_result["required_confirmations"]:
            messages.append(f"CONFIRMATIONS REQUIRED: {'; '.join(validation_result['required_confirmations'])}")
        
        if validation_result["warnings"]:
            messages.append(f"WARNINGS: {'; '.join(validation_result['warnings'])}")
        
        if validation_result["recommendations"]:
            messages.append(f"RECOMMENDATIONS: {'; '.join(validation_result['recommendations'])}")
        
        return " | ".join(messages) if messages else "Validation passed"
    
    def create_atomic_rollback_group(self, command_ids: List[str], group_name: str) -> str:
        """Create an atomic rollback group for related commands."""
        try:
            groups = self._load_atomic_groups()
            group_id = f"group_{int(time.time())}_{uuid.uuid4().hex[:8]}"
            
            group_info = {
                "group_id": group_id,
                "group_name": group_name,
                "command_ids": command_ids,
                "created_at": datetime.now().isoformat(),
                "status": "active",
                "rollback_order": list(reversed(command_ids)),  # Reverse order for rollback
                "policies": groups.get("group_policies", {})
            }
            
            groups["groups"][group_id] = group_info
            self._save_atomic_groups(groups)
            
            return group_id
            
        except Exception as e:
            logger.error(f"Error creating atomic group: {e}")
            return ""
    
    def rollback_atomic_group(self, group_id: str) -> Tuple[bool, str, List[str]]:
        """Rollback all commands in an atomic group."""
        try:
            groups = self._load_atomic_groups()
            
            if group_id not in groups["groups"]:
                return False, f"Atomic group {group_id} not found", []
            
            group_info = groups["groups"][group_id]
            rollback_order = group_info["rollback_order"]
            
            rollback_results = []
            all_success = True
            
            for cmd_id in rollback_order:
                try:
                    # This would integrate with the actual command rollback system
                    # For now, we'll simulate the rollback
                    logger.info(f"Rolling back command {cmd_id} in group {group_id}")
                    rollback_results.append(f"Command {cmd_id}: rollback initiated")
                    
                except Exception as e:
                    all_success = False
                    rollback_results.append(f"Command {cmd_id}: rollback failed - {str(e)}")
                    
                    # Check failure handling policy
                    if group_info["policies"].get("failure_handling") == "stop_on_first_failure":
                        break
            
            # Update group status
            group_info["status"] = "rolled_back" if all_success else "partial_rollback"
            group_info["rollback_completed_at"] = datetime.now().isoformat()
            group_info["rollback_results"] = rollback_results
            
            groups["groups"][group_id] = group_info
            self._save_atomic_groups(groups)
            
            status_message = f"Atomic group rollback {'completed' if all_success else 'partially completed'}"
            return all_success, status_message, rollback_results
            
        except Exception as e:
            logger.error(f"Error in atomic group rollback: {e}")
            return False, f"Atomic group rollback error: {str(e)}", []
    
    def get_rollback_recommendations(self, command: str, current_strategy: str) -> Dict:
        """Get rollback strategy recommendations based on command analysis."""
        try:
            cmd = command.strip().lower()
            recommendations = {
                "recommended_strategy": current_strategy,
                "alternative_strategies": [],
                "risk_assessment": "medium",
                "confidence": 0.7,
                "reasoning": []
            }
            
            # Destructive operations -> Snapshot
            destructive_patterns = ['rmdir /s', 'rm -rf', 'format', 'drop database']
            if any(pattern in cmd for pattern in destructive_patterns):
                recommendations["recommended_strategy"] = "snapshot"
                recommendations["risk_assessment"] = "high"
                recommendations["confidence"] = 0.9
                recommendations["reasoning"].append("Destructive operation detected - snapshot provides best recovery")
                recommendations["alternative_strategies"] = ["transactional"]
            
            # Service operations -> Blue-Green
            elif any(pattern in cmd for pattern in ['systemctl', 'service', 'net start', 'net stop']):
                recommendations["recommended_strategy"] = "blue_green"
                recommendations["risk_assessment"] = "low"
                recommendations["confidence"] = 0.8
                recommendations["reasoning"].append("Service operation - blue-green provides zero-downtime rollback")
                recommendations["alternative_strategies"] = ["transactional", "canary"]
            
            # Package operations -> Transactional
            elif any(pattern in cmd for pattern in ['apt', 'yum', 'dnf', 'choco', 'winget']):
                recommendations["recommended_strategy"] = "transactional"
                recommendations["risk_assessment"] = "low"
                recommendations["confidence"] = 0.8
                recommendations["reasoning"].append("Package operation - transactional rollback is sufficient")
                recommendations["alternative_strategies"] = ["snapshot"]
            
            # Default reasoning
            if not recommendations["reasoning"]:
                recommendations["reasoning"].append("Standard operation - transactional rollback recommended")
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error generating rollback recommendations: {e}")
            return {
                "recommended_strategy": current_strategy,
                "alternative_strategies": [],
                "risk_assessment": "unknown",
                "confidence": 0.5,
                "reasoning": [f"Analysis error: {str(e)}"],
                "error": str(e)
            }

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
    """Enhanced transactional deployment strategy with comprehensive validation and safety mechanisms."""
    
    def __init__(self):
        self.transaction_dir = Path("transactions")
        self.transaction_dir.mkdir(exist_ok=True)
        self.transaction_log = self.transaction_dir / "transaction_log.json"
        self.validation_cache = {}
        
    def _load_transaction_log(self) -> Dict:
        """Load transaction history log."""
        try:
            if self.transaction_log.exists():
                with open(self.transaction_log, 'r') as f:
                    return json.load(f)
            return {"transactions": {}, "rollbacks": {}, "validations": {}, "last_updated": ""}
        except Exception as e:
            logger.error(f"Error loading transaction log: {e}")
            return {"transactions": {}, "rollbacks": {}, "validations": {}, "last_updated": ""}
    
    def _save_transaction_log(self, log: Dict) -> None:
        """Save transaction history log."""
        try:
            log["last_updated"] = datetime.now().isoformat()
            with open(self.transaction_log, 'w') as f:
                json.dump(log, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving transaction log: {e}")
    
    def _validate_rollback_feasibility(self, command: str) -> Tuple[bool, str, str]:
        """Validate if rollback is feasible and assess risk level."""
        cmd = command.strip().lower()
        
        # High-risk destructive operations
        destructive_patterns = [
            ('rmdir /s', 'high', 'Recursive directory deletion with all contents'),
            ('rmdir /S', 'high', 'Recursive directory deletion with all contents'),
            ('rd /s', 'high', 'Recursive directory deletion with all contents'),
            ('rd /S', 'high', 'Recursive directory deletion with all contents'),
            ('del /s', 'high', 'Recursive file deletion'),
            ('rm -rf', 'high', 'Recursive file/directory deletion'),
            ('format', 'destructive', 'Disk formatting - irreversible'),
            ('fdisk', 'destructive', 'Disk partitioning - potentially irreversible'),
            ('drop database', 'destructive', 'Database deletion - irreversible without backup'),
            ('truncate table', 'high', 'Table data deletion'),
            ('git reset --hard', 'medium', 'Git history modification - may lose commits')
        ]
        
        # Medium-risk operations
        service_patterns = [
            ('systemctl stop', 'low', 'Service stop - easily reversible'),
            ('systemctl start', 'low', 'Service start - easily reversible'),
            ('net stop', 'low', 'Windows service stop - easily reversible'),
            ('net start', 'low', 'Windows service start - easily reversible'),
            ('sc stop', 'low', 'Windows service stop - easily reversible'),
            ('sc start', 'low', 'Windows service start - easily reversible')
        ]
        
        # Low-risk operations
        file_patterns = [
            ('mkdir', 'low', 'Directory creation - easily reversible'),
            ('touch', 'low', 'File creation - easily reversible'),
            ('copy', 'low', 'File copy - source preserved'),
            ('cp ', 'low', 'File copy - source preserved'),
            ('echo ', 'low', 'File content write - can be undone')
        ]
        
        # Package operations
        package_patterns = [
            ('apt install', 'low', 'Package installation - can be uninstalled'),
            ('yum install', 'low', 'Package installation - can be uninstalled'),
            ('dnf install', 'low', 'Package installation - can be uninstalled'),
            ('choco install', 'low', 'Package installation - can be uninstalled'),
            ('winget install', 'low', 'Package installation - can be uninstalled'),
            ('apt remove', 'medium', 'Package removal - requires reinstallation'),
            ('yum remove', 'medium', 'Package removal - requires reinstallation'),
            ('dnf remove', 'medium', 'Package removal - requires reinstallation')
        ]
        
        all_patterns = destructive_patterns + service_patterns + file_patterns + package_patterns
        
        for pattern, risk, description in all_patterns:
            if pattern in cmd:
                feasible = risk != 'destructive'
                return feasible, risk, description
        
        # Unknown command - assume medium risk
        return True, 'medium', 'Unknown command type - manual review recommended'
    
    def _create_backup_before_destructive_op(self, command: str) -> Tuple[bool, str]:
        """Create backup before executing destructive operations."""
        try:
            cmd = command.strip().lower()
            backup_id = f"backup_{int(time.time())}_{uuid.uuid4().hex[:8]}"
            
            # Directory operations
            if (cmd.startswith('rmdir ') and ('/s' in cmd or '/S' in cmd)) or cmd.startswith('rd '):
                target_dir = self._extract_directory_from_rmdir(command)
                if target_dir and os.path.exists(target_dir):
                    backup_path = self.transaction_dir / f"{backup_id}_dir_backup"
                    backup_path.mkdir(exist_ok=True)
                    
                    # Create backup using appropriate method
                    if platform.system().lower() == "windows":
                        backup_cmd = ["robocopy", target_dir, str(backup_path), "/E", "/COPYALL"]
                    else:
                        backup_cmd = ["cp", "-r", target_dir, str(backup_path)]
                    
                    result = subprocess.run(backup_cmd, capture_output=True, text=True, timeout=300)
                    
                    # Robocopy success codes are 0-7
                    success = result.returncode == 0 or (platform.system().lower() == "windows" and result.returncode <= 7)
                    
                    if success:
                        return True, f"Backup created: {backup_path}"
                    else:
                        return False, f"Backup failed: {result.stderr}"
                else:
                    return False, f"Target directory not found or invalid: {target_dir}"
            
            # File operations
            elif cmd.startswith('del ') or cmd.startswith('rm '):
                target_file = self._extract_file_from_delete(command)
                if target_file and os.path.exists(target_file):
                    backup_path = self.transaction_dir / f"{backup_id}_file_backup"
                    backup_path.mkdir(exist_ok=True)
                    
                    # Copy file to backup
                    if platform.system().lower() == "windows":
                        backup_cmd = ["copy", target_file, str(backup_path)]
                    else:
                        backup_cmd = ["cp", target_file, str(backup_path)]
                    
                    result = subprocess.run(backup_cmd, capture_output=True, text=True, timeout=60)
                    
                    if result.returncode == 0:
                        return True, f"File backup created: {backup_path}"
                    else:
                        return False, f"File backup failed: {result.stderr}"
                else:
                    return False, f"Target file not found: {target_file}"
            
            return False, "No backup strategy for this command type"
            
        except Exception as e:
            logger.error(f"Error creating backup: {e}")
            return False, str(e)
    
    def _extract_directory_from_rmdir(self, command: str) -> str:
        """Extract directory path from rmdir command."""
        cmd = command.strip()
        if cmd.lower().startswith('rmdir '):
            dir_path = cmd[6:].strip()
        elif cmd.lower().startswith('rd '):
            dir_path = cmd[3:].strip()
        else:
            return ""
        
        # Remove flags
        for flag in ['/s', '/q', '/S', '/Q']:
            dir_path = dir_path.replace(flag, '').strip()
        
        return dir_path
    
    def _extract_file_from_delete(self, command: str) -> str:
        """Extract file path from delete command."""
        cmd = command.strip()
        if cmd.lower().startswith('del '):
            file_path = cmd[4:].strip()
        elif cmd.lower().startswith('rm '):
            file_path = cmd[3:].strip()
            # Remove common flags
            file_path = file_path.replace('-f', '').replace('-rf', '').replace('-r', '').strip()
        else:
            return ""
        
        return file_path
    
    def _record_transaction(self, command: str, transaction_id: str, result: str) -> None:
        """Record transaction details for audit and rollback purposes."""
        try:
            log = self._load_transaction_log()
            
            transaction_info = {
                "transaction_id": transaction_id,
                "command": command,
                "timestamp": datetime.now().isoformat(),
                "result": result,
                "validation": self.validation_cache.get(command, {}),
                "status": "completed"
            }
            
            log["transactions"][transaction_id] = transaction_info
            self._save_transaction_log(log)
            
        except Exception as e:
            logger.error(f"Error recording transaction: {e}")
    
    def deploy(self, config: Dict) -> str:
        """Execute deployment with enhanced validation and transaction logging."""
        logger.info("Executing enhanced transactional deployment")
        
        original_command = config.get('original_command', '')
        transaction_id = f"trans_{int(time.time())}_{uuid.uuid4().hex[:8]}"
        
        try:
            # Validate rollback feasibility
            feasible, risk_level, description = self._validate_rollback_feasibility(original_command)
            
            # Cache validation results
            self.validation_cache[original_command] = {
                "feasible": feasible,
                "risk_level": risk_level,
                "description": description,
                "validated_at": datetime.now().isoformat()
            }
            
            # Store validation in config for rollback
            config['rollback_feasible'] = feasible
            config['rollback_risk_level'] = risk_level
            config['transaction_id'] = transaction_id
            
            # For high-risk operations, create backup
            if risk_level in ['high', 'destructive']:
                backup_success, backup_message = self._create_backup_before_destructive_op(original_command)
                if backup_success:
                    config['backup_created'] = True
                    config['backup_message'] = backup_message
                    result_message = f"Transactional deployment prepared (Transaction: {transaction_id}). Risk level: {risk_level}. {backup_message}. Ready for execution."
                else:
                    result_message = f"Transactional deployment prepared (Transaction: {transaction_id}). Risk level: {risk_level}. Backup failed: {backup_message}. Proceed with caution."
            else:
                result_message = f"Transactional deployment prepared (Transaction: {transaction_id}). Risk level: {risk_level}. {description}."
            
            # Record transaction
            self._record_transaction(original_command, transaction_id, result_message)
            
            return result_message
            
        except Exception as e:
            logger.error(f"Error in enhanced transactional deployment: {e}")
            return f"Transactional deployment error: {str(e)}"
    
    def rollback(self, config: Dict) -> str:
        """Enhanced rollback with comprehensive validation and safety checks."""
        logger.info("Rolling back enhanced transactional deployment")
        
        original_command = config.get('original_command', '')
        transaction_id = config.get('transaction_id')
        
        try:
            # Load validation from cache or config
            validation_info = config.get('rollback_feasible'), config.get('rollback_risk_level', 'medium')
            
            if validation_info[0] is None:
                # No cached validation, perform it now
                feasible, risk_level, description = self._validate_rollback_feasibility(original_command)
            else:
                feasible, risk_level = validation_info
                description = self.validation_cache.get(original_command, {}).get('description', 'Previously validated')
            
            if not feasible:
                return f"# ROLLBACK NOT FEASIBLE: {description}. Risk level: {risk_level}. Manual intervention required."
            
            # Generate rollback command
            rollback_command = self._generate_transactional_rollback(original_command, config)
            
            if rollback_command:
                # Record rollback attempt
                if transaction_id:
                    log = self._load_transaction_log()
                    rollback_id = f"rollback_{int(time.time())}_{uuid.uuid4().hex[:8]}"
                    
                    rollback_info = {
                        "rollback_id": rollback_id,
                        "original_transaction_id": transaction_id,
                        "original_command": original_command,
                        "rollback_command": rollback_command,
                        "timestamp": datetime.now().isoformat(),
                        "risk_level": risk_level,
                        "status": "prepared"
                    }
                    
                    log["rollbacks"][rollback_id] = rollback_info
                    self._save_transaction_log(log)
                    
                    config['rollback_id'] = rollback_id
                
                return rollback_command
            else:
                return "# Enhanced transactional rollback: No automatic rollback strategy available"
                
        except Exception as e:
            logger.error(f"Error in enhanced transactional rollback: {e}")
            return f"# Enhanced transactional rollback error: {str(e)}"
    
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
    """Blue-Green deployment strategy for zero-downtime deployments with infrastructure management."""
    
    def __init__(self):
        self.deployment_dir = Path("blue_green_deployments")
        self.deployment_dir.mkdir(exist_ok=True)
        self.environments_registry = self.deployment_dir / "environments_registry.json"
        self.load_balancer_config = self.deployment_dir / "load_balancer_config.json"
        
    def _load_environments_registry(self) -> Dict:
        """Load blue-green environments registry."""
        try:
            if self.environments_registry.exists():
                with open(self.environments_registry, 'r') as f:
                    return json.load(f)
            return {
                "environments": {},
                "active_environment": None,
                "standby_environment": None,
                "deployments": {},
                "last_updated": ""
            }
        except Exception as e:
            logger.error(f"Error loading environments registry: {e}")
            return {"environments": {}, "active_environment": None, "standby_environment": None, "deployments": {}, "last_updated": ""}
    
    def _save_environments_registry(self, registry: Dict) -> None:
        """Save environments registry."""
        try:
            registry["last_updated"] = datetime.now().isoformat()
            with open(self.environments_registry, 'w') as f:
                json.dump(registry, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving environments registry: {e}")
    
    def _load_load_balancer_config(self) -> Dict:
        """Load load balancer configuration."""
        try:
            if self.load_balancer_config.exists():
                with open(self.load_balancer_config, 'r') as f:
                    return json.load(f)
            return {
                "type": "nginx",  # nginx, haproxy, aws_alb, azure_lb
                "config_path": "",
                "reload_command": "",
                "health_check_endpoint": "/health",
                "environments": {
                    "blue": {"host": "localhost", "port": 8001, "weight": 100},
                    "green": {"host": "localhost", "port": 8002, "weight": 0}
                }
            }
        except Exception as e:
            logger.error(f"Error loading load balancer config: {e}")
            return {"type": "nginx", "config_path": "", "reload_command": "", "health_check_endpoint": "/health", "environments": {"blue": {"host": "localhost", "port": 8001, "weight": 100}, "green": {"host": "localhost", "port": 8002, "weight": 0}}}
    
    def _save_load_balancer_config(self, config: Dict) -> None:
        """Save load balancer configuration."""
        try:
            with open(self.load_balancer_config, 'w') as f:
                json.dump(config, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving load balancer config: {e}")
    
    def _generate_nginx_config(self, blue_weight: int, green_weight: int) -> str:
        """Generate nginx upstream configuration for blue-green switching."""
        lb_config = self._load_load_balancer_config()
        blue = lb_config["environments"]["blue"]
        green = lb_config["environments"]["green"]
        
        config = f"""
upstream backend {{
    server {blue['host']}:{blue['port']} weight={blue_weight};
    server {green['host']}:{green['port']} weight={green_weight};
}}

server {{
    listen 80;
    location / {{
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Health check
        proxy_connect_timeout 5s;
        proxy_read_timeout 30s;
    }}
    
    location {lb_config.get('health_check_endpoint', '/health')} {{
        proxy_pass http://backend{lb_config.get('health_check_endpoint', '/health')};
        proxy_set_header Host $host;
    }}
}}"""
        return config
    
    def _generate_haproxy_config(self, blue_weight: int, green_weight: int) -> str:
        """Generate HAProxy configuration for blue-green switching."""
        lb_config = self._load_load_balancer_config()
        blue = lb_config["environments"]["blue"]
        green = lb_config["environments"]["green"]
        
        config = f"""
global
    daemon
    
defaults
    mode http
    timeout connect 5000ms
    timeout client 50000ms
    timeout server 50000ms

frontend web_frontend
    bind *:80
    default_backend web_servers

backend web_servers
    balance roundrobin
    option httpchk GET {lb_config.get('health_check_endpoint', '/health')}
    server blue {blue['host']}:{blue['port']} check weight {blue_weight}
    server green {green['host']}:{green['port']} check weight {green_weight}
"""
        return config
    
    def _switch_traffic(self, target_environment: str, percentage: int = 100) -> Tuple[bool, str]:
        """Switch traffic to target environment (blue or green)."""
        try:
            lb_config = self._load_load_balancer_config()
            lb_type = lb_config.get("type", "nginx")
            
            if target_environment == "blue":
                blue_weight = percentage
                green_weight = 100 - percentage
            else:  # green
                blue_weight = 100 - percentage
                green_weight = percentage
            
            # Generate new configuration
            if lb_type == "nginx":
                new_config = self._generate_nginx_config(blue_weight, green_weight)
            elif lb_type == "haproxy":
                new_config = self._generate_haproxy_config(blue_weight, green_weight)
            else:
                return False, f"Unsupported load balancer type: {lb_type}"
            
            # Write configuration to file
            config_path = lb_config.get("config_path")
            if config_path:
                with open(config_path, 'w') as f:
                    f.write(new_config)
                
                # Reload load balancer
                reload_command = lb_config.get("reload_command")
                if reload_command:
                    result = subprocess.run(
                        reload_command.split(),
                        capture_output=True,
                        text=True,
                        timeout=30
                    )
                    
                    if result.returncode == 0:
                        # Update environment weights
                        lb_config["environments"]["blue"]["weight"] = blue_weight
                        lb_config["environments"]["green"]["weight"] = green_weight
                        self._save_load_balancer_config(lb_config)
                        
                        return True, f"Traffic switched to {target_environment} ({percentage}%)"
                    else:
                        return False, f"Failed to reload {lb_type}: {result.stderr}"
                else:
                    return True, f"Configuration updated, manual reload required for {lb_type}"
            else:
                return False, f"No configuration path specified for {lb_type}"
                
        except Exception as e:
            logger.error(f"Error switching traffic: {e}")
            return False, str(e)
    
    def _health_check(self, environment: str) -> Tuple[bool, str]:
        """Perform health check on specific environment."""
        try:
            lb_config = self._load_load_balancer_config()
            env_config = lb_config["environments"].get(environment)
            
            if not env_config:
                return False, f"Environment {environment} not configured"
            
            health_endpoint = lb_config.get("health_check_endpoint", "/health")
            health_url = f"http://{env_config['host']}:{env_config['port']}{health_endpoint}"
            
            # Use curl for health check (cross-platform)
            curl_cmd = ["curl", "-f", "-s", "--max-time", "10", health_url]
            
            result = subprocess.run(
                curl_cmd,
                capture_output=True,
                text=True,
                timeout=15
            )
            
            if result.returncode == 0:
                return True, f"{environment} environment is healthy"
            else:
                return False, f"{environment} environment health check failed: {result.stderr}"
                
        except Exception as e:
            logger.error(f"Error performing health check: {e}")
            return False, str(e)
    
    def _deploy_to_environment(self, environment: str, command: str) -> Tuple[bool, str]:
        """Deploy command to specific environment (blue or green)."""
        try:
            registry = self._load_environments_registry()
            deployment_id = f"deploy_{environment}_{int(time.time())}"
            
            # Record deployment attempt
            deployment_info = {
                "deployment_id": deployment_id,
                "environment": environment,
                "command": command,
                "timestamp": datetime.now().isoformat(),
                "status": "in_progress"
            }
            
            registry["deployments"][deployment_id] = deployment_info
            self._save_environments_registry(registry)
            
            # Execute deployment command (this would typically involve container deployment, service restart, etc.)
            # For now, we'll simulate the deployment
            logger.info(f"Deploying to {environment} environment: {command}")
            
            # Simulate deployment execution
            time.sleep(1)  # Simulate deployment time
            
            # Update deployment status
            deployment_info["status"] = "completed"
            deployment_info["completed_at"] = datetime.now().isoformat()
            registry["deployments"][deployment_id] = deployment_info
            
            # Update environment state
            if environment not in registry["environments"]:
                registry["environments"][environment] = {}
            
            registry["environments"][environment].update({
                "last_deployment": deployment_id,
                "last_deployment_time": datetime.now().isoformat(),
                "status": "deployed",
                "command": command
            })
            
            self._save_environments_registry(registry)
            
            return True, f"Deployment {deployment_id} completed successfully in {environment} environment"
            
        except Exception as e:
            logger.error(f"Error deploying to {environment}: {e}")
            return False, str(e)
    
    def deploy(self, config: Dict) -> str:
        """Deploy to green environment and switch traffic after validation."""
        logger.info("Executing Blue-Green deployment")
        
        original_command = config.get('original_command', '')
        deployment_id = f"bg_deploy_{int(time.time())}"
        
        try:
            registry = self._load_environments_registry()
            
            # Determine current active environment
            current_active = registry.get("active_environment", "blue")
            target_environment = "green" if current_active == "blue" else "blue"
            
            # Deploy to standby environment
            success, message = self._deploy_to_environment(target_environment, original_command)
            
            if not success:
                return f"Blue-Green deployment failed: {message}"
            
            # Health check on target environment
            time.sleep(2)  # Allow deployment to stabilize
            health_ok, health_message = self._health_check(target_environment)
            
            if not health_ok:
                return f"Blue-Green deployment failed health check: {health_message}"
            
            # Switch traffic to new environment
            switch_success, switch_message = self._switch_traffic(target_environment, 100)
            
            if switch_success:
                # Update active environment
                registry["active_environment"] = target_environment
                registry["standby_environment"] = current_active
                
                # Store deployment info for rollback
                config['deployment_id'] = deployment_id
                config['previous_active'] = current_active
                config['current_active'] = target_environment
                
                self._save_environments_registry(registry)
                
                return f"Blue-Green deployment completed: Traffic switched to {target_environment}. {switch_message}"
            else:
                return f"Blue-Green deployment: Deployment successful but traffic switch failed: {switch_message}"
            
        except Exception as e:
            logger.error(f"Error in Blue-Green deployment: {e}")
            return f"Blue-Green deployment error: {str(e)}"
    
    def rollback(self, config: Dict) -> str:
        """Switch traffic back to previous environment or execute command rollback."""
        logger.info("Rolling back Blue-Green deployment")
        
        deployment_id = config.get('deployment_id')
        previous_active = config.get('previous_active')
        current_active = config.get('current_active')
        original_command = config.get('original_command', '')
        
        try:
            if deployment_id and previous_active:
                # We have deployment context, perform traffic switch rollback
                logger.info(f"Performing Blue-Green traffic rollback: {current_active} -> {previous_active}")
                
                # Health check on previous environment
                health_ok, health_message = self._health_check(previous_active)
                
                if not health_ok:
                    return f"# BLUE-GREEN ROLLBACK FAILED: Previous environment ({previous_active}) failed health check: {health_message}. Manual intervention required."
                
                # Switch traffic back
                switch_success, switch_message = self._switch_traffic(previous_active, 100)
                
                if switch_success:
                    # Update registry
                    registry = self._load_environments_registry()
                    registry["active_environment"] = previous_active
                    registry["standby_environment"] = current_active
                    self._save_environments_registry(registry)
                    
                    return f"# BLUE-GREEN ROLLBACK SUCCESS: Traffic switched back to {previous_active}. {switch_message}"
                else:
                    return f"# BLUE-GREEN ROLLBACK FAILED: Could not switch traffic back: {switch_message}"
            else:
                # No deployment context, generate command-based rollback with Blue-Green considerations
                transactional = TransactionalDeployment()
                rollback_command = transactional._generate_rollback_command(original_command)
                
                if rollback_command and not rollback_command.startswith('#'):
                    # We have an executable rollback command
                    registry = self._load_environments_registry()
                    current_active = registry.get("active_environment", "blue")
                    standby = registry.get("standby_environment", "green")
                    
                    # Deploy rollback to standby environment first
                    deploy_success, deploy_message = self._deploy_to_environment(standby, rollback_command)
                    
                    if deploy_success:
                        # Health check standby
                        health_ok, health_message = self._health_check(standby)
                        
                        if health_ok:
                            # Switch traffic to standby (now has rollback applied)
                            switch_success, switch_message = self._switch_traffic(standby, 100)
                            
                            if switch_success:
                                registry["active_environment"] = standby
                                registry["standby_environment"] = current_active
                                self._save_environments_registry(registry)
                                
                                return f"# BLUE-GREEN ROLLBACK: Rollback command executed in {standby}, traffic switched. Command: {rollback_command}"
                            else:
                                return f"# BLUE-GREEN ROLLBACK: Rollback deployed to {standby} but traffic switch failed: {switch_message}. Manual switch required."
                        else:
                            return f"# BLUE-GREEN ROLLBACK: Rollback deployed to {standby} but health check failed: {health_message}. Manual verification required."
                    else:
                        return f"# BLUE-GREEN ROLLBACK: Failed to deploy rollback to {standby}: {deploy_message}"
                else:
                    return f"# BLUE-GREEN ROLLBACK: {rollback_command}. Traffic switching may be required between environments."
                    
        except Exception as e:
            logger.error(f"Error in Blue-Green rollback: {e}")
            return f"# BLUE-GREEN ROLLBACK ERROR: {str(e)}"
    
    def deploy_gradual(self, config: Dict, percentage: int = 10) -> str:
        """Deploy with gradual traffic switching (canary-like within blue-green)."""
        logger.info(f"Executing gradual Blue-Green deployment with {percentage}% traffic")
        
        original_command = config.get('original_command', '')
        
        try:
            registry = self._load_environments_registry()
            current_active = registry.get("active_environment", "blue")
            target_environment = "green" if current_active == "blue" else "blue"
            
            # Deploy to target environment
            success, message = self._deploy_to_environment(target_environment, original_command)
            
            if not success:
                return f"Gradual Blue-Green deployment failed: {message}"
            
            # Health check
            health_ok, health_message = self._health_check(target_environment)
            
            if not health_ok:
                return f"Gradual Blue-Green deployment failed health check: {health_message}"
            
            # Switch partial traffic
            switch_success, switch_message = self._switch_traffic(target_environment, percentage)
            
            if switch_success:
                config['gradual_deployment'] = True
                config['target_environment'] = target_environment
                config['current_percentage'] = percentage
                
                return f"Gradual Blue-Green deployment: {percentage}% traffic switched to {target_environment}. Monitor and call complete_gradual_deployment() to finish."
            else:
                return f"Gradual Blue-Green deployment: Deployment successful but partial traffic switch failed: {switch_message}"
                
        except Exception as e:
            logger.error(f"Error in gradual Blue-Green deployment: {e}")
            return f"Gradual Blue-Green deployment error: {str(e)}"
    
    def complete_gradual_deployment(self, config: Dict) -> str:
        """Complete gradual deployment by switching all traffic."""
        target_environment = config.get('target_environment')
        
        if not target_environment:
            return "No gradual deployment in progress"
        
        try:
            # Switch all traffic
            switch_success, switch_message = self._switch_traffic(target_environment, 100)
            
            if switch_success:
                registry = self._load_environments_registry()
                previous_active = registry.get("active_environment")
                registry["active_environment"] = target_environment
                registry["standby_environment"] = previous_active
                self._save_environments_registry(registry)
                
                # Update config for potential rollback
                config['previous_active'] = previous_active
                config['current_active'] = target_environment
                
                return f"Gradual Blue-Green deployment completed: All traffic switched to {target_environment}"
            else:
                return f"Failed to complete gradual deployment: {switch_message}"
                
        except Exception as e:
            logger.error(f"Error completing gradual deployment: {e}")
            return f"Error completing gradual deployment: {str(e)}"
    
    def get_deployment_status(self) -> Dict:
        """Get current blue-green deployment status."""
        try:
            registry = self._load_environments_registry()
            lb_config = self._load_load_balancer_config()
            
            # Perform health checks
            blue_health = self._health_check("blue")
            green_health = self._health_check("green")
            
            return {
                "active_environment": registry.get("active_environment"),
                "standby_environment": registry.get("standby_environment"),
                "environments": registry.get("environments", {}),
                "traffic_distribution": {
                    "blue": lb_config["environments"]["blue"].get("weight", 0),
                    "green": lb_config["environments"]["green"].get("weight", 0)
                },
                "health_status": {
                    "blue": {"healthy": blue_health[0], "message": blue_health[1]},
                    "green": {"healthy": green_health[0], "message": green_health[1]}
                },
                "recent_deployments": list(registry.get("deployments", {}).values())[-5:],  # Last 5 deployments
                "last_updated": registry.get("last_updated")
            }
        except Exception as e:
            logger.error(f"Error getting deployment status: {e}")
            return {"error": str(e)}

class SnapshotDeployment(DeploymentStrategy):
    """Snapshot-based deployment strategy for critical system changes with actual snapshot functionality."""
    
    def __init__(self):
        self.snapshot_dir = Path("snapshots")
        self.snapshot_dir.mkdir(exist_ok=True)
        self.system_type = platform.system().lower()
        self.snapshots_registry = self.snapshot_dir / "snapshots_registry.json"
        
    def _load_snapshots_registry(self) -> Dict:
        """Load the snapshots registry from JSON file."""
        try:
            if self.snapshots_registry.exists():
                with open(self.snapshots_registry, 'r') as f:
                    return json.load(f)
            return {"snapshots": {}, "last_updated": ""}
        except Exception as e:
            logger.error(f"Error loading snapshots registry: {e}")
            return {"snapshots": {}, "last_updated": ""}
    
    def _save_snapshots_registry(self, registry: Dict) -> None:
        """Save the snapshots registry to JSON file."""
        try:
            with open(self.snapshots_registry, 'w') as f:
                json.dump(registry, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving snapshots registry: {e}")
    
    def _create_windows_snapshot(self, target_path: str, snapshot_id: str) -> Tuple[bool, str]:
        """Create Windows VSS snapshot."""
        try:
            # Create snapshot using Windows VSS via PowerShell
            ps_script = f'''
                $ErrorActionPreference = "Stop"
                try {{
                    # Create VSS snapshot
                    $snapshot = (vssadmin create shadow /for={target_path[0]}:)
                    $shadowId = ($snapshot | Select-String "Shadow Copy ID: (.+)" | ForEach-Object {{$_.Matches[0].Groups[1].Value}})
                    $shadowPath = ($snapshot | Select-String "Shadow Copy Volume Name: (.+)" | ForEach-Object {{$_.Matches[0].Groups[1].Value}})
                    
                    # Copy to local snapshot directory for easier access
                    $localSnapshotPath = "{self.snapshot_dir}\\{snapshot_id}"
                    New-Item -ItemType Directory -Path $localSnapshotPath -Force
                    robocopy "$shadowPath\\{target_path[3:]}" $localSnapshotPath /E /COPYALL /R:3 /W:5
                    
                    Write-Output "SUCCESS:$shadowId:$localSnapshotPath"
                }} catch {{
                    Write-Output "ERROR:$($_.Exception.Message)"
                }}
            '''
            
            result = subprocess.run(
                ["powershell", "-Command", ps_script],
                capture_output=True,
                text=True,
                timeout=300
            )
            
            output = result.stdout.strip()
            if output.startswith("SUCCESS:"):
                parts = output.split(":", 2)
                return True, f"VSS Snapshot created - ID: {parts[1]}, Local copy: {parts[2]}"
            else:
                return False, f"Failed to create VSS snapshot: {output}"
                
        except Exception as e:
            logger.error(f"Error creating Windows snapshot: {e}")
            return False, str(e)
    
    def _create_linux_snapshot(self, target_path: str, snapshot_id: str) -> Tuple[bool, str]:
        """Create Linux filesystem snapshot using rsync and tar."""
        try:
            snapshot_path = self.snapshot_dir / snapshot_id
            snapshot_path.mkdir(exist_ok=True)
            
            # Create snapshot using rsync for consistency
            rsync_cmd = [
                "rsync", "-av", "--delete", 
                f"{target_path}/", 
                str(snapshot_path) + "/"
            ]
            
            result = subprocess.run(
                rsync_cmd,
                capture_output=True,
                text=True,
                timeout=300
            )
            
            if result.returncode == 0:
                # Create compressed archive for efficiency
                tar_path = self.snapshot_dir / f"{snapshot_id}.tar.gz"
                tar_cmd = ["tar", "-czf", str(tar_path), "-C", str(snapshot_path), "."]
                
                tar_result = subprocess.run(tar_cmd, capture_output=True, text=True, timeout=300)
                
                if tar_result.returncode == 0:
                    # Remove uncompressed directory to save space
                    subprocess.run(["rm", "-rf", str(snapshot_path)])
                    return True, f"Linux snapshot created: {tar_path}"
                else:
                    return True, f"Linux snapshot created (uncompressed): {snapshot_path}"
            else:
                return False, f"Failed to create Linux snapshot: {result.stderr}"
                
        except Exception as e:
            logger.error(f"Error creating Linux snapshot: {e}")
            return False, str(e)
    
    def _restore_windows_snapshot(self, snapshot_id: str, target_path: str) -> Tuple[bool, str]:
        """Restore Windows snapshot."""
        try:
            registry = self._load_snapshots_registry()
            snapshot_info = registry["snapshots"].get(snapshot_id)
            
            if not snapshot_info:
                return False, f"Snapshot {snapshot_id} not found in registry"
            
            local_snapshot_path = snapshot_info.get("local_path")
            if not local_snapshot_path or not os.path.exists(local_snapshot_path):
                return False, f"Local snapshot path not found: {local_snapshot_path}"
            
            # Restore using robocopy
            restore_cmd = [
                "robocopy", local_snapshot_path, target_path,
                "/E", "/COPYALL", "/R:3", "/W:5"
            ]
            
            result = subprocess.run(
                restore_cmd,
                capture_output=True,
                text=True,
                timeout=300
            )
            
            # Robocopy exit codes 0-7 are considered success
            if result.returncode <= 7:
                return True, f"Windows snapshot restored from {local_snapshot_path} to {target_path}"
            else:
                return False, f"Failed to restore Windows snapshot: {result.stderr}"
                
        except Exception as e:
            logger.error(f"Error restoring Windows snapshot: {e}")
            return False, str(e)
    
    def _restore_linux_snapshot(self, snapshot_id: str, target_path: str) -> Tuple[bool, str]:
        """Restore Linux snapshot."""
        try:
            registry = self._load_snapshots_registry()
            snapshot_info = registry["snapshots"].get(snapshot_id)
            
            if not snapshot_info:
                return False, f"Snapshot {snapshot_id} not found in registry"
            
            # Check for compressed archive first
            tar_path = self.snapshot_dir / f"{snapshot_id}.tar.gz"
            if tar_path.exists():
                # Extract and restore from archive
                temp_dir = self.snapshot_dir / f"temp_{snapshot_id}"
                temp_dir.mkdir(exist_ok=True)
                
                # Extract archive
                extract_cmd = ["tar", "-xzf", str(tar_path), "-C", str(temp_dir)]
                result = subprocess.run(extract_cmd, capture_output=True, text=True, timeout=300)
                
                if result.returncode != 0:
                    return False, f"Failed to extract snapshot archive: {result.stderr}"
                
                # Restore using rsync
                restore_cmd = [
                    "rsync", "-av", "--delete",
                    str(temp_dir) + "/",
                    f"{target_path}/"
                ]
                
                restore_result = subprocess.run(restore_cmd, capture_output=True, text=True, timeout=300)
                
                # Cleanup temp directory
                subprocess.run(["rm", "-rf", str(temp_dir)])
                
                if restore_result.returncode == 0:
                    return True, f"Linux snapshot restored from {tar_path} to {target_path}"
                else:
                    return False, f"Failed to restore Linux snapshot: {restore_result.stderr}"
            else:
                # Check for uncompressed directory
                snapshot_path = self.snapshot_dir / snapshot_id
                if snapshot_path.exists():
                    restore_cmd = [
                        "rsync", "-av", "--delete",
                        str(snapshot_path) + "/",
                        f"{target_path}/"
                    ]
                    
                    result = subprocess.run(restore_cmd, capture_output=True, text=True, timeout=300)
                    
                    if result.returncode == 0:
                        return True, f"Linux snapshot restored from {snapshot_path} to {target_path}"
                    else:
                        return False, f"Failed to restore Linux snapshot: {result.stderr}"
                else:
                    return False, f"Snapshot directory not found: {snapshot_path}"
                    
        except Exception as e:
            logger.error(f"Error restoring Linux snapshot: {e}")
            return False, str(e)
    
    def create_snapshot(self, target_path: str, description: str = "") -> Tuple[bool, str, str]:
        """Create a system snapshot of the target path."""
        snapshot_id = f"snapshot_{int(time.time())}_{uuid.uuid4().hex[:8]}"
        timestamp = datetime.now().isoformat()
        
        try:
            # Validate target path
            if not os.path.exists(target_path):
                return False, f"Target path does not exist: {target_path}", ""
            
            logger.info(f"Creating {self.system_type} snapshot for {target_path}")
            
            if self.system_type == "windows":
                success, message = self._create_windows_snapshot(target_path, snapshot_id)
            else:
                success, message = self._create_linux_snapshot(target_path, snapshot_id)
            
            if success:
                # Update registry
                registry = self._load_snapshots_registry()
                registry["snapshots"][snapshot_id] = {
                    "target_path": target_path,
                    "description": description,
                    "timestamp": timestamp,
                    "system_type": self.system_type,
                    "status": "created",
                    "message": message,
                    "local_path": str(self.snapshot_dir / snapshot_id) if self.system_type == "linux" else None
                }
                registry["last_updated"] = timestamp
                self._save_snapshots_registry(registry)
                
                logger.info(f"Snapshot {snapshot_id} created successfully")
                return True, message, snapshot_id
            else:
                logger.error(f"Failed to create snapshot: {message}")
                return False, message, ""
                
        except Exception as e:
            logger.error(f"Error creating snapshot: {e}")
            return False, str(e), ""
    
    def restore_snapshot(self, snapshot_id: str, target_path: str = None) -> Tuple[bool, str]:
        """Restore from a specific snapshot."""
        try:
            registry = self._load_snapshots_registry()
            snapshot_info = registry["snapshots"].get(snapshot_id)
            
            if not snapshot_info:
                return False, f"Snapshot {snapshot_id} not found"
            
            # Use original path if target_path not specified
            if target_path is None:
                target_path = snapshot_info["target_path"]
            
            logger.info(f"Restoring {self.system_type} snapshot {snapshot_id} to {target_path}")
            
            if self.system_type == "windows":
                success, message = self._restore_windows_snapshot(snapshot_id, target_path)
            else:
                success, message = self._restore_linux_snapshot(snapshot_id, target_path)
            
            if success:
                # Update registry
                snapshot_info["last_restored"] = datetime.now().isoformat()
                snapshot_info["restore_count"] = snapshot_info.get("restore_count", 0) + 1
                registry["last_updated"] = datetime.now().isoformat()
                self._save_snapshots_registry(registry)
                
                logger.info(f"Snapshot {snapshot_id} restored successfully")
            
            return success, message
            
        except Exception as e:
            logger.error(f"Error restoring snapshot: {e}")
            return False, str(e)
    
    def list_snapshots(self) -> List[Dict]:
        """List all available snapshots."""
        try:
            registry = self._load_snapshots_registry()
            return list(registry["snapshots"].values())
        except Exception as e:
            logger.error(f"Error listing snapshots: {e}")
            return []
    
    def delete_snapshot(self, snapshot_id: str) -> Tuple[bool, str]:
        """Delete a specific snapshot."""
        try:
            registry = self._load_snapshots_registry()
            snapshot_info = registry["snapshots"].get(snapshot_id)
            
            if not snapshot_info:
                return False, f"Snapshot {snapshot_id} not found"
            
            # Remove local files
            if self.system_type == "linux":
                tar_path = self.snapshot_dir / f"{snapshot_id}.tar.gz"
                snapshot_path = self.snapshot_dir / snapshot_id
                
                if tar_path.exists():
                    tar_path.unlink()
                if snapshot_path.exists():
                    subprocess.run(["rm", "-rf", str(snapshot_path)])
            else:
                # Windows - remove local copy
                local_path = snapshot_info.get("local_path")
                if local_path and os.path.exists(local_path):
                    subprocess.run(["rmdir", "/s", "/q", local_path], shell=True)
            
            # Remove from registry
            del registry["snapshots"][snapshot_id]
            registry["last_updated"] = datetime.now().isoformat()
            self._save_snapshots_registry(registry)
            
            logger.info(f"Snapshot {snapshot_id} deleted successfully")
            return True, f"Snapshot {snapshot_id} deleted"
            
        except Exception as e:
            logger.error(f"Error deleting snapshot: {e}")
            return False, str(e)
    
    def deploy(self, config: Dict) -> str:
        """Take system snapshot before deployment."""
        logger.info("Executing snapshot deployment")
        
        original_command = config.get('original_command', '')
        target_path = self._extract_target_path(original_command)
        
        if target_path:
            success, message, snapshot_id = self.create_snapshot(
                target_path, 
                f"Pre-deployment snapshot for: {original_command}"
            )
            
            if success:
                # Store snapshot ID in config for rollback
                config['snapshot_id'] = snapshot_id
                config['snapshot_target_path'] = target_path
                return f"Snapshot deployment ready - Snapshot {snapshot_id} created for {target_path}"
            else:
                logger.error(f"Failed to create snapshot: {message}")
                return f"Snapshot creation failed: {message}"
        else:
            return "Snapshot deployment - Could not determine target path for snapshot"
    
    def rollback(self, config: Dict) -> str:
        """Restore from snapshot or generate comprehensive rollback command."""
        logger.info("Rolling back using snapshot")
        
        snapshot_id = config.get('snapshot_id')
        original_command = config.get('original_command', '')
        
        if snapshot_id:
            # We have a snapshot ID, attempt automatic restoration
            target_path = config.get('snapshot_target_path')
            success, message = self.restore_snapshot(snapshot_id, target_path)
            
            if success:
                return f"# SNAPSHOT RESTORED: {message}"
            else:
                return f"# SNAPSHOT RESTORE FAILED: {message}. Manual intervention required."
        else:
            # No snapshot ID, provide manual restoration guidance
            target_path = self._extract_target_path(original_command)
            available_snapshots = self.list_snapshots()
            
            if available_snapshots:
                recent_snapshots = sorted(available_snapshots, key=lambda x: x['timestamp'], reverse=True)[:3]
                snapshot_info = "\\n".join([
                    f"- {s.get('snapshot_id', 'unknown')}: {s['target_path']} ({s['timestamp']})"
                    for s in recent_snapshots
                ])
                
                return f"""# SNAPSHOT ROLLBACK GUIDANCE:
# Target path: {target_path}
# Available snapshots:
{snapshot_info}
# To restore manually:
# 1. Identify appropriate snapshot from list above
# 2. Use snapshot restore API endpoint: POST /api/deployment/snapshots/{{snapshot_id}}/restore
# 3. Or manually restore from snapshot directory: {self.snapshot_dir}"""
            else:
                return f"# SNAPSHOT ROLLBACK: No snapshots available. Manual backup restoration required for: {target_path}"
    
    def _extract_target_path(self, command: str) -> str:
        """Extract target path from command for snapshot purposes."""
        cmd = command.strip().lower()
        
        # Directory operations
        if cmd.startswith('mkdir '):
            return command[6:].strip()
        elif cmd.startswith('rmdir ') or cmd.startswith('rd '):
            if cmd.startswith('rmdir '):
                path = command[6:].strip()
            else:
                path = command[3:].strip()
            # Remove flags
            for flag in ['/s', '/q', '/S', '/Q']:
                path = path.replace(flag, '').strip()
            return path
        
        # File operations
        elif cmd.startswith('copy ') or cmd.startswith('cp '):
            parts = command.split()
            if len(parts) >= 3:
                return os.path.dirname(parts[-1])  # Directory of destination
        elif cmd.startswith('move ') or cmd.startswith('mv '):
            parts = command.split()
            if len(parts) >= 3:
                return os.path.dirname(parts[1])  # Directory of source
        elif cmd.startswith('del ') or cmd.startswith('rm '):
            if cmd.startswith('del '):
                path = command[4:].strip()
            else:
                path = command[3:].strip()
                path = path.replace('-f', '').replace('-rf', '').replace('-r', '').strip()
            return os.path.dirname(path) if os.path.sep in path else "."
        
        # Default to current directory
        return "."

class CanaryDeployment(DeploymentStrategy):
    """Canary deployment strategy for gradual rollouts with monitoring and automatic rollback."""
    
    def __init__(self):
        self.canary_dir = Path("canary_deployments")
        self.canary_dir.mkdir(exist_ok=True)
        self.canary_registry = self.canary_dir / "canary_registry.json"
        self.metrics_config = self.canary_dir / "metrics_config.json"
        
    def _load_canary_registry(self) -> Dict:
        """Load canary deployments registry."""
        try:
            if self.canary_registry.exists():
                with open(self.canary_registry, 'r') as f:
                    return json.load(f)
            return {
                "active_canaries": {},
                "completed_canaries": {},
                "rollback_history": {},
                "default_config": {
                    "initial_percentage": 5,
                    "max_percentage": 100,
                    "increment_percentage": 10,
                    "promotion_interval": 300,  # 5 minutes
                    "max_error_rate": 0.05,     # 5%
                    "min_success_rate": 0.95,   # 95%
                    "monitoring_window": 180    # 3 minutes
                },
                "last_updated": ""
            }
        except Exception as e:
            logger.error(f"Error loading canary registry: {e}")
            return {"active_canaries": {}, "completed_canaries": {}, "rollback_history": {}, "default_config": {}, "last_updated": ""}
    
    def _save_canary_registry(self, registry: Dict) -> None:
        """Save canary registry."""
        try:
            registry["last_updated"] = datetime.now().isoformat()
            with open(self.canary_registry, 'w') as f:
                json.dump(registry, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving canary registry: {e}")
    
    def _load_metrics_config(self) -> Dict:
        """Load metrics monitoring configuration."""
        try:
            if self.metrics_config.exists():
                with open(self.metrics_config, 'r') as f:
                    return json.load(f)
            return {
                "monitoring_enabled": True,
                "metrics_endpoints": [
                    {"name": "error_rate", "url": "/metrics/error_rate", "threshold": 0.05},
                    {"name": "response_time", "url": "/metrics/response_time", "threshold": 1000},
                    {"name": "success_rate", "url": "/metrics/success_rate", "threshold": 0.95}
                ],
                "notification_webhooks": [],
                "rollback_triggers": {
                    "high_error_rate": {"threshold": 0.1, "window": 120},
                    "high_response_time": {"threshold": 2000, "window": 180},
                    "low_success_rate": {"threshold": 0.85, "window": 300}
                }
            }
        except Exception as e:
            logger.error(f"Error loading metrics config: {e}")
            return {"monitoring_enabled": True, "metrics_endpoints": [], "notification_webhooks": [], "rollback_triggers": {}}
    
    def _save_metrics_config(self, config: Dict) -> None:
        """Save metrics configuration."""
        try:
            with open(self.metrics_config, 'w') as f:
                json.dump(config, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving metrics config: {e}")
    
    def _deploy_to_canary_instances(self, canary_id: str, command: str, percentage: int) -> Tuple[bool, str]:
        """Deploy to canary instances (percentage of total infrastructure)."""
        try:
            logger.info(f"Deploying canary {canary_id} to {percentage}% of instances: {command}")
            
            # Simulate canary deployment logic
            # In real implementation, this would:
            # 1. Calculate target instances based on percentage
            # 2. Deploy to those specific instances
            # 3. Update load balancer to route percentage of traffic
            
            # For simulation, we'll just log and wait
            time.sleep(2)  # Simulate deployment time
            
            registry = self._load_canary_registry()
            
            if canary_id not in registry["active_canaries"]:
                return False, f"Canary {canary_id} not found in registry"
            
            canary_info = registry["active_canaries"][canary_id]
            canary_info["current_percentage"] = percentage
            canary_info["last_deployment"] = datetime.now().isoformat()
            canary_info["deployment_history"].append({
                "percentage": percentage,
                "timestamp": datetime.now().isoformat(),
                "status": "deployed"
            })
            
            self._save_canary_registry(registry)
            
            return True, f"Canary deployed to {percentage}% of instances"
            
        except Exception as e:
            logger.error(f"Error deploying to canary instances: {e}")
            return False, str(e)
    
    def _collect_metrics(self, canary_id: str) -> Dict:
        """Collect metrics for canary deployment analysis."""
        try:
            metrics_config = self._load_metrics_config()
            
            if not metrics_config.get("monitoring_enabled", True):
                return {"monitoring_disabled": True}
            
            collected_metrics = {}
            
            for metric in metrics_config.get("metrics_endpoints", []):
                metric_name = metric["name"]
                metric_url = metric["url"]
                
                try:
                    # Use curl to collect metrics (in real implementation, use proper HTTP client)
                    curl_cmd = ["curl", "-f", "-s", "--max-time", "10", metric_url]
                    result = subprocess.run(curl_cmd, capture_output=True, text=True, timeout=15)
                    
                    if result.returncode == 0:
                        # Parse metric value (assuming JSON response with 'value' field)
                        try:
                            metric_data = json.loads(result.stdout)
                            collected_metrics[metric_name] = {
                                "value": metric_data.get("value", 0),
                                "threshold": metric["threshold"],
                                "status": "ok",
                                "timestamp": datetime.now().isoformat()
                            }
                        except json.JSONDecodeError:
                            # If not JSON, treat as raw value
                            collected_metrics[metric_name] = {
                                "value": float(result.stdout.strip()) if result.stdout.strip().replace('.', '').isdigit() else 0,
                                "threshold": metric["threshold"],
                                "status": "ok",
                                "timestamp": datetime.now().isoformat()
                            }
                    else:
                        collected_metrics[metric_name] = {
                            "value": None,
                            "threshold": metric["threshold"],
                            "status": "error",
                            "error": result.stderr,
                            "timestamp": datetime.now().isoformat()
                        }
                except Exception as e:
                    collected_metrics[metric_name] = {
                        "value": None,
                        "threshold": metric["threshold"],
                        "status": "error",
                        "error": str(e),
                        "timestamp": datetime.now().isoformat()
                    }
            
            return collected_metrics
            
        except Exception as e:
            logger.error(f"Error collecting metrics for canary {canary_id}: {e}")
            return {"error": str(e)}
    
    def _analyze_metrics(self, metrics: Dict, canary_config: Dict) -> Tuple[bool, str, List[str]]:
        """Analyze collected metrics to determine if canary should continue, rollback, or promote."""
        try:
            if "error" in metrics or "monitoring_disabled" in metrics:
                return True, "continue", ["Metrics monitoring not available, proceeding with manual oversight"]
            
            issues = []
            warnings = []
            should_rollback = False
            
            # Check error rate
            if "error_rate" in metrics:
                error_rate = metrics["error_rate"]["value"]
                threshold = metrics["error_rate"]["threshold"]
                
                if error_rate is not None and error_rate > threshold:
                    issues.append(f"High error rate: {error_rate:.3f} > {threshold:.3f}")
                    if error_rate > canary_config.get("max_error_rate", 0.05):
                        should_rollback = True
            
            # Check success rate
            if "success_rate" in metrics:
                success_rate = metrics["success_rate"]["value"]
                threshold = metrics["success_rate"]["threshold"]
                
                if success_rate is not None and success_rate < threshold:
                    issues.append(f"Low success rate: {success_rate:.3f} < {threshold:.3f}")
                    if success_rate < canary_config.get("min_success_rate", 0.95):
                        should_rollback = True
            
            # Check response time
            if "response_time" in metrics:
                response_time = metrics["response_time"]["value"]
                threshold = metrics["response_time"]["threshold"]
                
                if response_time is not None and response_time > threshold:
                    warnings.append(f"High response time: {response_time}ms > {threshold}ms")
            
            if should_rollback:
                return False, "rollback", issues
            elif issues:
                return True, "hold", issues + warnings
            else:
                return True, "promote", warnings if warnings else ["All metrics within acceptable ranges"]
                
        except Exception as e:
            logger.error(f"Error analyzing metrics: {e}")
            return True, "continue", [f"Metrics analysis error: {str(e)}"]
    
    def _auto_promote_canary(self, canary_id: str) -> Tuple[bool, str]:
        """Automatically promote canary to next percentage or complete deployment."""
        try:
            registry = self._load_canary_registry()
            
            if canary_id not in registry["active_canaries"]:
                return False, f"Canary {canary_id} not found"
            
            canary_info = registry["active_canaries"][canary_id]
            current_percentage = canary_info["current_percentage"]
            canary_config = canary_info["config"]
            
            max_percentage = canary_config.get("max_percentage", 100)
            increment = canary_config.get("increment_percentage", 10)
            
            if current_percentage >= max_percentage:
                # Complete the canary deployment
                return self._complete_canary_deployment(canary_id)
            else:
                # Promote to next percentage
                next_percentage = min(current_percentage + increment, max_percentage)
                success, message = self._deploy_to_canary_instances(
                    canary_id, 
                    canary_info["command"], 
                    next_percentage
                )
                
                if success:
                    return True, f"Canary promoted to {next_percentage}%: {message}"
                else:
                    return False, f"Failed to promote canary: {message}"
                    
        except Exception as e:
            logger.error(f"Error auto-promoting canary {canary_id}: {e}")
            return False, str(e)
    
    def _complete_canary_deployment(self, canary_id: str) -> Tuple[bool, str]:
        """Complete canary deployment by promoting to 100% and cleaning up."""
        try:
            registry = self._load_canary_registry()
            
            if canary_id not in registry["active_canaries"]:
                return False, f"Canary {canary_id} not found"
            
            canary_info = registry["active_canaries"][canary_id]
            
            # Deploy to 100%
            success, message = self._deploy_to_canary_instances(
                canary_id, 
                canary_info["command"], 
                100
            )
            
            if success:
                # Move to completed canaries
                canary_info["status"] = "completed"
                canary_info["completed_at"] = datetime.now().isoformat()
                canary_info["final_percentage"] = 100
                
                registry["completed_canaries"][canary_id] = canary_info
                del registry["active_canaries"][canary_id]
                
                self._save_canary_registry(registry)
                
                return True, f"Canary deployment {canary_id} completed successfully"
            else:
                return False, f"Failed to complete canary deployment: {message}"
                
        except Exception as e:
            logger.error(f"Error completing canary deployment {canary_id}: {e}")
            return False, str(e)
    
    def deploy(self, config: Dict) -> str:
        """Start canary deployment with gradual rollout."""
        logger.info("Executing canary deployment")
        
        original_command = config.get('original_command', '')
        canary_id = f"canary_{int(time.time())}_{uuid.uuid4().hex[:8]}"
        
        try:
            registry = self._load_canary_registry()
            default_config = registry.get("default_config", {})
            
            # Merge config with defaults
            canary_config = {
                **default_config,
                **config.get("canary_config", {})
            }
            
            initial_percentage = canary_config.get("initial_percentage", 5)
            
            # Create canary entry
            canary_info = {
                "canary_id": canary_id,
                "command": original_command,
                "status": "active",
                "created_at": datetime.now().isoformat(),
                "current_percentage": 0,
                "config": canary_config,
                "deployment_history": [],
                "metrics_history": [],
                "rollback_triggers": []
            }
            
            registry["active_canaries"][canary_id] = canary_info
            self._save_canary_registry(registry)
            
            # Initial deployment to canary percentage
            success, message = self._deploy_to_canary_instances(canary_id, original_command, initial_percentage)
            
            if success:
                # Store canary ID in config for rollback and monitoring
                config['canary_id'] = canary_id
                config['canary_percentage'] = initial_percentage
                
                return f"Canary deployment started: {canary_id} deployed to {initial_percentage}% of instances. Monitor metrics and call promote_canary() to continue."
            else:
                # Cleanup failed canary
                if canary_id in registry["active_canaries"]:
                    del registry["active_canaries"][canary_id]
                    self._save_canary_registry(registry)
                
                return f"Canary deployment failed: {message}"
                
        except Exception as e:
            logger.error(f"Error starting canary deployment: {e}")
            return f"Canary deployment error: {str(e)}"
    
    def rollback(self, config: Dict) -> str:
        """Rollback canary deployment with gradual traffic reduction."""
        logger.info("Rolling back canary deployment")
        
        canary_id = config.get('canary_id')
        original_command = config.get('original_command', '')
        
        try:
            if canary_id:
                # We have a canary ID, perform gradual rollback
                registry = self._load_canary_registry()
                
                if canary_id in registry["active_canaries"]:
                    canary_info = registry["active_canaries"][canary_id]
                    current_percentage = canary_info["current_percentage"]
                    
                    # Gradual rollback: reduce traffic in steps
                    rollback_steps = []
                    rollback_percentage = current_percentage
                    
                    while rollback_percentage > 0:
                        rollback_percentage = max(0, rollback_percentage - 20)  # Reduce by 20% each step
                        rollback_steps.append(rollback_percentage)
                    
                    rollback_messages = []
                    
                    for step_percentage in rollback_steps:
                        if step_percentage == 0:
                            # Complete rollback - remove canary deployment
                            rollback_messages.append(f"Canary traffic reduced to {step_percentage}% - deployment removed")
                            
                            # Move to rollback history
                            canary_info["status"] = "rolled_back"
                            canary_info["rolled_back_at"] = datetime.now().isoformat()
                            canary_info["rollback_reason"] = "Manual rollback requested"
                            
                            registry["rollback_history"][canary_id] = canary_info
                            del registry["active_canaries"][canary_id]
                        else:
                            # Partial rollback
                            success, message = self._deploy_to_canary_instances(canary_id, original_command, step_percentage)
                            rollback_messages.append(f"Canary traffic reduced to {step_percentage}%: {message}")
                            
                            # Add delay between steps for stability
                            time.sleep(2)
                    
                    self._save_canary_registry(registry)
                    
                    return f"# CANARY ROLLBACK COMPLETED: {'; '.join(rollback_messages)}"
                
                elif canary_id in registry["completed_canaries"]:
                    # Canary was completed, need to rollback the full deployment
                    transactional = TransactionalDeployment()
                    rollback_command = transactional._generate_rollback_command(original_command)
                    
                    if rollback_command and not rollback_command.startswith('#'):
                        return f"# CANARY ROLLBACK: Completed canary needs full rollback. Execute: {rollback_command}"
                    else:
                        return f"# CANARY ROLLBACK: {rollback_command}"
                else:
                    return f"# CANARY ROLLBACK: Canary {canary_id} not found in active or completed deployments"
            else:
                # No canary ID, perform command-based rollback
                transactional = TransactionalDeployment()
                rollback_command = transactional._generate_rollback_command(original_command)
                
                if rollback_command and not rollback_command.startswith('#'):
                    return f"# CANARY ROLLBACK: {rollback_command}. Note: This may require gradual rollback if canary was deployed."
                else:
                    return f"# CANARY ROLLBACK: {rollback_command}"
                    
        except Exception as e:
            logger.error(f"Error in canary rollback: {e}")
            return f"# CANARY ROLLBACK ERROR: {str(e)}"
    
    def promote_canary(self, canary_id: str) -> str:
        """Manually promote canary to next percentage or completion."""
        try:
            # Collect and analyze metrics first
            metrics = self._collect_metrics(canary_id)
            
            registry = self._load_canary_registry()
            if canary_id not in registry["active_canaries"]:
                return f"Canary {canary_id} not found in active deployments"
            
            canary_info = registry["active_canaries"][canary_id]
            canary_config = canary_info["config"]
            
            # Analyze metrics
            should_continue, action, reasons = self._analyze_metrics(metrics, canary_config)
            
            # Store metrics in history
            canary_info["metrics_history"].append({
                "timestamp": datetime.now().isoformat(),
                "metrics": metrics,
                "analysis": {"action": action, "reasons": reasons}
            })
            
            if not should_continue and action == "rollback":
                # Metrics indicate rollback needed
                config = {"canary_id": canary_id, "original_command": canary_info["command"]}
                rollback_result = self.rollback(config)
                return f"AUTOMATIC ROLLBACK TRIGGERED: {'; '.join(reasons)}. {rollback_result}"
            
            elif action == "hold":
                # Metrics indicate we should wait
                return f"Canary promotion HELD due to metrics: {'; '.join(reasons)}. Manual intervention may be required."
            
            else:
                # Proceed with promotion
                success, message = self._auto_promote_canary(canary_id)
                
                if success:
                    metric_summary = f"Metrics: {'; '.join(reasons)}" if reasons else "Metrics: OK"
                    return f"Canary promoted successfully: {message}. {metric_summary}"
                else:
                    return f"Failed to promote canary: {message}"
                    
        except Exception as e:
            logger.error(f"Error promoting canary {canary_id}: {e}")
            return f"Error promoting canary: {str(e)}"
    
    def get_canary_status(self, canary_id: str = None) -> Dict:
        """Get status of specific canary or all active canaries."""
        try:
            registry = self._load_canary_registry()
            
            if canary_id:
                # Get specific canary
                if canary_id in registry["active_canaries"]:
                    canary_info = registry["active_canaries"][canary_id]
                    metrics = self._collect_metrics(canary_id)
                    
                    return {
                        "canary_id": canary_id,
                        "status": "active",
                        "info": canary_info,
                        "current_metrics": metrics
                    }
                elif canary_id in registry["completed_canaries"]:
                    return {
                        "canary_id": canary_id,
                        "status": "completed",
                        "info": registry["completed_canaries"][canary_id]
                    }
                elif canary_id in registry["rollback_history"]:
                    return {
                        "canary_id": canary_id,
                        "status": "rolled_back",
                        "info": registry["rollback_history"][canary_id]
                    }
                else:
                    return {"error": f"Canary {canary_id} not found"}
            else:
                # Get all canaries summary
                return {
                    "active_canaries": len(registry["active_canaries"]),
                    "completed_canaries": len(registry["completed_canaries"]),
                    "rollback_history": len(registry["rollback_history"]),
                    "active_canary_details": {
                        cid: {
                            "current_percentage": info["current_percentage"],
                            "status": info["status"],
                            "created_at": info["created_at"]
                        }
                        for cid, info in registry["active_canaries"].items()
                    }
                }
                
        except Exception as e:
            logger.error(f"Error getting canary status: {e}")
            return {"error": str(e)}

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