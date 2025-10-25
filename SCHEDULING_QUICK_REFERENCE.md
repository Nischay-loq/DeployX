# DeployX Scheduling - Quick Reference

## Create a Scheduled Task

### Command Execution (One-time)
```json
{
  "task_name": "System Check",
  "task_type": "command",
  "scheduled_time": "2025-10-26T15:00:00",
  "recurrence_type": "once",
  "device_ids": [1, 2],
  "command_payload": {
    "command": "systeminfo",
    "shell": "cmd"
  }
}
```

### Software Deployment (Weekly)
```json
{
  "task_name": "Weekly Updates",
  "task_type": "software_deployment",
  "scheduled_time": "2025-10-28T02:00:00",
  "recurrence_type": "weekly",
  "recurrence_config": {
    "type": "weekly",
    "days_of_week": [0],
    "time": "02:00"
  },
  "group_ids": [1],
  "software_payload": {
    "software_ids": [5, 8]
  }
}
```

### File Deployment (Daily)
```json
{
  "task_name": "Config Sync",
  "task_type": "file_deployment",
  "scheduled_time": "2025-10-26T01:00:00",
  "recurrence_type": "daily",
  "recurrence_config": {
    "type": "daily",
    "time": "01:00"
  },
  "device_ids": [1, 2],
  "file_payload": {
    "file_ids": [10],
    "target_path": "C:\\Config"
  }
}
```

## Recurrence Types

| Type | Config | Example |
|------|--------|---------|
| `once` | None | One-time at scheduled_time |
| `daily` | `{"time": "03:00"}` | Every day at 3 AM |
| `weekly` | `{"days_of_week": [0,2,4], "time": "02:00"}` | Mon/Wed/Fri at 2 AM |
| `monthly` | `{"day_of_month": 1, "time": "00:00"}` | First of month at midnight |
| `custom` | `{"cron_expression": "0 2 * * 1-5"}` | Weekdays at 2 AM |

Days of week: 0=Monday, 6=Sunday

## API Endpoints

| Action | Endpoint |
|--------|----------|
| Create | `POST /api/schedule/tasks` |
| List | `GET /api/schedule/tasks` |
| Details | `GET /api/schedule/tasks/{id}` |
| Update | `PUT /api/schedule/tasks/{id}` |
| Delete | `DELETE /api/schedule/tasks/{id}` |
| Pause | `POST /api/schedule/tasks/{id}/pause` |
| Resume | `POST /api/schedule/tasks/{id}/resume` |
| Execute Now | `POST /api/schedule/tasks/{id}/execute` |
| History | `GET /api/schedule/tasks/{id}/executions` |
| Stats | `GET /api/schedule/stats` |

## Task Status Values

- `pending` - Scheduled, waiting
- `running` - Currently executing
- `completed` - Finished successfully
- `failed` - Execution failed
- `cancelled` - User cancelled
- `paused` - Temporarily paused

## Common Filters

```bash
# Get all command tasks
GET /api/schedule/tasks?task_type=command

# Get pending tasks
GET /api/schedule/tasks?status=pending

# Get failed tasks
GET /api/schedule/tasks?status=failed

# Pagination
GET /api/schedule/tasks?skip=0&limit=20
```

## Quick Commands

### Install Dependencies
```bash
pip install -r requirements.txt
```

### Create Tables
```bash
python create_schedule_tables.py
```

### Test Implementation
```bash
python test_scheduling.py
```

### Start Server
```bash
python -m uvicorn app.main:socket_app --host 0.0.0.0 --port 8000
```

## Common Cron Patterns

| Pattern | Description |
|---------|-------------|
| `0 2 * * *` | Daily at 2 AM |
| `0 2 * * 1` | Every Monday at 2 AM |
| `0 2 1 * *` | First of month at 2 AM |
| `0 */4 * * *` | Every 4 hours |
| `0 9 * * 1-5` | Weekdays at 9 AM |
| `0 0 * * 0` | Every Sunday at midnight |

## Troubleshooting

**Task not executing?**
- Check status is "pending"
- Verify scheduled_time is future
- Check devices are online
- Review error_message field

**How to reschedule?**
- Update scheduled_time or recurrence_config
- System automatically reschedules

**How to stop recurring task?**
- Pause it (can resume later)
- Or cancel/delete it (permanent)

**Where are results?**
- Check task's execution history
- Each execution has result/error
- Links to deployment records
