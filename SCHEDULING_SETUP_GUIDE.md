# DeployX Scheduling System - Complete Setup Guide

## Quick Start (5 Minutes)

This guide will get your scheduling system up and running quickly.

## Prerequisites
- ✅ DeployX backend and frontend already running
- ✅ PostgreSQL database configured
- ✅ Python 3.8+ and Node.js installed

## Backend Setup

### Step 1: Install Dependencies

```powershell
cd d:\DeployX\backend
pip install apscheduler
```

### Step 2: Create Database Tables

Run the migration script:

```powershell
python create_schedule_tables.py
```

Expected output:
```
Connecting to database...
Creating schedule tables...
✓ Created scheduled_tasks table
✓ Created scheduled_task_executions table
Database tables created successfully!
```

### Step 3: Verify Backend Integration

The scheduling system is already integrated in `app/main.py`. You should see these lines:

```python
from app.schedule.routes import router as schedule_router
from app.schedule.scheduler import task_scheduler

app.include_router(schedule_router, prefix="/api/schedule", tags=["Scheduling"])

@app.on_event("startup")
async def startup_event():
    await task_scheduler.start()
    await task_scheduler.load_existing_tasks()

@app.on_event("shutdown")
async def shutdown_event():
    task_scheduler.stop()
```

### Step 4: Start Backend

```powershell
cd d:\DeployX\backend
python start_server.py
```

Verify the scheduler started:
- Check logs for "Task scheduler started"
- Check logs for "Loaded X existing scheduled tasks"

### Step 5: Test Backend API

Open a new PowerShell window and test the API:

```powershell
# Get scheduling statistics
curl http://localhost:8000/api/schedule/stats

# Expected response:
# {
#   "total_tasks": 0,
#   "pending_tasks": 0,
#   "completed_tasks": 0,
#   "failed_tasks": 0,
#   "running_tasks": 0
# }
```

## Frontend Setup

### Step 6: Verify Files Created

Check that these files exist:
- ✅ `frontend/src/components/SchedulingModal.jsx`
- ✅ `frontend/src/components/ScheduledTasksManager.jsx`
- ✅ `frontend/src/services/scheduling.js`

### Step 7: Integrate into Existing Components

Follow the integration guide for each deployment page:

#### A. Command Deployment Page
File: `frontend/src/components/DeploymentManager.jsx` (or similar)

Add imports:
```jsx
import SchedulingModal from './SchedulingModal';
import schedulingService from '../services/scheduling';
import { Calendar } from 'lucide-react';
```

Add state:
```jsx
const [showSchedulingModal, setShowSchedulingModal] = useState(false);
const [schedulingData, setSchedulingData] = useState(null);
```

Add schedule button next to execute button (see FRONTEND_SCHEDULING_INTEGRATION.md for full code).

#### B. Software Deployment Page
File: `frontend/src/components/DeploymentsManager.jsx` (or similar)

Same pattern as above (see FRONTEND_SCHEDULING_INTEGRATION.md).

#### C. File Deployment Page
File: `frontend/src/components/FileSystemManager.jsx` (or similar)

Same pattern as above (see FRONTEND_SCHEDULING_INTEGRATION.md).

### Step 8: Add Scheduled Tasks Tab

In your main navigation/dashboard:

```jsx
import ScheduledTasksManager from '../components/ScheduledTasksManager';

// Add to navigation
const tabs = [
  // ... existing tabs
  { id: 'scheduled', label: 'Scheduled Tasks', icon: Calendar }
];

// Add to content
{activeTab === 'scheduled' && <ScheduledTasksManager />}
```

### Step 9: Start Frontend

```powershell
cd d:\DeployX\frontend
npm run dev
```

## Testing the System

### Test 1: Create a One-Time Scheduled Task

1. Go to Command Deployment page
2. Enter command: `echo "Hello from scheduled task"`
3. Select target devices/groups
4. Click **"Schedule Command"** button
5. In the modal:
   - Name: "Test Scheduled Task"
   - Recurrence: "Once"
   - Date: Tomorrow
   - Time: 10:00 AM
6. Click **"Schedule Task"**
7. Success message should appear

### Test 2: View Scheduled Tasks

1. Go to **Scheduled Tasks** tab
2. You should see your task with:
   - Status: "Pending"
   - Type: "Command"
   - Next run time
3. Statistics should show: 1 total task, 1 pending

### Test 3: Test Immediate Execution

1. In Scheduled Tasks list, find your task
2. Click **"Execute Now"** button
3. Status should change to "Running"
4. After completion, status changes to "Completed"
5. Click the expand button to see execution details

### Test 4: Test Daily Recurring Task

1. Create another task with:
   - Recurrence: "Daily"
   - Time: 2:00 PM
2. Task should show next run time as today/tomorrow at 2:00 PM
3. Let it run once, verify it reschedules for next day

### Test 5: Pause and Resume

1. Click **"Pause"** button on a pending task
2. Status changes to "Paused"
3. Task won't execute at scheduled time
4. Click **"Resume"** button
5. Status returns to "Pending"
6. Task will execute at next scheduled time

## Verification Checklist

Backend:
- [ ] APScheduler package installed
- [ ] Database tables created (scheduled_tasks, scheduled_task_executions)
- [ ] Backend starts without errors
- [ ] API endpoint `/api/schedule/stats` responds
- [ ] Logs show "Task scheduler started"

Frontend:
- [ ] SchedulingModal component exists
- [ ] ScheduledTasksManager component exists
- [ ] scheduling service exists
- [ ] Schedule buttons appear in deployment pages
- [ ] Modal opens when clicking schedule button
- [ ] Scheduled Tasks tab visible in navigation
- [ ] Can create, view, pause, resume, and delete tasks

## Common Issues

### Issue: "Module 'apscheduler' not found"
**Solution:**
```powershell
cd d:\DeployX\backend
pip install apscheduler
```

### Issue: Database tables not created
**Solution:**
Run the migration script again:
```powershell
python create_schedule_tables.py
```

### Issue: Modal doesn't open
**Solution:**
- Check browser console for errors
- Verify SchedulingModal is imported correctly
- Check that state variables are declared

### Issue: API calls return 401 Unauthorized
**Solution:**
- Verify you're logged in
- Check authentication token is valid
- Check backend authentication middleware

### Issue: Task doesn't execute at scheduled time
**Solution:**
- Check backend logs for errors
- Verify scheduler is running (check startup logs)
- Check task status in database
- Ensure target devices are online

### Issue: Frontend not showing scheduled tasks
**Solution:**
- Check API is responding: `curl http://localhost:8000/api/schedule/tasks`
- Check browser console for errors
- Verify authentication token in localStorage

## Architecture Overview

```
Frontend                     Backend                      Database
├─ SchedulingModal          ├─ schedule/routes.py       ├─ scheduled_tasks
├─ ScheduledTasksManager    ├─ schedule/scheduler.py    └─ scheduled_task_executions
└─ scheduling.js service    └─ schedule/models.py
         │                           │
         └──── HTTP/REST ───────────┘
                  │
         ┌────────┴─────────┐
         │   APScheduler    │
         │  (Background)    │
         └──────────────────┘
                  │
         ┌────────┴─────────┐
         │   Task Executor  │
         ├─ Command         │
         ├─ Software Deploy │
         └─ File Deploy     │
```

## Next Steps

1. **Customize Styling**: Update Tailwind classes to match your theme
2. **Add Notifications**: Integrate with your notification system for task completion
3. **Calendar View**: Add a calendar view for scheduled tasks
4. **Execution History**: Add detailed execution history modal
5. **Email Notifications**: Add email alerts for task completion/failure
6. **Advanced Scheduling**: Add more recurrence patterns (hourly, etc.)

## Documentation Files

- **SCHEDULING_GUIDE.md** - Comprehensive API and usage guide
- **SCHEDULING_IMPLEMENTATION.md** - Technical implementation details
- **FRONTEND_SCHEDULING_INTEGRATION.md** - Frontend integration instructions
- **SCHEDULING_QUICK_REFERENCE.md** - Quick API reference

## Support

If you encounter issues:
1. Check backend logs: `d:\DeployX\backend\logs\`
2. Check browser console for frontend errors
3. Verify database tables exist: Check PostgreSQL
4. Test API endpoints directly with curl/Postman
5. Check authentication is working

## Success Indicators

You'll know everything is working when:
- ✅ Schedule buttons appear in all deployment pages
- ✅ Modal opens and closes smoothly
- ✅ Tasks are created and visible in Scheduled Tasks tab
- ✅ Statistics show correct counts
- ✅ Tasks execute at scheduled times
- ✅ Execution history is tracked
- ✅ Pause/resume/delete functions work
- ✅ Backend logs show successful task execution

**Congratulations! Your scheduling system is now fully operational! 🎉**
