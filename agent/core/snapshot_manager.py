"""System snapshot manager for command rollback functionality."""
import os
import json
import shutil
import hashlib
import asyncio
import logging
from pathlib import Path
from typing import Dict, List, Optional, Set, Any
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict

logger = logging.getLogger(__name__)


@dataclass
class FileSnapshot:
    """Represents a snapshot of a single file."""
    path: str
    exists: bool
    is_dir: bool
    content_hash: Optional[str] = None
    size: Optional[int] = None
    modified_time: Optional[float] = None
    permissions: Optional[int] = None
    backup_path: Optional[str] = None


@dataclass
class SystemSnapshot:
    """Represents a complete system snapshot."""
    snapshot_id: str
    timestamp: float
    command: str
    command_index: Optional[int]  # For batch commands
    batch_id: Optional[str]  # For batch commands
    working_directory: str
    monitored_paths: List[str]
    file_snapshots: List[FileSnapshot]
    environment_vars: Dict[str, str]
    metadata: Dict[str, Any]

    def to_dict(self) -> Dict:
        """Convert snapshot to dictionary for JSON serialization."""
        return {
            'snapshot_id': self.snapshot_id,
            'timestamp': self.timestamp,
            'command': self.command,
            'command_index': self.command_index,
            'batch_id': self.batch_id,
            'working_directory': self.working_directory,
            'monitored_paths': self.monitored_paths,
            'file_snapshots': [asdict(fs) for fs in self.file_snapshots],
            'environment_vars': self.environment_vars,
            'metadata': self.metadata
        }

    @staticmethod
    def from_dict(data: Dict) -> 'SystemSnapshot':
        """Create snapshot from dictionary."""
        return SystemSnapshot(
            snapshot_id=data['snapshot_id'],
            timestamp=data['timestamp'],
            command=data['command'],
            command_index=data.get('command_index'),
            batch_id=data.get('batch_id'),
            working_directory=data['working_directory'],
            monitored_paths=data['monitored_paths'],
            file_snapshots=[FileSnapshot(**fs) for fs in data['file_snapshots']],
            environment_vars=data['environment_vars'],
            metadata=data.get('metadata', {})
        )


class SnapshotManager:
    """Manages system snapshots for command rollback."""
    
    def __init__(self, snapshot_dir: Optional[str] = None):
        """Initialize the snapshot manager.
        
        Args:
            snapshot_dir: Directory to store snapshots (default: .deployx_snapshots in temp)
        """
        if snapshot_dir is None:
            import tempfile
            snapshot_dir = os.path.join(tempfile.gettempdir(), '.deployx_snapshots')
        
        self.snapshot_dir = Path(snapshot_dir)
        self.snapshot_dir.mkdir(parents=True, exist_ok=True)
        
        self.snapshots: Dict[str, SystemSnapshot] = {}
        self.batch_snapshots: Dict[str, List[str]] = {}  # batch_id -> [snapshot_ids]
        
        self._cleanup_task: Optional[asyncio.Task] = None
        self._running = False
        
        logger.info(f"SnapshotManager initialized with directory: {self.snapshot_dir}")
        
        # Load existing snapshots
        self._load_snapshots()

    def _generate_snapshot_id(self, command: str, batch_id: Optional[str] = None) -> str:
        """Generate a unique snapshot ID."""
        timestamp = datetime.now().isoformat()
        content = f"{timestamp}_{command}_{batch_id or ''}"
        return hashlib.sha256(content.encode()).hexdigest()[:16]

    def _compute_file_hash(self, filepath: Path) -> Optional[str]:
        """Compute SHA256 hash of a file."""
        try:
            if not filepath.exists() or filepath.is_dir():
                return None
            
            sha256 = hashlib.sha256()
            with open(filepath, 'rb') as f:
                for chunk in iter(lambda: f.read(8192), b''):
                    sha256.update(chunk)
            return sha256.hexdigest()
        except Exception as e:
            logger.warning(f"Failed to compute hash for {filepath}: {e}")
            return None

    def _get_monitored_paths(self, working_dir: str, command: str) -> List[str]:
        """Determine which paths to monitor based on the command.
        
        This intelligently monitors paths that might be affected by the command.
        """
        paths = [working_dir]  # Always monitor working directory
        
        # Parse command for specific paths
        # Add intelligent detection based on command keywords
        if any(keyword in command.lower() for keyword in ['mkdir', 'touch', 'new-item', 'md']):
            # Extract the path argument
            parts = command.split()
            for i, part in enumerate(parts):
                if i > 0 and not part.startswith('-'):
                    target_path = os.path.join(working_dir, part)
                    parent_dir = os.path.dirname(target_path)
                    if parent_dir and parent_dir not in paths:
                        paths.append(parent_dir)
        
        if any(keyword in command.lower() for keyword in ['cd', 'chdir', 'set-location']):
            # For directory changes, monitor both current and target
            parts = command.split()
            if len(parts) > 1:
                target_path = parts[1]
                if not os.path.isabs(target_path):
                    target_path = os.path.join(working_dir, target_path)
                if target_path not in paths:
                    paths.append(target_path)
        
        if any(keyword in command.lower() for keyword in ['rm', 'del', 'remove', 'remove-item', 'rmdir']):
            # Monitor parent directory of items being deleted
            parts = command.split()
            for part in parts[1:]:
                if not part.startswith('-'):
                    target_path = os.path.join(working_dir, part)
                    parent_dir = os.path.dirname(target_path)
                    if parent_dir and parent_dir not in paths:
                        paths.append(parent_dir)
        
        return paths

    def _snapshot_path(self, filepath: Path, snapshot_id: str) -> Optional[Path]:
        """Create a backup copy of a file and return the backup path."""
        try:
            if not filepath.exists() or filepath.is_dir():
                return None
            
            backup_dir = self.snapshot_dir / snapshot_id / 'files'
            backup_dir.mkdir(parents=True, exist_ok=True)
            
            # Create relative path structure
            relative_path = filepath.name  # Simplified for now
            backup_path = backup_dir / relative_path
            
            # Handle duplicate filenames by adding numbers
            counter = 1
            original_backup_path = backup_path
            while backup_path.exists():
                backup_path = backup_dir / f"{original_backup_path.stem}_{counter}{original_backup_path.suffix}"
                counter += 1
            
            shutil.copy2(filepath, backup_path)
            logger.debug(f"Backed up {filepath} to {backup_path}")
            return backup_path
            
        except Exception as e:
            logger.error(f"Failed to backup {filepath}: {e}")
            return None

    def _capture_file_snapshot(self, filepath: Path, snapshot_id: str) -> FileSnapshot:
        """Capture the state of a file or directory."""
        try:
            exists = filepath.exists()
            is_dir = filepath.is_dir() if exists else False
            
            snapshot = FileSnapshot(
                path=str(filepath.absolute()),
                exists=exists,
                is_dir=is_dir
            )
            
            if exists and not is_dir:
                snapshot.content_hash = self._compute_file_hash(filepath)
                snapshot.size = filepath.stat().st_size
                snapshot.modified_time = filepath.stat().st_mtime
                snapshot.permissions = filepath.stat().st_mode
                snapshot.backup_path = str(self._snapshot_path(filepath, snapshot_id))
            
            return snapshot
            
        except Exception as e:
            logger.error(f"Failed to capture snapshot for {filepath}: {e}")
            return FileSnapshot(path=str(filepath), exists=False, is_dir=False)

    def _get_directory_files(self, directory: Path, recursive: bool = True) -> Set[Path]:
        """Get all files in a directory."""
        files = set()
        try:
            if not directory.exists() or not directory.is_dir():
                return files
            
            if recursive:
                for item in directory.rglob('*'):
                    if item.is_file():
                        files.add(item)
            else:
                for item in directory.iterdir():
                    if item.is_file():
                        files.add(item)
                    elif item.is_dir():
                        files.add(item)
            
        except Exception as e:
            logger.error(f"Failed to list directory {directory}: {e}")
        
        return files

    async def create_snapshot(
        self,
        command: str,
        working_dir: Optional[str] = None,
        batch_id: Optional[str] = None,
        command_index: Optional[int] = None,
        monitored_paths: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """Create a system snapshot before executing a command.
        
        Args:
            command: The command that will be executed
            working_dir: Current working directory
            batch_id: ID of batch if this is part of a batch
            command_index: Index of command in batch
            monitored_paths: Specific paths to monitor (if None, auto-detect)
            metadata: Additional metadata to store
        
        Returns:
            Snapshot ID
        """
        try:
            if working_dir is None:
                working_dir = os.getcwd()
            
            snapshot_id = self._generate_snapshot_id(command, batch_id)
            
            # Determine paths to monitor
            if monitored_paths is None:
                monitored_paths = self._get_monitored_paths(working_dir, command)
            
            # Capture file snapshots
            file_snapshots = []
            for path_str in monitored_paths:
                path = Path(path_str)
                
                if path.is_dir():
                    # Snapshot all files in directory
                    files = self._get_directory_files(path, recursive=True)
                    for file_path in files:
                        fs = self._capture_file_snapshot(file_path, snapshot_id)
                        file_snapshots.append(fs)
                else:
                    # Snapshot single file or non-existent path
                    fs = self._capture_file_snapshot(path, snapshot_id)
                    file_snapshots.append(fs)
            
            # Capture environment variables (subset that might affect commands)
            env_vars = {
                'PATH': os.environ.get('PATH', ''),
                'HOME': os.environ.get('HOME', ''),
                'USER': os.environ.get('USER', ''),
                'PWD': os.environ.get('PWD', working_dir)
            }
            
            # Create snapshot
            snapshot = SystemSnapshot(
                snapshot_id=snapshot_id,
                timestamp=datetime.now().timestamp(),
                command=command,
                command_index=command_index,
                batch_id=batch_id,
                working_directory=working_dir,
                monitored_paths=monitored_paths,
                file_snapshots=file_snapshots,
                environment_vars=env_vars,
                metadata=metadata or {}
            )
            
            # Store snapshot
            self.snapshots[snapshot_id] = snapshot
            
            # Track batch association
            if batch_id:
                if batch_id not in self.batch_snapshots:
                    self.batch_snapshots[batch_id] = []
                self.batch_snapshots[batch_id].append(snapshot_id)
            
            # Persist to disk
            await self._save_snapshot(snapshot)
            
            logger.info(f"Created snapshot {snapshot_id} for command: {command}")
            logger.debug(f"Monitored {len(file_snapshots)} files in {len(monitored_paths)} paths")
            
            return snapshot_id
            
        except Exception as e:
            logger.error(f"Failed to create snapshot: {e}")
            raise

    async def rollback_snapshot(self, snapshot_id: str) -> bool:
        """Rollback to a specific snapshot.
        
        Args:
            snapshot_id: ID of snapshot to restore
        
        Returns:
            True if rollback successful
        """
        try:
            if snapshot_id not in self.snapshots:
                logger.error(f"Snapshot {snapshot_id} not found")
                return False
            
            snapshot = self.snapshots[snapshot_id]
            logger.info(f"Rolling back snapshot {snapshot_id} for command: {snapshot.command}")
            
            success_count = 0
            failure_count = 0
            
            # Restore files
            for file_snapshot in snapshot.file_snapshots:
                try:
                    filepath = Path(file_snapshot.path)
                    
                    if file_snapshot.exists and file_snapshot.backup_path:
                        # File existed before - restore from backup
                        backup_path = Path(file_snapshot.backup_path)
                        if backup_path.exists():
                            filepath.parent.mkdir(parents=True, exist_ok=True)
                            shutil.copy2(backup_path, filepath)
                            logger.debug(f"Restored {filepath} from backup")
                            success_count += 1
                        else:
                            logger.warning(f"Backup not found: {backup_path}")
                            failure_count += 1
                    
                    elif not file_snapshot.exists and filepath.exists():
                        # File didn't exist before but exists now - remove it
                        if filepath.is_file():
                            filepath.unlink()
                            logger.debug(f"Removed new file {filepath}")
                            success_count += 1
                        elif filepath.is_dir():
                            shutil.rmtree(filepath)
                            logger.debug(f"Removed new directory {filepath}")
                            success_count += 1
                    
                    else:
                        # No change needed
                        success_count += 1
                        
                except Exception as e:
                    logger.error(f"Failed to restore {file_snapshot.path}: {e}")
                    failure_count += 1
            
            logger.info(f"Rollback complete: {success_count} succeeded, {failure_count} failed")
            return failure_count == 0
            
        except Exception as e:
            logger.error(f"Failed to rollback snapshot {snapshot_id}: {e}")
            return False

    async def rollback_batch(self, batch_id: str) -> bool:
        """Rollback all commands in a batch.
        
        Args:
            batch_id: ID of the batch to rollback
        
        Returns:
            True if all rollbacks successful
        """
        try:
            if batch_id not in self.batch_snapshots:
                logger.error(f"Batch {batch_id} not found")
                return False
            
            snapshot_ids = self.batch_snapshots[batch_id]
            logger.info(f"Rolling back batch {batch_id} with {len(snapshot_ids)} snapshots")
            
            # Rollback in reverse order (last command first)
            all_success = True
            for snapshot_id in reversed(snapshot_ids):
                success = await self.rollback_snapshot(snapshot_id)
                if not success:
                    all_success = False
                    logger.warning(f"Failed to rollback snapshot {snapshot_id}")
            
            return all_success
            
        except Exception as e:
            logger.error(f"Failed to rollback batch {batch_id}: {e}")
            return False

    async def delete_snapshot(self, snapshot_id: str) -> bool:
        """Delete a snapshot and its backup files.
        
        Args:
            snapshot_id: ID of snapshot to delete
        
        Returns:
            True if deletion successful
        """
        try:
            if snapshot_id not in self.snapshots:
                logger.warning(f"Snapshot {snapshot_id} not found")
                return False
            
            snapshot = self.snapshots[snapshot_id]
            
            # Delete backup directory
            backup_dir = self.snapshot_dir / snapshot_id
            if backup_dir.exists():
                shutil.rmtree(backup_dir)
                logger.debug(f"Deleted backup directory: {backup_dir}")
            
            # Delete metadata file
            metadata_file = self.snapshot_dir / f"{snapshot_id}.json"
            if metadata_file.exists():
                metadata_file.unlink()
                logger.debug(f"Deleted metadata file: {metadata_file}")
            
            # Remove from memory
            del self.snapshots[snapshot_id]
            
            # Remove from batch tracking
            if snapshot.batch_id and snapshot.batch_id in self.batch_snapshots:
                self.batch_snapshots[snapshot.batch_id].remove(snapshot_id)
                if not self.batch_snapshots[snapshot.batch_id]:
                    del self.batch_snapshots[snapshot.batch_id]
            
            logger.info(f"Deleted snapshot {snapshot_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete snapshot {snapshot_id}: {e}")
            return False

    async def delete_batch_snapshots(self, batch_id: str) -> bool:
        """Delete all snapshots for a batch.
        
        Args:
            batch_id: ID of batch
        
        Returns:
            True if all deletions successful
        """
        try:
            if batch_id not in self.batch_snapshots:
                logger.warning(f"Batch {batch_id} not found")
                return False
            
            snapshot_ids = self.batch_snapshots[batch_id].copy()
            logger.info(f"Deleting {len(snapshot_ids)} snapshots for batch {batch_id}")
            
            all_success = True
            for snapshot_id in snapshot_ids:
                success = await self.delete_snapshot(snapshot_id)
                if not success:
                    all_success = False
            
            return all_success
            
        except Exception as e:
            logger.error(f"Failed to delete batch snapshots for {batch_id}: {e}")
            return False

    async def _save_snapshot(self, snapshot: SystemSnapshot):
        """Save snapshot metadata to disk."""
        try:
            metadata_file = self.snapshot_dir / f"{snapshot.snapshot_id}.json"
            with open(metadata_file, 'w') as f:
                json.dump(snapshot.to_dict(), f, indent=2)
            logger.debug(f"Saved snapshot metadata: {metadata_file}")
        except Exception as e:
            logger.error(f"Failed to save snapshot metadata: {e}")

    def _load_snapshots(self):
        """Load existing snapshots from disk."""
        try:
            for metadata_file in self.snapshot_dir.glob("*.json"):
                try:
                    with open(metadata_file, 'r') as f:
                        data = json.load(f)
                    
                    snapshot = SystemSnapshot.from_dict(data)
                    self.snapshots[snapshot.snapshot_id] = snapshot
                    
                    # Rebuild batch tracking
                    if snapshot.batch_id:
                        if snapshot.batch_id not in self.batch_snapshots:
                            self.batch_snapshots[snapshot.batch_id] = []
                        self.batch_snapshots[snapshot.batch_id].append(snapshot.snapshot_id)
                    
                    logger.debug(f"Loaded snapshot {snapshot.snapshot_id}")
                    
                except Exception as e:
                    logger.error(f"Failed to load snapshot from {metadata_file}: {e}")
            
            logger.info(f"Loaded {len(self.snapshots)} snapshots from disk")
            
        except Exception as e:
            logger.error(f"Failed to load snapshots: {e}")

    async def cleanup_old_snapshots(self, max_age_hours: int = 24):
        """Delete snapshots older than specified age.
        
        Args:
            max_age_hours: Maximum age in hours (default 24)
        """
        try:
            cutoff_time = datetime.now().timestamp() - (max_age_hours * 3600)
            deleted_count = 0
            
            snapshot_ids_to_delete = [
                sid for sid, snapshot in self.snapshots.items()
                if snapshot.timestamp < cutoff_time
            ]
            
            for snapshot_id in snapshot_ids_to_delete:
                if await self.delete_snapshot(snapshot_id):
                    deleted_count += 1
            
            if deleted_count > 0:
                logger.info(f"Cleaned up {deleted_count} old snapshots (older than {max_age_hours} hours)")
            
        except Exception as e:
            logger.error(f"Failed to cleanup old snapshots: {e}")

    async def start_cleanup_task(self, interval_hours: int = 1, max_age_hours: int = 24):
        """Start background task to periodically cleanup old snapshots.
        
        Args:
            interval_hours: Cleanup interval in hours
            max_age_hours: Maximum age of snapshots in hours
        """
        if self._running:
            logger.warning("Cleanup task already running")
            return
        
        self._running = True
        
        async def cleanup_loop():
            while self._running:
                try:
                    await asyncio.sleep(interval_hours * 3600)
                    await self.cleanup_old_snapshots(max_age_hours)
                except asyncio.CancelledError:
                    break
                except Exception as e:
                    logger.error(f"Error in cleanup task: {e}")
        
        self._cleanup_task = asyncio.create_task(cleanup_loop())
        logger.info(f"Started snapshot cleanup task (interval: {interval_hours}h, max age: {max_age_hours}h)")

    async def stop_cleanup_task(self):
        """Stop the cleanup task."""
        if self._cleanup_task:
            self._running = False
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
            logger.info("Stopped snapshot cleanup task")

    def get_snapshot_info(self, snapshot_id: str) -> Optional[Dict[str, Any]]:
        """Get information about a snapshot.
        
        Args:
            snapshot_id: Snapshot ID
        
        Returns:
            Dictionary with snapshot information or None if not found
        """
        if snapshot_id not in self.snapshots:
            return None
        
        snapshot = self.snapshots[snapshot_id]
        return {
            'snapshot_id': snapshot.snapshot_id,
            'timestamp': snapshot.timestamp,
            'age_hours': (datetime.now().timestamp() - snapshot.timestamp) / 3600,
            'command': snapshot.command,
            'command_index': snapshot.command_index,
            'batch_id': snapshot.batch_id,
            'working_directory': snapshot.working_directory,
            'file_count': len(snapshot.file_snapshots),
            'monitored_paths': snapshot.monitored_paths,
            'metadata': snapshot.metadata
        }

    def get_batch_info(self, batch_id: str) -> Optional[Dict[str, Any]]:
        """Get information about a batch's snapshots.
        
        Args:
            batch_id: Batch ID
        
        Returns:
            Dictionary with batch information or None if not found
        """
        if batch_id not in self.batch_snapshots:
            return None
        
        snapshot_ids = self.batch_snapshots[batch_id]
        snapshots_info = [self.get_snapshot_info(sid) for sid in snapshot_ids]
        
        return {
            'batch_id': batch_id,
            'snapshot_count': len(snapshot_ids),
            'snapshot_ids': snapshot_ids,
            'snapshots': snapshots_info
        }

    def list_snapshots(self) -> List[Dict[str, Any]]:
        """List all snapshots.
        
        Returns:
            List of snapshot information dictionaries
        """
        return [self.get_snapshot_info(sid) for sid in self.snapshots.keys()]

    def list_batches(self) -> List[Dict[str, Any]]:
        """List all batches.
        
        Returns:
            List of batch information dictionaries
        """
        return [self.get_batch_info(bid) for bid in self.batch_snapshots.keys()]
