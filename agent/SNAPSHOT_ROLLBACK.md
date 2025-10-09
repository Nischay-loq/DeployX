# Snapshot and Rollback System

## Overview

The DeployX agent includes a comprehensive snapshot and rollback system that automatically captures the system state before executing commands, allowing for easy rollback if something goes wrong.

## Architecture

### Components

1. **SnapshotManager** (`agent/core/snapshot_manager.py`)
   - Captures file system state before command execution
   - Stores snapshots with metadata
   - Handles rollback operations
   - Automatic cleanup of old snapshots (default: 24 hours)

2. **CommandExecutor** (`agent/core/command_executor.py`)
   - Wraps command execution with snapshot creation
   - Maintains persistent shell context for batch commands
   - Handles both single and batch command execution
   - Integrates with SnapshotManager for rollback

3. **SocketEventHandler** (`agent/handlers/socket_handlers.py`)
   - Provides socket.io event handlers for backend communication
   - Handles rollback requests from backend
   - Emits progress and status updates

## Features

### Automatic Snapshot Creation

- **Single Commands**: Creates a snapshot before executing each command
- **Batch Commands**: Creates a snapshot before each command in a batch
- **Persistent Shell Context**: Maintains the same shell session across batch commands (e.g., `cd` commands persist)

### Intelligent Path Monitoring

The snapshot system intelligently monitors paths based on the command:

- **Directory creation** (`mkdir`, `md`, `New-Item`): Monitors parent directory
- **Directory changes** (`cd`, `chdir`, `Set-Location`): Monitors both current and target
- **File/directory deletion** (`rm`, `del`, `Remove-Item`): Monitors parent directory
- **Default**: Always monitors the current working directory

### Rollback Capabilities

- **Single Command Rollback**: Restore system state for a specific command
- **Batch Rollback**: Rollback all commands in a batch (in reverse order)
- **File State Restoration**: 
  - Restores files that existed before command
  - Removes files created by the command
  - Restores file permissions and timestamps

### Automatic Cleanup

- **Time-based**: Snapshots older than 24 hours are automatically deleted
- **Configurable**: Cleanup interval and max age can be configured via CLI arguments
- **Manual Cleanup**: Snapshots can be manually deleted via API

## Usage

### Agent CLI Arguments

```bash
python -m agent.main \
  --snapshot-cleanup-interval 1 \    # Cleanup runs every 1 hour
  --snapshot-max-age 24              # Snapshots older than 24 hours are deleted
```

### Backend Integration

The backend can send the following socket.io events to control snapshots:

#### Execute Command with Snapshot

```javascript
// Single command (automatically creates snapshot)
socket.emit('execute_deployment_command', {
  command_id: 'cmd_123',
  command: 'mkdir new_folder',
  shell: 'cmd'
});

// Batch commands (creates snapshot for each command)
socket.emit('execute_batch_persistent', {
  batch_id: 'batch_456',
  commands: [
    'cd backend',
    'mkdir test_folder',
    'echo "test" > test.txt'
  ],
  shell: 'cmd',
  stop_on_failure: true
});
```

#### Rollback Operations

```javascript
// Rollback single command
socket.emit('rollback_command', {
  snapshot_id: 'abc123def456'
});

// Rollback entire batch
socket.emit('rollback_batch', {
  batch_id: 'batch_456'
});
```

#### Query Snapshot Information

```javascript
// Get snapshot info
socket.emit('get_snapshot_info', {
  snapshot_id: 'abc123def456'
});

// Get batch snapshots
socket.emit('get_batch_snapshots', {
  batch_id: 'batch_456'
});

// List all snapshots
socket.emit('list_snapshots', {});
```

#### Manual Cleanup

```javascript
// Cleanup specific snapshot
socket.emit('cleanup_snapshot', {
  snapshot_id: 'abc123def456'
});
```

### Backend Event Responses

The agent emits the following events back to the backend:

#### Rollback Status

```javascript
// Rollback in progress
{
  event: 'rollback_status',
  data: {
    snapshot_id: 'abc123def456',
    status: 'in_progress',
    message: 'Starting rollback...'
  }
}

// Rollback result
{
  event: 'rollback_result',
  data: {
    snapshot_id: 'abc123def456',
    success: true,
    message: 'Rollback completed successfully'
  }
}
```

#### Batch Rollback Status

```javascript
{
  event: 'batch_rollback_result',
  data: {
    batch_id: 'batch_456',
    success: true,
    message: 'Batch rollback completed successfully'
  }
}
```

#### Snapshot Information

```javascript
{
  event: 'snapshot_info_result',
  data: {
    snapshot_id: 'abc123def456',
    success: true,
    info: {
      snapshot_id: 'abc123def456',
      timestamp: 1696771234.567,
      age_hours: 2.5,
      command: 'mkdir new_folder',
      command_index: 0,
      batch_id: 'batch_456',
      working_directory: '/home/user',
      file_count: 5,
      monitored_paths: ['/home/user'],
      metadata: {}
    }
  }
}
```

## Implementation Details

### Snapshot Storage

Snapshots are stored in the system temp directory:
- **Windows**: `%TEMP%\.deployx_snapshots\`
- **Linux/Mac**: `/tmp/.deployx_snapshots/`

### Snapshot Structure

```
.deployx_snapshots/
├── <snapshot_id>/
│   └── files/
│       └── <backed_up_files>
└── <snapshot_id>.json    # Metadata
```

### Snapshot Metadata

Each snapshot contains:
- **snapshot_id**: Unique identifier
- **timestamp**: When snapshot was created
- **command**: The command that was executed
- **command_index**: Position in batch (if applicable)
- **batch_id**: Batch identifier (if applicable)
- **working_directory**: Current working directory
- **monitored_paths**: Paths being monitored
- **file_snapshots**: List of file states
- **environment_vars**: Relevant environment variables
- **metadata**: Additional custom metadata

### File Snapshot

Each file snapshot contains:
- **path**: Absolute path to file
- **exists**: Whether file existed before command
- **is_dir**: Whether it's a directory
- **content_hash**: SHA256 hash of file content
- **size**: File size in bytes
- **modified_time**: Last modification time
- **permissions**: File permissions
- **backup_path**: Path to backed up file

## Error Handling

- Snapshot creation failures don't prevent command execution
- Rollback failures are logged and reported to backend
- Individual file restoration failures don't stop entire rollback
- All errors are emitted to backend for monitoring

## Performance Considerations

1. **Selective Monitoring**: Only monitors paths affected by the command
2. **Efficient Hashing**: Uses streaming SHA256 for large files
3. **Lazy Backup**: Only backs up files that existed before command
4. **Async Operations**: All I/O operations are asynchronous
5. **Automatic Cleanup**: Prevents disk space issues

## Security

- Snapshots are stored in user's temp directory (proper permissions)
- File permissions are preserved during rollback
- Snapshots are automatically cleaned up after 24 hours
- No sensitive data is logged (only file paths and metadata)

## Limitations

1. **Process State**: Cannot rollback process/service states
2. **Network Operations**: Cannot rollback network changes
3. **Database Changes**: Cannot rollback database modifications
4. **System-wide Changes**: Only monitors specified paths
5. **Large Files**: Very large files may impact performance

## Future Enhancements

- [ ] Snapshot compression for large files
- [ ] Delta-based snapshots for efficiency
- [ ] Database snapshot integration
- [ ] Service state capture and restore
- [ ] Network configuration snapshots
- [ ] Incremental snapshots
- [ ] Snapshot encryption
- [ ] Cloud backup integration

## Troubleshooting

### Snapshot Not Created

Check agent logs for errors during snapshot creation. Common issues:
- Insufficient disk space
- Permission denied on monitored paths
- Invalid path specifications

### Rollback Failed

Common causes:
- Files were manually deleted after snapshot
- Insufficient permissions to restore files
- Backup files corrupted or missing

### Cleanup Not Working

Verify:
- Cleanup task is running (check logs)
- Cleanup interval and max age settings
- System time is correct

## Example Workflow

```javascript
// 1. Backend sends batch command
socket.emit('execute_batch_persistent', {
  batch_id: 'deploy_123',
  commands: [
    'cd /var/www',
    'mkdir backup',
    'cp -r html backup/',
    'rm -rf html',
    'git clone https://github.com/user/repo.git html'
  ],
  shell: 'bash',
  stop_on_failure: true
});

// 2. Agent creates snapshots for each command and executes

// 3. If something goes wrong, backend requests rollback
socket.emit('rollback_batch', {
  batch_id: 'deploy_123'
});

// 4. Agent rolls back all changes in reverse order

// 5. After 24 hours, snapshots are automatically cleaned up
```

## Support

For issues or questions about the snapshot/rollback system, please check:
1. Agent logs for detailed error messages
2. Backend event logs for communication issues
3. System permissions for file access issues
4. Disk space for storage issues
