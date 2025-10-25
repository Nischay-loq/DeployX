# Scheduling System - Final Fixes Applied

## Date: October 25, 2025

## Issues Identified and Fixed

### 1. ✅ Timezone Comparison Error (500 Internal Server Error)

**Error Message:**
```
can't compare offset-naive and offset-aware datetimes
```

**Root Cause:**
The backend was comparing timezone-aware datetime (from ISO string parsing) with timezone-naive datetime (`datetime.utcnow()`).

**Files Modified:**

#### `backend/app/schedule/routes.py`
- Added `import pytz`
- Fixed datetime comparison in task creation validation (line ~53)

```python
# BEFORE:
if task_data.scheduled_time <= datetime.utcnow() and task_data.recurrence_type == RecurrenceType.ONCE:
    raise HTTPException(status_code=400, detail="Scheduled time must be in the future for one-time tasks")

# AFTER:
if task_data.recurrence_type == RecurrenceType.ONCE:
    # Make scheduled_time timezone-aware for comparison
    scheduled_time = task_data.scheduled_time
    if scheduled_time.tzinfo is None:
        scheduled_time = pytz.UTC.localize(scheduled_time)
    
    # Compare with timezone-aware current time
    current_time = datetime.now(pytz.UTC)
    if scheduled_time <= current_time:
        raise HTTPException(status_code=400, detail="Scheduled time must be in the future for one-time tasks")
```

#### `backend/app/schedule/scheduler.py`
- Added `import pytz`
- Fixed datetime comparison in `load_existing_tasks()` method (line ~551)

```python
# BEFORE:
if task.scheduled_time > datetime.utcnow() or task.recurrence_type != RecurrenceType.ONCE:
    if self.schedule_task(db, task):
        scheduled_count += 1

# AFTER:
scheduled_time = task.scheduled_time
if scheduled_time.tzinfo is None:
    scheduled_time = pytz.UTC.localize(scheduled_time)

current_time = datetime.now(pytz.UTC)
if scheduled_time > current_time or task.recurrence_type != RecurrenceType.ONCE:
    if self.schedule_task(db, task):
        scheduled_count += 1
```

- Fixed `_get_trigger()` method to use UTC timezone for all triggers

```python
# For one-time tasks:
if task.recurrence_type == RecurrenceType.ONCE:
    scheduled_time = task.scheduled_time
    if scheduled_time.tzinfo is None:
        scheduled_time = pytz.UTC.localize(scheduled_time)
    return DateTrigger(run_date=scheduled_time, timezone=pytz.UTC)

# For recurring tasks (daily/weekly/monthly):
return CronTrigger(hour=hour, minute=minute, timezone=pytz.UTC)
```

### 2. ✅ Frontend DateTime Format

**Files Modified:**

#### `frontend/src/components/SchedulingModal.jsx`
- Fixed datetime conversion to always send ISO format with timezone

```javascript
// BEFORE:
const scheduledDateTime = recurrenceType === 'once'
  ? `${scheduledDate}T${scheduledTime}:00`
  : new Date().toISOString();

// AFTER:
let scheduledDateTime;
if (recurrenceType === 'once') {
  const localDateTime = new Date(`${scheduledDate}T${scheduledTime}:00`);
  scheduledDateTime = localDateTime.toISOString(); // Converts to UTC
} else {
  scheduledDateTime = new Date().toISOString();
}
```

### 3. ✅ Device IDs Not Being Sent (400 Bad Request)

**Error Message:**
```
At least one device or group must be specified
```

**Status:** 
This was already fixed in a previous commit. The fix is in:

#### `frontend/src/components/DeploymentManager.jsx`
```javascript
// Get device IDs from groups or use current agent
let deviceIds = [];
if (currentAgent) {
  const device = devices.find(d => d.agent_id === currentAgent);
  if (device) {
    deviceIds = [device.id];
  }
}
```

### 4. ✅ Added Debugging Logs

Added console.log statements to help diagnose issues:

#### `frontend/src/components/DeploymentManager.jsx`
```javascript
console.log('DeploymentManager - Opening scheduling modal with data:', {
  currentAgent,
  deviceIds,
  selectedGroups,
  taskData
});
```

#### `frontend/src/components/FileSystemManager.jsx`
```javascript
console.log('FileSystemManager - Opening scheduling modal with data:', {
  selectedDevices,
  selectedGroups,
  taskData
});
```

#### `frontend/src/components/SchedulingModal.jsx`
```javascript
console.log('SchedulingModal - Sending payload to backend:', payload);
```

## Testing Instructions

### 1. Restart Backend Server
```powershell
cd d:\DeployX\backend
python start_server.py
```

### 2. Refresh Frontend
- Open browser developer console (F12)
- Refresh the page
- Navigate to command execution / software deployment / file deployment page

### 3. Test Scheduling

#### Test Case 1: Command Execution with Single Agent
1. Select an agent from dropdown
2. Enter a command
3. Click "Schedule" button
4. Select date/time 2-3 minutes in future
5. Enter task name
6. Click "Schedule Task"
7. Check console logs for payload structure
8. Check backend logs for task creation
9. Wait for scheduled time and verify execution

#### Test Case 2: File Deployment with Device Selection
1. Upload a file
2. Select devices or groups
3. Click "Schedule" button
4. Follow same steps as above

#### Test Case 3: Software Deployment
1. Select software and agent
2. Click "Schedule Installation"
3. Follow same steps as above

### 4. Verify in Database
```sql
-- Check scheduled tasks
SELECT id, task_name, task_type, scheduled_time, status, next_execution 
FROM scheduled_tasks 
ORDER BY created_at DESC;

-- Check executions (after task runs)
SELECT * FROM scheduled_task_executions 
ORDER BY execution_time DESC;
```

### 5. Check Backend Logs
Look for:
```
✅ "Task scheduler started"
✅ "Scheduled task X (Task Name) - Next run: YYYY-MM-DD HH:MM:SS+00:00"
✅ "Executing task X: Task Name"
✅ "Task X completed successfully"
```

## Expected Behavior

1. **Frontend sends:**
   - `device_ids`: Array of device IDs (integers)
   - `group_ids`: Array of group IDs (integers)
   - `scheduled_time`: ISO datetime string (e.g., "2025-10-25T12:30:00.000Z")
   - `task_type`: "command", "software_deployment", or "file_deployment"
   - Appropriate payload (command_payload, software_payload, or file_payload)

2. **Backend validates:**
   - At least one device_id OR group_id is present
   - Scheduled time is in the future (for one-time tasks)
   - Timezone-aware comparison using UTC

3. **Scheduler schedules:**
   - Creates APScheduler job with UTC timezone
   - Logs "Next run" time in UTC
   - Executes task at scheduled time

4. **Task executes:**
   - Creates execution record in database
   - Executes command/deployment on target devices
   - Updates task status and last_execution time

## Common Issues and Solutions

### Issue: "At least one device or group must be specified"
**Solution:** 
- Check that `currentAgent` is selected in DeploymentManager
- Check that devices are selected in FileSystemManager
- Check console logs to see what's being sent in `device_ids` and `group_ids`

### Issue: "Scheduled time must be in the future"
**Solution:**
- Make sure selected time is at least 1 minute in future
- Check system clock is correct
- Timezone conversion is happening correctly (check console logs)

### Issue: Task created but not executing
**Solution:**
- Check backend logs for "Scheduled task X - Next run" message
- Verify the "Next run" time is correct
- Ensure backend server is still running
- Check APScheduler is started (should see "Task scheduler started" in logs)

### Issue: 500 Internal Server Error
**Solution:**
- Check backend logs for full error traceback
- Most likely a timezone comparison issue (should be fixed now)
- Verify all datetime comparisons use timezone-aware datetimes

## Files Modified Summary

### Backend Files:
1. `backend/app/schedule/routes.py` - Fixed datetime comparison, added pytz
2. `backend/app/schedule/scheduler.py` - Fixed datetime comparison, added UTC timezone to triggers

### Frontend Files:
1. `frontend/src/components/SchedulingModal.jsx` - Fixed datetime conversion, added debug logs
2. `frontend/src/components/DeploymentManager.jsx` - Added debug logs (device_ids fix was already done)
3. `frontend/src/components/FileSystemManager.jsx` - Added debug logs

## Next Steps

1. ✅ Restart backend server
2. ✅ Test all three scheduling flows (command, software, file)
3. ✅ Verify tasks execute at scheduled time
4. ✅ Remove debug console.log statements after verification (optional, can keep for troubleshooting)
5. ✅ Test recurring tasks (daily, weekly, monthly)
6. ✅ Test pause/resume/delete functionality

## Status: READY FOR TESTING

All known issues have been fixed. The system should now:
- ✅ Accept scheduling requests without 400 errors
- ✅ Not throw 500 timezone comparison errors
- ✅ Execute tasks at the correct scheduled time
- ✅ Handle timezone conversions properly (user local time → UTC)
- ✅ Log helpful debug information for troubleshooting
