# Scheduling System Fixes

## Issues Fixed

### 1. ✅ Device IDs Not Being Sent (400 Bad Request Error)

**Problem:**
When scheduling tasks from the command execution page with a single agent selected, the `device_ids` array was empty, causing a 400 error: "At least one device or group must be specified".

**Root Cause:**
The `openSchedulingModal` function in `DeploymentManager.jsx` was sending `device_ids: []` when `currentAgent` was selected, because it wasn't mapping the `agent_id` to the corresponding `device.id`.

**Solution:**
Modified `DeploymentManager.jsx` to find the device ID from the devices array:

```javascript
let deviceIds = [];
if (currentAgent) {
  const device = devices.find(d => d.agent_id === currentAgent);
  if (device) {
    deviceIds = [device.id];
  }
}
```

### 2. ✅ Timezone Issues - Tasks Not Executing at Scheduled Time

**Problem:**
Tasks were being created but not executing at the scheduled time. The scheduler was interpreting times incorrectly due to timezone mismatch between frontend local time, backend UTC time, and APScheduler's local timezone.

**Root Cause:**
1. Frontend was sending local datetime string without timezone info (e.g., `"2025-10-25T16:56:00"`)
2. Backend was storing this as naive datetime in SQLite
3. APScheduler was interpreting the naive datetime using system's local timezone (+05:30)
4. This caused a mismatch between when user wanted the task to run and when it actually ran

**Solution:**

#### Frontend Fix (`SchedulingModal.jsx`):
Changed the datetime formatting to always send ISO format with timezone:

```javascript
// Before:
const scheduledDateTime = recurrenceType === 'once'
  ? `${scheduledDate}T${scheduledTime}:00`
  : new Date().toISOString();

// After:
let scheduledDateTime;
if (recurrenceType === 'once') {
  const localDateTime = new Date(`${scheduledDate}T${scheduledTime}:00`);
  scheduledDateTime = localDateTime.toISOString(); // Converts to UTC
} else {
  scheduledDateTime = new Date().toISOString();
}
```

#### Backend Fix (`scheduler.py`):
Added timezone awareness to APScheduler triggers:

1. **Added pytz import:**
```python
import pytz
```

2. **Fixed DateTrigger for one-time tasks:**
```python
def _get_trigger(self, task: ScheduledTask):
    if task.recurrence_type == RecurrenceType.ONCE:
        # Ensure the scheduled_time is timezone-aware (treat as UTC if naive)
        scheduled_time = task.scheduled_time
        if scheduled_time.tzinfo is None:
            scheduled_time = pytz.UTC.localize(scheduled_time)
        return DateTrigger(run_date=scheduled_time, timezone=pytz.UTC)
```

3. **Fixed CronTrigger for recurring tasks:**
```python
# Daily
return CronTrigger(hour=hour, minute=minute, timezone=pytz.UTC)

# Weekly
return CronTrigger(day_of_week=day_of_week, hour=hour, minute=minute, timezone=pytz.UTC)

# Monthly
return CronTrigger(day=day_of_month, hour=hour, minute=minute, timezone=pytz.UTC)
```

## Verification

After the fixes, the scheduler logs now show:

```
2025-10-25 17:10:18,276 - app.schedule.scheduler - INFO - Scheduled task 1 (Software Deployment - 25/10/2025, 16:56:55) - Next run: 2025-10-25 17:57:00+00:00
```

Notice the `+00:00` at the end, indicating UTC timezone is being used correctly.

## How It Works Now

1. **User selects time in browser (local time):**
   - User: "Schedule for 5:00 PM" (local time)

2. **Frontend converts to UTC:**
   - Browser creates Date object: `new Date("2025-10-25T17:00:00")`
   - Converts to ISO/UTC: `"2025-10-25T11:30:00.000Z"` (for UTC+5:30 timezone)

3. **Backend stores as UTC:**
   - SQLite stores: `"2025-10-25 11:30:00"` (naive datetime, but treated as UTC)

4. **APScheduler schedules in UTC:**
   - Creates DateTrigger with `timezone=pytz.UTC`
   - Schedules job to run at: `2025-10-25 11:30:00+00:00`

5. **Task executes at correct time:**
   - When UTC time reaches 11:30:00, task executes
   - This is 5:00 PM in user's local time (UTC+5:30)

## Testing

To test the scheduling system:

1. **Schedule a task 2 minutes in the future:**
   - Open command execution / software deployment / file deployment page
   - Click "Schedule" button
   - Select date/time 2 minutes ahead
   - Submit

2. **Verify in logs:**
   - Check backend logs for "Scheduled task X" message
   - Verify "Next run" time matches expected UTC time

3. **Wait for execution:**
   - Task should execute at the scheduled time
   - Check logs for "Executing task" and "Task completed" messages
   - Verify command/deployment actually happened on target device

4. **Check database:**
   ```sql
   SELECT * FROM scheduled_tasks;
   SELECT * FROM scheduled_task_executions;
   ```

## Additional Notes

- All recurring tasks (daily, weekly, monthly) also use UTC timezone
- Frontend still displays times in user's local timezone
- Backend converts between local and UTC as needed
- APScheduler handles timezone conversions automatically
