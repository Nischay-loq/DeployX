"""Backup manager for creating and restoring backups of files and folders."""
import os
import shutil
import logging
import zipfile
import json
from pathlib import Path
from typing import Optional, Dict, Any, List
from datetime import datetime
import tempfile

logger = logging.getLogger(__name__)


class BackupManager:
    """Manages backups for destructive commands."""
    
    def __init__(self, backup_dir: Optional[str] = None):
        """Initialize backup manager.
        
        Args:
            backup_dir: Directory to store backups. If None, uses agent/backups
        """
        if backup_dir is None:
            # Get agent directory
            agent_dir = Path(__file__).parent.parent
            backup_dir = agent_dir / "backups"
        else:
            backup_dir = Path(backup_dir)
        
        self.backup_dir = backup_dir
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        
        # Metadata file for tracking backups
        self.metadata_file = self.backup_dir / "backup_metadata.json"
        self.metadata = self._load_metadata()
        
        logger.info(f"BackupManager initialized with backup directory: {self.backup_dir}")
    
    def _load_metadata(self) -> Dict[str, Any]:
        """Load backup metadata from file."""
        if self.metadata_file.exists():
            try:
                with open(self.metadata_file, 'r') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Failed to load backup metadata: {e}")
                return {}
        return {}
    
    def _save_metadata(self):
        """Save backup metadata to file."""
        try:
            with open(self.metadata_file, 'w') as f:
                json.dump(self.metadata, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save backup metadata: {e}")
    
    def create_backup(
        self,
        target_path: str,
        backup_id: str,
        command: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[str]:
        """Create a backup of a file or folder.
        
        Args:
            target_path: Path to file or folder to backup
            backup_id: Unique identifier for this backup
            command: The command that triggered this backup
            metadata: Optional metadata to store with backup
        
        Returns:
            Path to backup zip file, or None if backup failed
        """
        try:
            target = Path(target_path)
            
            if not target.exists():
                logger.warning(f"Target path does not exist, skipping backup: {target_path}")
                return None
            
            # Create backup filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_filename = f"{backup_id}_{timestamp}.zip"
            backup_path = self.backup_dir / backup_filename
            
            logger.info(f"Creating backup: {target_path} -> {backup_path}")
            
            # Create zip backup
            with zipfile.ZipFile(backup_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                if target.is_file():
                    # Backup single file
                    zipf.write(target, target.name)
                    logger.info(f"Backed up file: {target.name}")
                elif target.is_dir():
                    # Backup entire directory
                    for root, dirs, files in os.walk(target):
                        for file in files:
                            file_path = Path(root) / file
                            arcname = file_path.relative_to(target.parent)
                            zipf.write(file_path, arcname)
                    logger.info(f"Backed up directory: {target} ({len(zipf.namelist())} files)")
            
            # Store metadata
            backup_meta = {
                'backup_id': backup_id,
                'backup_path': str(backup_path),
                'original_path': str(target_path),
                'command': command,
                'timestamp': timestamp,
                'created_at': datetime.now().isoformat(),
                'is_directory': target.is_dir(),
                'file_count': len(zipfile.ZipFile(backup_path).namelist()) if target.is_dir() else 1,
                'backup_size': backup_path.stat().st_size,
                'custom_metadata': metadata or {}
            }
            
            self.metadata[backup_id] = backup_meta
            self._save_metadata()
            
            logger.info(f"Backup created successfully: {backup_path} ({backup_meta['backup_size']} bytes)")
            return str(backup_path)
            
        except PermissionError as e:
            logger.error(f"Permission denied while creating backup: {e}")
            return None
        except Exception as e:
            logger.exception(f"Failed to create backup: {e}")
            return None
    
    def restore_backup(self, backup_id: str, restore_path: Optional[str] = None) -> bool:
        """Restore a backup.
        
        Args:
            backup_id: ID of backup to restore
            restore_path: Optional custom restore path. If None, restores to original location
        
        Returns:
            True if restore succeeded, False otherwise
        """
        try:
            if backup_id not in self.metadata:
                logger.error(f"Backup not found: {backup_id}")
                return False
            
            backup_meta = self.metadata[backup_id]
            backup_path = Path(backup_meta['backup_path'])
            
            if not backup_path.exists():
                logger.error(f"Backup file not found: {backup_path}")
                return False
            
            # Determine restore location
            if restore_path is None:
                restore_path = backup_meta['original_path']
            
            restore_target = Path(restore_path)
            
            logger.info(f"Restoring backup {backup_id}: {backup_path} -> {restore_target}")
            
            # If target exists, create a temporary backup
            temp_backup_path = None
            if restore_target.exists():
                logger.info(f"Target exists, creating temporary backup before restore")
                temp_backup_id = f"{backup_id}_temp_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
                temp_backup_path = self.create_backup(
                    str(restore_target),
                    temp_backup_id,
                    f"Temporary backup before restore of {backup_id}",
                    {'is_temp': True, 'parent_backup': backup_id}
                )
            
            try:
                # Remove existing target
                if restore_target.exists():
                    if restore_target.is_file():
                        restore_target.unlink()
                    elif restore_target.is_dir():
                        shutil.rmtree(restore_target)
                
                # Extract backup
                with zipfile.ZipFile(backup_path, 'r') as zipf:
                    if backup_meta['is_directory']:
                        # Restore directory
                        zipf.extractall(restore_target.parent)
                        logger.info(f"Restored directory: {restore_target} ({len(zipf.namelist())} files)")
                    else:
                        # Restore single file
                        restore_target.parent.mkdir(parents=True, exist_ok=True)
                        with zipf.open(zipf.namelist()[0]) as source:
                            with open(restore_target, 'wb') as target:
                                shutil.copyfileobj(source, target)
                        logger.info(f"Restored file: {restore_target}")
                
                # Update metadata
                backup_meta['last_restored'] = datetime.now().isoformat()
                backup_meta['restore_count'] = backup_meta.get('restore_count', 0) + 1
                self._save_metadata()
                
                # Clean up temporary backup if restore succeeded
                if temp_backup_path:
                    temp_backup_id = Path(temp_backup_path).stem.split('_')[0]
                    self.delete_backup(temp_backup_id)
                
                logger.info(f"Backup restored successfully: {backup_id}")
                return True
                
            except Exception as e:
                logger.error(f"Failed to restore backup, attempting to restore temporary backup: {e}")
                # If restore failed and we have a temp backup, try to restore it
                if temp_backup_path:
                    try:
                        temp_backup_id = Path(temp_backup_path).stem.split('_')[0]
                        self.restore_backup(temp_backup_id, str(restore_target))
                        logger.info("Temporary backup restored after failed restore")
                    except Exception as restore_err:
                        logger.error(f"Failed to restore temporary backup: {restore_err}")
                raise
                
        except Exception as e:
            logger.exception(f"Failed to restore backup {backup_id}: {e}")
            return False
    
    def delete_backup(self, backup_id: str) -> bool:
        """Delete a backup.
        
        Args:
            backup_id: ID of backup to delete
        
        Returns:
            True if deletion succeeded, False otherwise
        """
        try:
            if backup_id not in self.metadata:
                logger.warning(f"Backup not found: {backup_id}")
                return False
            
            backup_meta = self.metadata[backup_id]
            backup_path = Path(backup_meta['backup_path'])
            
            if backup_path.exists():
                backup_path.unlink()
                logger.info(f"Deleted backup file: {backup_path}")
            
            del self.metadata[backup_id]
            self._save_metadata()
            
            logger.info(f"Backup deleted: {backup_id}")
            return True
            
        except Exception as e:
            logger.exception(f"Failed to delete backup {backup_id}: {e}")
            return False
    
    def get_backup_info(self, backup_id: str) -> Optional[Dict[str, Any]]:
        """Get information about a backup.
        
        Args:
            backup_id: ID of backup
        
        Returns:
            Backup metadata or None if not found
        """
        return self.metadata.get(backup_id)
    
    def list_backups(self, filter_command: Optional[str] = None) -> List[Dict[str, Any]]:
        """List all backups.
        
        Args:
            filter_command: Optional command filter
        
        Returns:
            List of backup metadata
        """
        backups = list(self.metadata.values())
        
        if filter_command:
            backups = [b for b in backups if filter_command in b.get('command', '')]
        
        # Sort by creation time (newest first)
        backups.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        
        return backups
    
    def cleanup_old_backups(self, max_age_days: int = 30, max_backups: int = 100) -> int:
        """Clean up old backups.
        
        Args:
            max_age_days: Maximum age of backups to keep
            max_backups: Maximum number of backups to keep
        
        Returns:
            Number of backups deleted
        """
        try:
            deleted_count = 0
            backups = self.list_backups()
            
            # Delete backups older than max_age_days
            cutoff_date = datetime.now().timestamp() - (max_age_days * 86400)
            
            for backup in backups:
                created_at = datetime.fromisoformat(backup['created_at']).timestamp()
                
                if created_at < cutoff_date:
                    if self.delete_backup(backup['backup_id']):
                        deleted_count += 1
            
            # Delete excess backups (keep only newest max_backups)
            if len(self.metadata) > max_backups:
                backups = self.list_backups()
                for backup in backups[max_backups:]:
                    if self.delete_backup(backup['backup_id']):
                        deleted_count += 1
            
            logger.info(f"Cleaned up {deleted_count} old backups")
            return deleted_count
            
        except Exception as e:
            logger.exception(f"Failed to cleanup old backups: {e}")
            return 0
    
    def get_backup_size(self) -> Dict[str, Any]:
        """Get total size of all backups.
        
        Returns:
            Dictionary with size information
        """
        total_size = 0
        backup_count = 0
        
        for backup_id, backup_meta in self.metadata.items():
            backup_path = Path(backup_meta['backup_path'])
            if backup_path.exists():
                total_size += backup_path.stat().st_size
                backup_count += 1
        
        return {
            'total_size_bytes': total_size,
            'total_size_mb': round(total_size / (1024 * 1024), 2),
            'backup_count': backup_count,
            'backup_dir': str(self.backup_dir)
        }
