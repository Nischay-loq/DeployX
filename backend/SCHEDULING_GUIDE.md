# Task Scheduling System

The DeployX platform now supports scheduling for command execution, software deployment, and file deployment. This allows you to automate tasks and execute them at specific times or on a recurring basis.

## Features

- **Multiple Task Types**: Schedule commands, software deployments, and file deployments
- **Flexible Scheduling**: One-time execution or recurring schedules (daily, weekly, monthly, custom cron)
- **Target Selection**: Schedule tasks for specific devices or device groups
- **Execution History**: Track all executions with detailed results
- **Task Management**: Pause, resume, cancel, or manually trigger scheduled tasks
- **Status Tracking**: Monitor task status and next execution time

## API Endpoints

### Create a Scheduled Task
```
POST /api/schedule/tasks
```

**Request Body:**
```json
{
  "task_name": "Weekly System Update",
  "task_type": "software_deployment",
  "scheduled_time": "2025-10-26T02:00:00",
  "recurrence_type": "weekly",
  "recurrence_config": {
    "type": "weekly",
    "days_of_week": [0, 2, 4],
    "time": "02:00"
  },
  "device_ids": [1, 2, 3],
  "group_ids": [1],
  "software_payload": {
    "software_ids": [5, 8],
    "deployment_name": "Scheduled Weekly Update"
  }
}
```

### Task Types

1. **Command Execution** (`command`)
```json
{
  "task_type": "command",
  "command_payload": {
    "command": "systeminfo",
    "shell": "cmd",
    "strategy": "transactional"
  }
}
```

Or for batch commands:
```json
{
  "task_type": "command",
  "command_payload": {
    "commands": ["ipconfig", "netstat -an", "tasklist"],
    "shell": "cmd",
    "stop_on_failure": true
  }
}
```

2. **Software Deployment** (`software_deployment`)
```json
{
  "task_type": "software_deployment",
  "software_payload": {
    "software_ids": [1, 2, 3],
    "deployment_name": "Monthly Software Update",
    "custom_software": null
  }
}
```

3. **File Deployment** (`file_deployment`)
```json
{
  "task_type": "file_deployment",
  "file_payload": {
    "file_ids": [10, 11],
    "target_path": "C:\\Deployment\\Files",
    "create_path_if_not_exists": true,
    "deployment_name": "Config File Update"
  }
}
```

### Recurrence Types

1. **Once** (`once`) - Execute one time at the scheduled time
```json
{
  "recurrence_type": "once",
  "scheduled_time": "2025-10-26T14:30:00"
}
```

2. **Daily** (`daily`) - Execute every day at a specific time
```json
{
  "recurrence_type": "daily",
  "recurrence_config": {
    "type": "daily",
    "time": "03:00"
  }
}
```

3. **Weekly** (`weekly`) - Execute on specific days of the week
```json
{
  "recurrence_type": "weekly",
  "recurrence_config": {
    "type": "weekly",
    "days_of_week": [0, 2, 4],
    "time": "02:00"
  }
}
```
Note: Days are 0-6 (Monday=0, Sunday=6)

4. **Monthly** (`monthly`) - Execute on a specific day of the month
```json
{
  "recurrence_type": "monthly",
  "recurrence_config": {
    "type": "monthly",
    "day_of_month": 1,
    "time": "00:00"
  }
}
```

5. **Custom** (`custom`) - Use cron expression for advanced scheduling
```json
{
  "recurrence_type": "custom",
  "recurrence_config": {
    "type": "custom",
    "cron_expression": "0 2 * * 1-5"
  }
}
```

### List Scheduled Tasks
```
GET /api/schedule/tasks?task_type=command&status=pending&skip=0&limit=100
```

### Get Task Details
```
GET /api/schedule/tasks/{task_id}
```

Returns detailed information including execution history.

### Update a Task
```
PUT /api/schedule/tasks/{task_id}
```

**Request Body:**
```json
{
  "task_name": "Updated Task Name",
  "scheduled_time": "2025-10-27T10:00:00",
  "status": "pending"
}
```

### Delete a Task
```
DELETE /api/schedule/tasks/{task_id}
```

### Pause a Task
```
POST /api/schedule/tasks/{task_id}/pause
```

### Resume a Task
```
POST /api/schedule/tasks/{task_id}/resume
```

### Execute Task Immediately
```
POST /api/schedule/tasks/{task_id}/execute
```

Manually trigger a task to run immediately, regardless of schedule.

### Get Task Execution History
```
GET /api/schedule/tasks/{task_id}/executions?skip=0&limit=50
```

### Get Scheduling Statistics
```
GET /api/schedule/stats
```

Returns overview of all tasks and upcoming executions.

## Task Status

- **pending** - Task is scheduled and waiting for execution
- **running** - Task is currently executing
- **completed** - Task has completed successfully (for one-time tasks)
- **failed** - Task execution failed
- **cancelled** - Task has been cancelled
- **paused** - Task is paused and won't execute

## Example Use Cases

### 1. Daily System Cleanup
Schedule a command to clean temporary files every night:
```json
{
  "task_name": "Daily Cleanup",
  "task_type": "command",
  "scheduled_time": "2025-10-26T02:00:00",
  "recurrence_type": "daily",
  "recurrence_config": {
    "type": "daily",
    "time": "02:00"
  },
  "device_ids": [1, 2, 3, 4, 5],
  "command_payload": {
    "command": "del /q /f /s %TEMP%\\*",
    "shell": "cmd"
  }
}
```

### 2. Weekly Software Updates
Deploy software updates every Monday at 3 AM:
```json
{
  "task_name": "Weekly Patch Tuesday",
  "task_type": "software_deployment",
  "scheduled_time": "2025-10-27T03:00:00",
  "recurrence_type": "weekly",
  "recurrence_config": {
    "type": "weekly",
    "days_of_week": [0],
    "time": "03:00"
  },
  "group_ids": [1, 2],
  "software_payload": {
    "software_ids": [10, 11, 12],
    "deployment_name": "Weekly Security Updates"
  }
}
```

### 3. Monthly Configuration Backup
Backup configuration files on the first day of each month:
```json
{
  "task_name": "Monthly Config Backup",
  "task_type": "file_deployment",
  "scheduled_time": "2025-11-01T00:00:00",
  "recurrence_type": "monthly",
  "recurrence_config": {
    "type": "monthly",
    "day_of_month": 1,
    "time": "00:00"
  },
  "device_ids": [5, 10, 15],
  "file_payload": {
    "file_ids": [20, 21],
    "target_path": "D:\\Backups\\Config",
    "create_path_if_not_exists": true,
    "deployment_name": "Monthly Backup"
  }
}
```

### 4. Business Hours System Check
Run system diagnostics on weekdays at 9 AM:
```json
{
  "task_name": "Morning Health Check",
  "task_type": "command",
  "scheduled_time": "2025-10-27T09:00:00",
  "recurrence_type": "custom",
  "recurrence_config": {
    "type": "custom",
    "cron_expression": "0 9 * * 1-5"
  },
  "group_ids": [3],
  "command_payload": {
    "commands": [
      "systeminfo",
      "wmic diskdrive get status",
      "wmic cpu get loadpercentage"
    ],
    "shell": "cmd",
    "stop_on_failure": false
  }
}
```

## Best Practices

1. **Use Descriptive Names**: Give your scheduled tasks clear, descriptive names
2. **Test First**: Create and test your deployment/command before scheduling it
3. **Monitor History**: Regularly check execution history for failures
4. **Set Appropriate Times**: Schedule resource-intensive tasks during off-peak hours
5. **Use Groups**: Leverage device groups for easier management
6. **Start with One-Time**: Test with a one-time execution before setting up recurring schedules
7. **Handle Failures**: Design commands/deployments to be idempotent when possible

## Database Tables

### scheduled_tasks
Stores all scheduled task configurations

### scheduled_task_executions
Stores history of all task executions with results and errors

## Integration

The scheduler integrates seamlessly with existing DeployX features:

- **Command Execution**: Uses the same deployment command system
- **Software Deployment**: Creates standard deployment records
- **File Deployment**: Creates standard file deployment records
- **Authentication**: All tasks are associated with the user who created them
- **Device Groups**: Respects user's device group permissions

## Technical Details

- **Scheduler**: Uses APScheduler for background task execution
- **Timezone**: All times are in UTC
- **Concurrency**: Maximum 3 concurrent instances of the same job
- **Misfire Grace**: 5-minute grace period for missed jobs
- **Persistence**: Tasks are loaded from database on startup

## Troubleshooting

### Task Not Executing
- Check task status (should be "pending")
- Verify scheduled time is in the future
- Check execution history for errors
- Ensure target devices/groups exist and user has access

### Execution Failed
- Check error message in task details
- Verify devices are online
- Test the command/deployment manually first
- Check device permissions and paths

### Task Stuck in "Running"
- Check if deployment is actually in progress
- Review execution history
- May need to manually cancel and reschedule

## Future Enhancements

Planned features for future releases:
- Task dependencies (execute task B after task A completes)
- Notification system for task completion/failure
- Task templates for common scenarios
- Execution windows (only execute during specific time ranges)
- Retry logic with exponential backoff
- Task groups for batch management
