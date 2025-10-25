# DeployX Scheduling System - Visual Architecture

## System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           USER INTERFACE                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │   Command    │  │   Software   │  │     File     │             │
│  │  Deployment  │  │  Deployment  │  │  Deployment  │             │
│  │              │  │              │  │              │             │
│  │ [Schedule] ■ │  │ [Schedule] ■ │  │ [Schedule] ■ │             │
│  │ [Execute]  ▶ │  │ [Execute]  ▶ │  │ [Execute]  ▶ │             │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘             │
│         │                  │                  │                     │
│         └──────────────────┼──────────────────┘                     │
│                            │                                        │
│                   ┌────────▼────────┐                               │
│                   │ Scheduling Modal│                               │
│                   │  ┌───────────┐  │                               │
│                   │  │Task Name  │  │                               │
│                   │  │Recurrence │  │                               │
│                   │  │Date/Time  │  │                               │
│                   │  │[Schedule] │  │                               │
│                   │  └───────────┘  │                               │
│                   └────────┬────────┘                               │
│                            │                                        │
│                   ┌────────▼────────┐                               │
│                   │ Scheduled Tasks │                               │
│                   │    Manager      │                               │
│                   │  ┌───────────┐  │                               │
│                   │  │Task List  │  │                               │
│                   │  │[Pause]    │  │                               │
│                   │  │[Resume]   │  │                               │
│                   │  │[Execute]  │  │                               │
│                   │  │[Delete]   │  │                               │
│                   │  └───────────┘  │                               │
│                   └────────┬────────┘                               │
└────────────────────────────┼────────────────────────────────────────┘
                             │
                    HTTP/REST API
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│                        BACKEND API LAYER                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                   FastAPI Routes                              │  │
│  │  /api/schedule/                                               │  │
│  │    • POST   /tasks              - Create task                │  │
│  │    • GET    /tasks              - List tasks                 │  │
│  │    • GET    /tasks/{id}         - Get task                   │  │
│  │    • PUT    /tasks/{id}         - Update task                │  │
│  │    • DELETE /tasks/{id}         - Delete task                │  │
│  │    • POST   /tasks/{id}/pause   - Pause task                 │  │
│  │    • POST   /tasks/{id}/resume  - Resume task                │  │
│  │    • POST   /tasks/{id}/execute - Execute now                │  │
│  │    • GET    /tasks/{id}/executions - Get history             │  │
│  │    • GET    /stats              - Get statistics             │  │
│  └────────────────────────┬─────────────────────────────────────┘  │
│                           │                                         │
│  ┌────────────────────────▼─────────────────────────────────────┐  │
│  │                   Task Scheduler                              │  │
│  │                   (APScheduler)                               │  │
│  │                                                               │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │  │
│  │  │Cron Trigger │  │Date Trigger │  │Interval     │          │  │
│  │  │(recurring)  │  │(one-time)   │  │Trigger      │          │  │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘          │  │
│  │         │                │                │                   │  │
│  │         └────────────────┼────────────────┘                   │  │
│  │                          │                                    │  │
│  │                  ┌───────▼────────┐                           │  │
│  │                  │Task Execution  │                           │  │
│  │                  │   Handler      │                           │  │
│  │                  └───────┬────────┘                           │  │
│  └──────────────────────────┼────────────────────────────────────┘  │
└─────────────────────────────┼──────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
    ┌────▼────┐         ┌─────▼─────┐      ┌──────▼──────┐
    │Command  │         │ Software  │      │    File     │
    │Executor │         │Deployment │      │ Deployment  │
    │         │         │           │      │             │
    │Socket.IO│         │HTTP/WS    │      │HTTP/WS      │
    └────┬────┘         └─────┬─────┘      └──────┬──────┘
         │                    │                    │
         │                    │                    │
┌────────▼────────────────────▼────────────────────▼─────────┐
│                     Target Devices                          │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐         │
│  │Agent │  │Agent │  │Agent │  │Agent │  │Agent │  ...    │
│  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘         │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
                     ┌────────▼────────┐
                     │   PostgreSQL    │
                     │                 │
                     │  • scheduled_   │
                     │    tasks        │
                     │  • scheduled_   │
                     │    task_        │
                     │    executions   │
                     └─────────────────┘
```

## Component Interaction Flow

### 1. Task Creation Flow

```
User                SchedulingModal        API Service         Backend
 │                        │                    │                  │
 │ Clicks "Schedule"      │                    │                  │
 ├───────────────────────>│                    │                  │
 │                        │                    │                  │
 │ Fills form             │                    │                  │
 │ Selects recurrence     │                    │                  │
 │ Clicks "Schedule Task" │                    │                  │
 ├───────────────────────>│                    │                  │
 │                        │                    │                  │
 │                        │ createScheduledTask│                  │
 │                        ├───────────────────>│                  │
 │                        │                    │ POST /tasks      │
 │                        │                    ├─────────────────>│
 │                        │                    │                  │
 │                        │                    │                  │ Save to DB
 │                        │                    │                  ├───────────┐
 │                        │                    │                  │           │
 │                        │                    │                  │<──────────┘
 │                        │                    │                  │
 │                        │                    │                  │ Schedule Job
 │                        │                    │                  ├───────────┐
 │                        │                    │                  │           │
 │                        │                    │                  │<──────────┘
 │                        │                    │   201 Created    │
 │                        │                    │<─────────────────┤
 │                        │   Task Object      │                  │
 │                        │<───────────────────┤                  │
 │ Success message        │                    │                  │
 │<───────────────────────┤                    │                  │
 │                        │                    │                  │
```

### 2. Task Execution Flow

```
APScheduler        TaskScheduler       Executor           Database
    │                   │                 │                  │
    │ Trigger fires     │                 │                  │
    ├──────────────────>│                 │                  │
    │                   │                 │                  │
    │                   │ Update status   │                  │
    │                   │ to "running"    │                  │
    │                   ├─────────────────┼─────────────────>│
    │                   │                 │                  │
    │                   │ Execute task    │                  │
    │                   ├────────────────>│                  │
    │                   │                 │                  │
    │                   │                 │ Send command     │
    │                   │                 │ to agents        │
    │                   │                 ├──────────────┐   │
    │                   │                 │              │   │
    │                   │                 │<─────────────┘   │
    │                   │                 │                  │
    │                   │ Results         │                  │
    │                   │<────────────────┤                  │
    │                   │                 │                  │
    │                   │ Save execution  │                  │
    │                   │ record          │                  │
    │                   ├─────────────────┼─────────────────>│
    │                   │                 │                  │
    │                   │ Update task     │                  │
    │                   │ (next_run,      │                  │
    │                   │  status)        │                  │
    │                   ├─────────────────┼─────────────────>│
    │                   │                 │                  │
    │ Reschedule (if    │                 │                  │
    │ recurring)        │                 │                  │
    │<──────────────────┤                 │                  │
    │                   │                 │                  │
```

### 3. Task Management Flow

```
User            ScheduledTasksManager    API Service      Backend
 │                      │                     │              │
 │ Opens "Scheduled     │                     │              │
 │ Tasks" tab           │                     │              │
 ├─────────────────────>│                     │              │
 │                      │                     │              │
 │                      │ getTasks()          │              │
 │                      ├────────────────────>│              │
 │                      │                     │ GET /tasks   │
 │                      │                     ├─────────────>│
 │                      │                     │ Task list    │
 │                      │                     │<─────────────┤
 │                      │ Task list           │              │
 │                      │<────────────────────┤              │
 │                      │                     │              │
 │ View tasks           │                     │              │
 │<─────────────────────┤                     │              │
 │                      │                     │              │
 │ Clicks "Pause"       │                     │              │
 │ on a task            │                     │              │
 ├─────────────────────>│                     │              │
 │                      │ pauseTask(id)       │              │
 │                      ├────────────────────>│              │
 │                      │                     │ POST /pause  │
 │                      │                     ├─────────────>│
 │                      │                     │              │
 │                      │                     │              │ Remove job
 │                      │                     │              │ Update DB
 │                      │                     │              │
 │                      │                     │ Success      │
 │                      │                     │<─────────────┤
 │                      │ Updated task        │              │
 │                      │<────────────────────┤              │
 │ Task paused          │                     │              │
 │<─────────────────────┤                     │              │
 │                      │                     │              │
```

## Database Schema Visualization

```
┌─────────────────────────────────────────────┐
│           scheduled_tasks                    │
├─────────────────────────────────────────────┤
│ • id (UUID) PK                              │
│ • user_id (Integer) FK                      │
│ • name (String)                             │
│ • description (Text)                        │
│ • task_type (Enum)                          │
│   - command                                 │
│   - software_deployment                     │
│   - file_deployment                         │
│ • status (Enum)                             │
│   - pending                                 │
│   - running                                 │
│   - completed                               │
│   - failed                                  │
│   - paused                                  │
│ • recurrence_type (Enum)                    │
│   - once                                    │
│   - daily                                   │
│   - weekly                                  │
│   - monthly                                 │
│   - custom                                  │
│ • recurrence_config (JSON)                  │
│   {                                         │
│     "time": "14:00",                        │
│     "days": [1,2,3],                        │
│     "day_of_month": 15,                     │
│     "cron": "0 14 * * 1-5"                  │
│   }                                         │
│ • next_run_time (DateTime)                  │
│ • last_run_time (DateTime)                  │
│ • execution_count (Integer)                 │
│ • device_ids (JSON Array)                   │
│ • group_ids (JSON Array)                    │
│ • task_payload (JSON)                       │
│   {                                         │
│     "command_payload": {...},               │
│     "software_payload": {...},              │
│     "file_payload": {...}                   │
│   }                                         │
│ • created_at (DateTime)                     │
│ • updated_at (DateTime)                     │
└──────────────┬──────────────────────────────┘
               │ 1:N
               │
┌──────────────▼──────────────────────────────┐
│      scheduled_task_executions              │
├─────────────────────────────────────────────┤
│ • id (UUID) PK                              │
│ • task_id (UUID) FK                         │
│ • started_at (DateTime)                     │
│ • completed_at (DateTime)                   │
│ • status (Enum)                             │
│   - success                                 │
│   - failed                                  │
│ • result (JSON)                             │
│   {                                         │
│     "devices_targeted": 5,                  │
│     "devices_succeeded": 4,                 │
│     "devices_failed": 1,                    │
│     "execution_details": {...}              │
│   }                                         │
│ • error_message (Text)                      │
└─────────────────────────────────────────────┘
```

## State Transition Diagram

```
┌──────────┐
│  PENDING │ ──────────────────────────┐
└────┬─────┘                           │
     │                                 │
     │ scheduled_time                  │ pause()
     │ reached                         │
     │                                 │
┌────▼─────┐                      ┌────▼────┐
│ RUNNING  │ ─────────────────────>│ PAUSED  │
└────┬─────┘     pause()           └────┬────┘
     │                                  │
     │                                  │ resume()
     │                                  │
     │                              ┌───▼────┐
     │                              │PENDING │
     │                              │(again) │
     │                              └────────┘
     │ execution
     │ completes
     │
     ├──────────────┬──────────────┐
     │              │              │
┌────▼────┐   ┌─────▼─────┐  ┌────▼────┐
│COMPLETED│   │  FAILED   │  │ PENDING │
│         │   │           │  │(recurring)│
└─────────┘   └───────────┘  └─────────┘
     │              │              │
     │              │              │
     └──────────────┴──────────────┘
                   │
                   │ delete()
                   │
              ┌────▼────┐
              │ DELETED │
              └─────────┘
```

## Recurrence Pattern Examples

### Daily Recurrence
```
Time: 14:00
┌─────────────────────────────────────────────────────────>
│         │         │         │         │         │
Mon      Tue      Wed      Thu      Fri      Sat      Sun
14:00    14:00    14:00    14:00    14:00    14:00    14:00
 ✓        ✓        ✓        ✓        ✓        ✓        ✓
```

### Weekly Recurrence
```
Days: Mon, Wed, Fri
Time: 09:00
┌─────────────────────────────────────────────────────────>
│         │         │         │         │         │
Mon      Tue      Wed      Thu      Fri      Sat      Sun
09:00     -      09:00     -      09:00     -        -
 ✓                 ✓                 ✓
```

### Monthly Recurrence
```
Day: 15th
Time: 12:00
┌─────────────────────────────────────────────────────────>
Jan 15   Feb 15   Mar 15   Apr 15   May 15   Jun 15
12:00    12:00    12:00    12:00    12:00    12:00
 ✓        ✓        ✓        ✓        ✓        ✓
```

### Custom Cron
```
Cron: "0 8,12,18 * * 1-5"
(8am, 12pm, 6pm on weekdays)
┌─────────────────────────────────────────────────────────>
Mon     Tue     Wed     Thu     Fri     Sat     Sun
8,12,18 8,12,18 8,12,18 8,12,18 8,12,18  -       -
✓✓✓     ✓✓✓     ✓✓✓     ✓✓✓     ✓✓✓
```

## UI Component Hierarchy

```
App.jsx
 │
 ├─ Dashboard.jsx
 │   ├─ CommandDeployment (DeploymentManager.jsx)
 │   │   └─ SchedulingModal ────────┐
 │   │                               │
 │   ├─ SoftwareDeployment (DeploymentsManager.jsx)
 │   │   └─ SchedulingModal ────────┤ (Reusable)
 │   │                               │
 │   ├─ FileDeployment (FileSystemManager.jsx)
 │   │   └─ SchedulingModal ────────┘
 │   │
 │   └─ ScheduledTasks
 │       └─ ScheduledTasksManager.jsx
 │           ├─ Stats Dashboard
 │           ├─ Search & Filters
 │           └─ Task List
 │               └─ Task Card
 │                   ├─ Status Badge
 │                   ├─ Task Info
 │                   └─ Action Buttons
 │
 └─ Services
     └─ scheduling.js (API calls)
```

## Data Flow Example: Creating a Daily Task

```
1. User Input (Frontend)
   ┌─────────────────────────┐
   │ Name: "Daily Update"    │
   │ Type: Command           │
   │ Recurrence: Daily       │
   │ Time: 02:00             │
   │ Command: "apt update"   │
   │ Groups: [1, 2, 3]       │
   └────────┬────────────────┘
            │
            ▼
2. API Request (schedulingService.createScheduledTask)
   ┌─────────────────────────┐
   │ POST /api/schedule/tasks│
   │ Headers: {              │
   │   Authorization: token  │
   │ }                       │
   │ Body: {                 │
   │   name: "Daily Update", │
   │   task_type: "command", │
   │   recurrence_type:      │
   │     "daily",            │
   │   recurrence_config: {  │
   │     time: "02:00"       │
   │   },                    │
   │   device_ids: [],       │
   │   group_ids: [1,2,3],   │
   │   task_payload: {       │
   │     command_payload: {  │
   │       command: "apt...", │
   │       shell: "bash"     │
   │     }                   │
   │   }                     │
   │ }                       │
   └────────┬────────────────┘
            │
            ▼
3. Backend Processing
   ┌─────────────────────────┐
   │ • Validate input        │
   │ • Calculate next run:   │
   │   Today 02:00 or        │
   │   Tomorrow 02:00        │
   │ • Create DB record      │
   │ • Create cron trigger:  │
   │   "0 2 * * *"           │
   │ • Schedule job in       │
   │   APScheduler           │
   └────────┬────────────────┘
            │
            ▼
4. Database Record
   ┌─────────────────────────┐
   │ id: uuid                │
   │ name: "Daily Update"    │
   │ task_type: command      │
   │ status: pending         │
   │ recurrence_type: daily  │
   │ next_run_time:          │
   │   2024-01-15 02:00:00   │
   │ execution_count: 0      │
   └────────┬────────────────┘
            │
            ▼
5. APScheduler Job
   ┌─────────────────────────┐
   │ Trigger: CronTrigger    │
   │ Cron: "0 2 * * *"       │
   │ Function: execute_task  │
   │ Args: [task_id]         │
   │ Next run:               │
   │   2024-01-15 02:00:00   │
   └─────────────────────────┘
```

## Error Handling Flow

```
Task Execution Error
        │
        ▼
┌───────────────────┐
│ Execution fails   │
└────────┬──────────┘
         │
         ├──> Update task status to "failed"
         │
         ├──> Create execution record with error
         │
         ├──> Log error details
         │
         ├──> If recurring:
         │    └──> Reschedule for next run
         │
         └──> If one-time:
              └──> Mark as failed (no reschedule)
```

This visual architecture guide provides a comprehensive overview of how all components interact in the DeployX scheduling system.
