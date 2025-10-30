# Backup and Rollback System

## Overview

The DeployX agent now includes an intelligent backup and rollback system that automatically detects destructive commands, creates backups before execution, and allows rollback if needed.

## Features

### 1. Destructive Command Detection
The system automatically detects potentially destructive commands including:
- **File/Directory Deletion**: `del`, `rm`, `Remove-Item`, `rd`, `rmdir`
- **File/Directory Move/Rename**: `move`, `mv`, `ren`, `rename`, `Move-Item`, `Rename-Item`
- **Format Operations**: `format`, `diskpart`, `mkfs`, `fdisk`
- **File Truncation**: Output redirection (`>`), `Clear-Content`, `truncate`
- **Registry Operations**: `reg delete`, `reg add /f`
- **Database Operations**: `DROP`, `TRUNCATE`, `DELETE FROM`
- **System Operations**: `shutdown`, `reboot`, service stop/disable

### 2. Automatic Backup
When a destructive command is detected:
- The system analyzes the command to extract affected file/folder paths
- Creates compressed ZIP backups of affected paths (if they exist)
- Stores backups in the agent's `backups/` directory
- Tracks backup metadata including:
  - Original path
  - Command that triggered the backup
  - Timestamp
  - File count and backup size
  - Custom metadata

### 3. Severity Classification
Commands are classified by severity:
- **Low**: Safe operations (read-only, append operations)
- **Medium**: Basic destructive operations (single file deletion)
- **High**: Dangerous operations (recursive deletion, wildcards, force flags)
- **Critical**: System-wide operations (format, registry, system paths)

### 4. Rollback Capability
- **Single Command Rollback**: Restore backups for a specific command
- **Batch Rollback**: Restore all backups from an entire batch execution (in reverse order)
- Automatic cleanup of temporary backups on successful restore
- Fail-safe restoration (creates temp backup before restoring)

## Architecture

### Core Components

#### 1. `backup_manager.py`
Manages backup creation, restoration, and cleanup:
```python
class BackupManager:
    def create_backup(target_path, backup_id, command, metadata) -> str
    def restore_backup(backup_id, restore_path=None) -> bool
    def delete_backup(backup_id) -> bool
    def get_backup_info(backup_id) -> dict
    def list_backups(filter_command=None) -> list
    def cleanup_old_backups(max_age_days=30, max_backups=100) -> int
    def get_backup_size() -> dict
```

#### 2. `destructive_detector.py`
Detects and analyzes destructive commands:
```python
class DestructiveCommandDetector:
    def is_destructive(command) -> bool
    def analyze_command(command) -> dict
    def extract_paths(command) -> list
    def get_backup_paths(command) -> list
```

#### 3. `command_executor.py` (Updated)
Integrated backup/rollback into command execution:
```python
class CommandExecutor:
    # Existing methods enhanced with backup support
    async def execute_command(..., command_id=None) -> CommandResult
    async def execute_batch(...) -> BatchResult
    
    # New rollback methods
    async def rollback_command(command_id) -> bool
    async def rollback_batch(batch_id) -> bool
    def get_command_backups(command_id) -> list
    def get_batch_backups(batch_id) -> list
    def list_all_backups() -> dict
    async def cleanup_old_backups(...) -> int
```

### Data Structures

#### CommandResult (Enhanced)
```python
@dataclass
class CommandResult:
    command: str
    success: bool
    output: str
    error: Optional[str] = None
    execution_time: float = 0.0
    command_index: Optional[int] = None
    backup_id: Optional[str] = None          # NEW
    backup_path: Optional[str] = None        # NEW
    is_destructive: bool = False             # NEW
    destructive_info: Optional[Dict] = None  # NEW
```

## Usage

### Agent Side

#### Automatic Backup (Default Behavior)
```python
# Destructive commands are automatically backed up
executor = CommandExecutor(shell_manager, connection, enable_auto_backup=True)

# Execute command - backup created automatically if destructive
result = await executor.execute_command("rm -rf /path/to/folder")

# Check if backup was created
if result.is_destructive:
    print(f"Backup created: {result.backup_id}")
    print(f"Backup path: {result.backup_path}")
    print(f"Analysis: {result.destructive_info}")
```

#### Manual Rollback
```python
# Rollback a specific command
success = await executor.rollback_command("cmd_abc123")

# Rollback entire batch
success = await executor.rollback_batch("batch_xyz789")
```

#### List Backups
```python
# Get all backups
backups_info = executor.list_all_backups()

# backups_info contains:
# - command_backups: dict of command_id -> [backup_ids]
# - batch_backups: dict of batch_id -> [backup_ids]
# - all_backups: list of all backup metadata
# - backup_size: total size information
```

#### Cleanup Old Backups
```python
# Clean backups older than 30 days or keep only 100 newest
deleted_count = await executor.cleanup_old_backups(
    max_age_days=30,
    max_backups=100
)
```

### Socket Events

#### Agent → Backend Events

**Destructive Command Detected**
```javascript
socket.emit('destructive_command_detected', {
    command_id: 'cmd_abc123',
    command: 'rm -rf /data',
    analysis: {
        is_destructive: true,
        category: 'delete',
        affected_paths: ['/data'],
        severity: 'high',
        description: 'Recursively deletes files or directories',
        requires_backup: true
    }
})
```

**Backup Started**
```javascript
socket.emit('backup_started', {
    command_id: 'cmd_abc123',
    command: 'rm -rf /data',
    paths: ['/data']
})
```

**Backup Completed**
```javascript
socket.emit('backup_completed', {
    command_id: 'cmd_abc123',
    backup_ids: ['cmd_abc123_path0'],
    backup_count: 1
})
```

**Rollback Started/Completed**
```javascript
socket.emit('rollback_started', {
    command_id: 'cmd_abc123',
    backup_count: 1
})

socket.emit('rollback_completed', {
    command_id: 'cmd_abc123',
    success: true,
    restored_count: 1,
    total_count: 1
})
```

#### Backend → Agent Events

**Request Rollback**
```javascript
// Rollback single command
socket.emit('rollback_command', {
    command_id: 'cmd_abc123'
})

// Rollback batch
socket.emit('rollback_batch', {
    batch_id: 'batch_xyz789'
})
```

**Get Backup Info**
```javascript
socket.emit('get_backup_info', {
    backup_id: 'cmd_abc123_path0'
})

// Response: backup_info_result
```

**List All Backups**
```javascript
socket.emit('list_backups', {})

// Response: backups_list_result
```

## Storage

### Directory Structure
```
agent/
├── backups/
│   ├── backup_metadata.json         # Metadata for all backups
│   ├── cmd_abc123_path0_20251030_143022.zip
│   ├── cmd_def456_path0_20251030_143525.zip
│   └── batch_xyz789_cmd0_path0_20251030_144001.zip
└── core/
    ├── backup_manager.py
    ├── destructive_detector.py
    └── command_executor.py
```

### Backup Metadata Format
```json
{
  "cmd_abc123_path0": {
    "backup_id": "cmd_abc123_path0",
    "backup_path": "/agent/backups/cmd_abc123_path0_20251030_143022.zip",
    "original_path": "/path/to/folder",
    "command": "rm -rf /path/to/folder",
    "timestamp": "20251030_143022",
    "created_at": "2025-10-30T14:30:22.123456",
    "is_directory": true,
    "file_count": 42,
    "backup_size": 1048576,
    "custom_metadata": {
      "command_id": "cmd_abc123",
      "analysis": {...},
      "working_dir": "/home/user",
      "path_index": 0
    },
    "last_restored": "2025-10-30T15:00:00.000000",
    "restore_count": 1
  }
}
```

## Configuration

### Enable/Disable Auto-Backup
```python
# Disable auto-backup
executor = CommandExecutor(
    shell_manager,
    connection,
    enable_auto_backup=False  # No automatic backups
)

# Use custom backup manager
custom_backup_mgr = BackupManager(backup_dir="/custom/backup/path")
executor = CommandExecutor(
    shell_manager,
    connection,
    backup_manager=custom_backup_mgr
)
```

### Customize Backup Retention
```python
# Cleanup backups older than 7 days, keep only 50
await executor.cleanup_old_backups(
    max_age_days=7,
    max_backups=50
)
```

## Security Considerations

1. **Path Validation**: All paths are validated before backup/restore
2. **Permission Handling**: Backup operations respect file system permissions
3. **System Path Protection**: Critical system paths are detected and flagged as high/critical severity
4. **Fail-Safe Restore**: Temporary backup created before restore to prevent data loss
5. **Metadata Tracking**: All operations are logged with timestamps and metadata

## Performance

- **Backup Speed**: Compressed ZIP format with fast compression
- **Storage Efficiency**: Only existing paths are backed up
- **Minimal Overhead**: Backup only created when destructive command detected
- **Async Operations**: Non-blocking backup/restore operations

## Limitations

1. **Partition/Drive Format**: Cannot backup entire partitions (too large, marked as critical)
2. **System State**: Cannot backup entire system state
3. **Running Processes**: Cannot backup files in use by other processes
4. **Large Files**: Very large files/directories may take time to backup
5. **Cross-Platform**: Path patterns are OS-specific

## Examples

### Example 1: Delete with Automatic Backup
```python
# Command: del /s /q C:\temp\old_data
# Detection: Destructive (recursive delete)
# Action: Backup created at backups/cmd_xyz_path0_20251030.zip
# Result: Command executed, backup available for rollback
```

### Example 2: Safe Command (No Backup)
```python
# Command: dir C:\temp
# Detection: Not destructive (read-only)
# Action: No backup created
# Result: Command executed normally
```

### Example 3: Batch with Mixed Commands
```python
# Batch: ['cd /data', 'ls -la', 'rm -rf old/', 'cp new/* .']
# Detection: Command 3 is destructive
# Action: Backup created only for 'rm -rf old/'
# Result: All commands execute, only destructive one has backup
```

### Example 4: Rollback After Failed Operation
```python
# Command executed: rm -rf /important/data
# Backup created: cmd_abc_path0
# Later: Oops, wrong folder!
# Rollback: await executor.rollback_command('cmd_abc')
# Result: /important/data restored from backup
```

## Future Enhancements

- [ ] Incremental backups
- [ ] Backup compression levels
- [ ] Backup encryption
- [ ] Remote backup storage
- [ ] Backup scheduling
- [ ] Backup verification
- [ ] Differential restore
- [ ] Backup catalog search
