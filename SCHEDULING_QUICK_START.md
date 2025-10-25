# DeployX Scheduling - Quick Reference Card

## 🚀 Setup (2 Commands)

```powershell
# Backend
pip install apscheduler
python create_schedule_tables.py

# Frontend - Files already created, just integrate!
```

## 📋 Integration Checklist (Per Page)

```jsx
// 1. Imports
import SchedulingModal from './SchedulingModal';
import schedulingService from '../services/scheduling';
import { Calendar } from 'lucide-react';

// 2. State
const [showSchedulingModal, setShowSchedulingModal] = useState(false);
const [schedulingData, setSchedulingData] = useState(null);

// 3. Functions (copy from SCHEDULING_CODE_EXAMPLES.md)
const openSchedulingModal = () => { /* ... */ };
const handleSchedule = async (schedulePayload) => { /* ... */ };
const handleExecuteNow = async () => { /* ... */ };

// 4. Button
<button onClick={openSchedulingModal}>
  <Calendar /> Schedule
</button>

// 5. Modal
{showSchedulingModal && <SchedulingModal ... />}
```

## 🔌 API Endpoints

| Action | Method | Endpoint |
|--------|--------|----------|
| Create | POST | `/api/schedule/tasks` |
| List | GET | `/api/schedule/tasks` |
| Get | GET | `/api/schedule/tasks/{id}` |
| Update | PUT | `/api/schedule/tasks/{id}` |
| Delete | DELETE | `/api/schedule/tasks/{id}` |
| Pause | POST | `/api/schedule/tasks/{id}/pause` |
| Resume | POST | `/api/schedule/tasks/{id}/resume` |
| Execute | POST | `/api/schedule/tasks/{id}/execute` |
| History | GET | `/api/schedule/tasks/{id}/executions` |
| Stats | GET | `/api/schedule/stats` |

## 📦 Task Payload Structure

### Command
```json
{
  "name": "Task name",
  "task_type": "command",
  "recurrence_type": "daily",
  "recurrence_config": { "time": "14:00" },
  "device_ids": [],
  "group_ids": [1, 2],
  "task_payload": {
    "command_payload": {
      "command": "echo hello",
      "shell": "cmd",
      "strategy": "parallel"
    }
  }
}
```

### Software Deployment
```json
{
  "name": "Software Deploy",
  "task_type": "software_deployment",
  "recurrence_type": "weekly",
  "recurrence_config": {
    "days": [1, 3, 5],
    "time": "02:00"
  },
  "device_ids": [1, 2, 3],
  "group_ids": [],
  "task_payload": {
    "software_payload": {
      "software_ids": [1, 2],
      "deployment_name": "Deploy Name"
    }
  }
}
```

### File Deployment
```json
{
  "name": "File Deploy",
  "task_type": "file_deployment",
  "recurrence_type": "monthly",
  "recurrence_config": {
    "day_of_month": 15,
    "time": "03:00"
  },
  "device_ids": [],
  "group_ids": [1],
  "task_payload": {
    "file_payload": {
      "file_ids": [1, 2, 3],
      "target_path": "C:\\Deploy",
      "create_path_if_not_exists": true
    }
  }
}
```

## ⏰ Recurrence Types

| Type | Config | Example |
|------|--------|---------|
| Once | `scheduled_time` | `"2024-01-15T14:00:00"` |
| Daily | `time` | `{"time": "14:00"}` |
| Weekly | `days`, `time` | `{"days": [1,3,5], "time": "09:00"}` |
| Monthly | `day_of_month`, `time` | `{"day_of_month": 15, "time": "12:00"}` |
| Custom | `cron` | `{"cron": "0 8,12,18 * * 1-5"}` |

## 🎨 Component Props

### SchedulingModal
```jsx
<SchedulingModal
  isOpen={boolean}
  onClose={() => void}
  onSchedule={async (payload) => void}
  onExecuteNow={async () => void}
  taskType="command" | "software_deployment" | "file_deployment"
  taskData={{ device_ids, group_ids, ...payload }}
  targetInfo="Display string"
/>
```

### ScheduledTasksManager
```jsx
<ScheduledTasksManager />
// No props needed - self-contained
```

## 🔍 Testing Commands

```powershell
# Test backend
curl http://localhost:8000/api/schedule/stats

# Expected response
{
  "total_tasks": 0,
  "pending_tasks": 0,
  "completed_tasks": 0,
  "failed_tasks": 0,
  "running_tasks": 0
}

# Create test task
curl -X POST http://localhost:8000/api/schedule/tasks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Task",
    "task_type": "command",
    "recurrence_type": "once",
    "scheduled_time": "2024-12-31T14:00:00",
    "device_ids": [],
    "group_ids": [1],
    "task_payload": {
      "command_payload": {
        "command": "echo test",
        "shell": "cmd"
      }
    }
  }'
```

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| Module not found | `pip install apscheduler` |
| Tables don't exist | `python create_schedule_tables.py` |
| Modal won't open | Check imports and state |
| 401 Unauthorized | Verify authentication token |
| Task doesn't run | Check logs, verify scheduler started |

## 📊 Status Values

- `pending` - Scheduled, waiting for next run
- `running` - Currently executing
- `completed` - Finished successfully
- `failed` - Execution failed
- `paused` - Temporarily disabled

## 📁 Files Reference

### Backend
- `app/schedule/models.py` - Database models
- `app/schedule/scheduler.py` - Task scheduler
- `app/schedule/routes.py` - API endpoints
- `create_schedule_tables.py` - DB migration

### Frontend
- `components/SchedulingModal.jsx` - Modal UI
- `components/ScheduledTasksManager.jsx` - Task list
- `services/scheduling.js` - API service

### Documentation
- `SCHEDULING_SETUP_GUIDE.md` - Setup instructions
- `SCHEDULING_CODE_EXAMPLES.md` - Code samples
- `SCHEDULING_COMPLETE_SUMMARY.md` - Full summary

## 🎯 Success Indicators

✅ Schedule buttons visible  
✅ Modal opens and closes  
✅ Tasks created successfully  
✅ Tasks appear in list  
✅ Statistics show counts  
✅ Tasks execute on time  
✅ Pause/resume works  
✅ Delete removes task  

## 🔗 Workflow

```
1. User clicks "Schedule" → Modal opens
2. User fills form → Clicks "Schedule Task"
3. API creates task → Saves to DB
4. APScheduler schedules job
5. At scheduled time → Task executes
6. Execution recorded → Task rescheduled (if recurring)
7. User views in "Scheduled Tasks" tab
```

## 💡 Quick Tips

- **All times are UTC** - Convert from user's timezone
- **Next run calculated** - Automatically on create/update
- **Cron format** - Use crontab.guru for help
- **Task history** - View execution details in API
- **Pause vs Delete** - Pause to keep task, delete to remove
- **Execute now** - Run immediately without waiting
- **Weekly days** - 0=Sunday, 1=Monday, ..., 6=Saturday
- **Monthly days** - 1-31 (28 for all months)

## 🚦 Integration Order

1. Backend setup (5 min)
2. Test API (2 min)
3. Integrate Command page (15 min)
4. Integrate Software page (15 min)
5. Integrate File page (15 min)
6. Add Scheduled Tasks tab (5 min)
7. Test end-to-end (10 min)

**Total Time: ~1 hour**

## 📞 Support Files

Need help? Check these docs in order:
1. `SCHEDULING_SETUP_GUIDE.md` - Setup
2. `SCHEDULING_CODE_EXAMPLES.md` - Integration
3. `SCHEDULING_COMPLETE_SUMMARY.md` - Overview
4. `SCHEDULING_VISUAL_ARCHITECTURE.md` - Architecture

---

**Print this page for quick reference during integration!**
