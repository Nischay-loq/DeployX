# Software Deployment Flow - DeployX

## Overview
This flowchart explains the complete process of deploying software packages to remote devices through agents.

---

## Software Deployment Flowchart

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    SOFTWARE DEPLOYMENT FLOW                              │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   START      │
│   User       │
│   Action     │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────┐
│  FRONTEND: Create Deployment         │
│                                      │
│  User Selects:                       │
│  ✓ Software Package(s)               │
│  ✓ Target Devices                    │
│  ✓ Target Groups                     │
│  ✓ Deployment Name                   │
│  ✓ Strategy (Optional)               │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Frontend Validation                 │
│  - Check required fields             │
│  - Validate selections               │
│  - Confirm targets exist             │
└──────┬───────────────────────────────┘
       │
       ├─────────────┬─────────────┐
       │             │             │
       ▼             ▼             ▼
   VALID         INVALID       CANCEL
       │             │             │
       │             ▼             ▼
       │      ┌──────────┐   ┌────────┐
       │      │  Show    │   │  EXIT  │
       │      │  Error   │   └────────┘
       │      └────┬─────┘
       │           │
       │           └──────────┐
       │                      │
       ▼                      ▼
┌──────────────────────────────────────┐
│  POST /deployments/create            │
│                                      │
│  Payload: {                          │
│    name: string,                     │
│    software_ids: number[],           │
│    device_ids: number[],             │
│    group_ids: number[],              │
│    custom_software: object[]         │
│  }                                   │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│         BACKEND: Deployment Creation                     │
│                                                           │
│  1. Authenticate User (JWT Token)                        │
│  2. Validate Payload                                     │
│  3. Expand Group IDs to Device IDs                       │
│  4. Verify Device Ownership                              │
│  5. Check Software Availability                          │
└──────┬────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Create Deployment Record            │
│                                      │
│  Database Insert:                    │
│  - deployments table                 │
│    ├─ id (auto)                      │
│    ├─ name                           │
│    ├─ status: 'pending'              │
│    ├─ created_by (user_id)           │
│    ├─ created_at                     │
│    └─ strategy_type                  │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Create Deployment Targets           │
│                                      │
│  For Each Device:                    │
│  - deployment_targets table          │
│    ├─ deployment_id                  │
│    ├─ device_id                      │
│    ├─ software_id                    │
│    └─ deployment_status: 'pending'   │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Start Background Task               │
│  (FastAPI BackgroundTasks)           │
│                                      │
│  execute_software_deployment_        │
│  background(deployment_id)           │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Return Response to Frontend         │
│  {                                   │
│    success: true,                    │
│    deployment_id: number,            │
│    message: "Deployment started"     │
│  }                                   │
└──────┬───────────────────────────────┘
       │
       ├────────────────┬────────────────┐
       │                │                │
       ▼                ▼                ▼
   Frontend       Background         Database
   Loading...     Task Starts        Status: pending
       │                │                │
       │                │                │
       │                ▼                │
       │   ┌─────────────────────────┐  │
       │   │  BACKGROUND EXECUTION   │  │
       │   └─────────────────────────┘  │
       │                │                │
       │                ▼                │
       │   ┌─────────────────────────┐  │
       │   │  Get Deployment Targets │  │
       │   │  From Database          │  │
       │   └────────┬────────────────┘  │
       │            │                    │
       │            ▼                    │
       │   ┌─────────────────────────┐  │
       │   │  For Each Target:       │  │
       │   │  ┌──────────────────┐   │  │
       │   │  │ Get Device Info  │   │  │
       │   │  └────────┬─────────┘   │  │
       │   │           │              │  │
       │   │           ▼              │  │
       │   │  ┌──────────────────┐   │  │
       │   │  │ Check Agent      │   │  │
       │   │  │ Connection       │   │  │
       │   │  └────────┬─────────┘   │  │
       │   │           │              │  │
       │   └───────────┼──────────────┘  │
       │               │                 │
       │               ├──────┬──────┐   │
       │               │      │      │   │
       │               ▼      ▼      ▼   │
       │           Online  Offline Error │
       │               │      │      │   │
       │               │      ▼      ▼   │
       │               │  ┌─────────────┐│
       │               │  │ Mark Failed ││
       │               │  │ Update DB   ││
       │               │  └─────────────┘│
       │               │                 │
       │               ▼                 │
       │   ┌──────────────────────────┐ │
       │   │  Get Software Details    │ │
       │   │  - Name, URL, Args       │ │
       │   └────────┬─────────────────┘ │
       │            │                   │
       │            ▼                   │
       │   ┌──────────────────────────┐ │
       │   │  Find Agent Socket.IO    │ │
       │   │  Session (SID)           │ │
       │   │  - Map agent_id → SID    │ │
       │   └────────┬─────────────────┘ │
       │            │                   │
       │            ▼                   │
       │   ┌──────────────────────────┐ │
       │   │  Emit Socket.IO Event:   │ │
       │   │  'deploy_software'       │ │
       │   │                          │ │
       │   │  Payload: {              │ │
       │   │    deployment_id: int,   │ │
       │   │    target_id: int,       │ │
       │   │    software_name: str,   │ │
       │   │    download_url: str,    │ │
       │   │    install_args: str     │ │
       │   │  }                       │ │
       │   └────────┬─────────────────┘ │
       │            │                   │
       │            ▼                   │
       │                                │
       ▼                                ▼
┌──────────────────────────────────────────────┐
│         AGENT: Receive Event                 │
│                                              │
│  Event: 'deploy_software'                    │
│  Handler: handle_deploy_software()           │
└──────┬───────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Agent: Download Software            │
│                                      │
│  1. Parse download URL               │
│  2. Create temp directory            │
│  3. Download file (HTTP GET)         │
│  4. Validate download                │
│  5. Check file integrity             │
└──────┬───────────────────────────────┘
       │
       ├─────────────┬─────────────┐
       │             │             │
       ▼             ▼             ▼
   SUCCESS       FAILURE       TIMEOUT
       │             │             │
       │             ▼             ▼
       │      ┌──────────────────────┐
       │      │  Emit 'deployment_   │
       │      │  result' with error  │
       │      └──────────┬───────────┘
       │                 │
       │                 └──────┐
       │                        │
       ▼                        │
┌──────────────────────────────┼──────┐
│  Agent: Execute Installation │      │
│                              │      │
│  Platform Detection:         │      │
│  ├─ Windows: .exe, .msi      │      │
│  ├─ Linux: .deb, .rpm, .sh   │      │
│  └─ macOS: .dmg, .pkg        │      │
│                              │      │
│  Execute:                    │      │
│  - Run installer silently    │      │
│  - Apply install_args        │      │
│  - Capture output            │      │
│  - Monitor exit code         │      │
└──────┬───────────────────────┼──────┘
       │                       │
       ├─────────┬─────────┐   │
       │         │         │   │
       ▼         ▼         ▼   │
   SUCCESS   FAILURE   ERROR   │
       │         │         │   │
       │         └────┬────┘   │
       │              │        │
       ▼              ▼        │
┌──────────────────────────────┼──────┐
│  Emit 'deployment_result'    │      │
│                              │      │
│  Payload: {                  │      │
│    deployment_id: int,       │      │
│    target_id: int,           │      │
│    status: 'success'/'failed'│      │
│    message: string,          │      │
│    error_details: string     │      │
│  }                           │      │
└──────┬───────────────────────┼──────┘
       │                       │
       └───────────┬───────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│  BACKEND: Receive 'deployment_       │
│           result'                    │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Update Database                     │
│                                      │
│  deployment_targets:                 │
│  - deployment_status: result.status  │
│  - result_message: result.message    │
│  - error_details: result.error       │
│  - completed_at: NOW()               │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Check All Targets Complete?         │
│  - Query deployment_targets          │
│  - Count pending vs completed        │
└──────┬───────────────────────────────┘
       │
       ├────────────┬─────────────┐
       │            │             │
       ▼            ▼             ▼
   All Done    Some Pending   All Failed
       │            │             │
       │            │             │
       ▼            │             ▼
┌──────────────┐   │      ┌──────────────┐
│ Update       │   │      │ Update       │
│ Deployment:  │   │      │ Deployment:  │
│ status =     │   │      │ status =     │
│ 'completed'  │   │      │ 'failed'     │
└──────┬───────┘   │      └──────┬───────┘
       │            │             │
       └────────────┼─────────────┘
                    │
                    ▼
            ┌──────────────┐
            │ Continue     │
            │ Waiting      │
            └──────────────┘
                    │
                    ▼
┌──────────────────────────────────────┐
│  Calculate Statistics                │
│  - Total targets                     │
│  - Successful deployments            │
│  - Failed deployments                │
│  - Success rate %                    │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Emit Notification Event             │
│  'deployment_completed'              │
│                                      │
│  Payload: {                          │
│    deployment_id: int,               │
│    deployment_name: string,          │
│    status: string,                   │
│    success_count: int,               │
│    failure_count: int,               │
│    total_count: int,                 │
│    created_at: timestamp,            │
│    ended_at: timestamp               │
│  }                                   │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  FRONTEND: Receive Notification      │
│  - Show notification popup           │
│  - Update deployment list            │
│  - Refresh dashboard stats           │
│  - Play notification sound (future)  │
└──────┬───────────────────────────────┘
       │
       ▼
   ┌────────┐
   │  END   │
   └────────┘
```

---

## Parallel Deployment Flow

```
┌─────────────────────────────────────────────────────────────┐
│              PARALLEL DEPLOYMENT TO MULTIPLE DEVICES         │
└─────────────────────────────────────────────────────────────┘

Background Task
      │
      ▼
┌─────────────────────┐
│  Get All Targets    │
│  (Device 1, 2, 3)   │
└──────┬──────────────┘
       │
       ├──────────────┬──────────────┬──────────────┐
       │              │              │              │
       ▼              ▼              ▼              ▼
  ┌────────┐    ┌────────┐    ┌────────┐    ┌────────┐
  │Device 1│    │Device 2│    │Device 3│    │Device N│
  └───┬────┘    └───┬────┘    └───┬────┘    └───┬────┘
      │             │             │             │
      ▼             ▼             ▼             ▼
  ┌────────┐    ┌────────┐    ┌────────┐    ┌────────┐
  │ Deploy │    │ Deploy │    │ Deploy │    │ Deploy │
  │Software│    │Software│    │Software│    │Software│
  └───┬────┘    └───┬────┘    └───┬────┘    └───┬────┘
      │             │             │             │
      │             │             │             │
      ▼             ▼             ▼             ▼
  (Running in parallel - async operations)
      │             │             │             │
      ▼             ▼             ▼             ▼
  ┌────────┐    ┌────────┐    ┌────────┐    ┌────────┐
  │Success │    │Success │    │Failed  │    │Success │
  └───┬────┘    └───┬────┘    └───┬────┘    └───┬────┘
      │             │             │             │
      └─────────────┴─────────────┴─────────────┘
                    │
                    ▼
          ┌──────────────────┐
          │ All Complete     │
          │ Update Status    │
          │ Send Notification│
          └──────────────────┘
```

---

## Error Handling Flow

```
┌─────────────────────────────────────┐
│       ERROR SCENARIOS               │
└─────────────────────────────────────┘

Error Type                 Handler
─────────────────────────────────────────────
Agent Offline              → Mark failed, notify user
Download Failed            → Retry 3x, then fail
Installation Failed        → Capture logs, mark failed
Invalid Software URL       → Immediate fail
Permission Denied          → Log error, mark failed
Disk Space Insufficient    → Check & fail
Network Timeout            → Retry with timeout
Database Error             → Rollback, log error
Socket Disconnect          → Queue for retry
Invalid Payload            → Return 400 error
```

---

## State Transitions

```
Deployment Status States:
┌─────────┐
│ pending │
└────┬────┘
     │
     ▼
┌──────────────┐
│ in_progress  │
└────┬─────────┘
     │
     ├──────────┬──────────┬──────────┐
     │          │          │          │
     ▼          ▼          ▼          ▼
┌──────────┐ ┌──────┐ ┌────────┐ ┌─────────┐
│completed │ │failed│ │partial │ │canceled │
└──────────┘ └──────┘ └────────┘ └─────────┘

Target Status States:
┌─────────┐
│ pending │
└────┬────┘
     │
     ▼
┌──────────────┐
│ downloading  │
└────┬─────────┘
     │
     ▼
┌──────────────┐
│ installing   │
└────┬─────────┘
     │
     ├──────────┬──────────┐
     │          │          │
     ▼          ▼          ▼
┌──────────┐ ┌──────┐ ┌────────┐
│completed │ │failed│ │skipped │
└──────────┘ └──────┘ └────────┘
```

---

## Database Schema

```
┌────────────────────────────────────────┐
│         deployments                    │
├────────────────────────────────────────┤
│ id                INTEGER PRIMARY KEY  │
│ name              TEXT                 │
│ status            TEXT                 │
│ created_by        INTEGER (FK users)   │
│ created_at        TIMESTAMP            │
│ started_at        TIMESTAMP            │
│ ended_at          TIMESTAMP            │
│ strategy_type     TEXT                 │
└────────────────────────────────────────┘
           │
           │ 1:N
           ▼
┌────────────────────────────────────────┐
│      deployment_targets                │
├────────────────────────────────────────┤
│ id                INTEGER PRIMARY KEY  │
│ deployment_id     INTEGER (FK)         │
│ device_id         INTEGER (FK)         │
│ software_id       INTEGER (FK)         │
│ deployment_status TEXT                 │
│ result_message    TEXT                 │
│ error_details     TEXT                 │
│ started_at        TIMESTAMP            │
│ completed_at      TIMESTAMP            │
└────────────────────────────────────────┘
```

---

## API Endpoints

### Create Deployment
```
POST /deployments/create
Headers: Authorization: Bearer {token}
Body: {
  name: string,
  software_ids: number[],
  device_ids: number[],
  group_ids: number[],
  custom_software: object[]
}
Response: {
  success: boolean,
  deployment_id: number,
  message: string
}
```

### Get Progress
```
GET /deployments/{deployment_id}/progress
Headers: Authorization: Bearer {token}
Response: {
  deployment_id: number,
  status: string,
  total_targets: number,
  completed: number,
  failed: number,
  success_rate: number,
  targets: DeploymentTarget[]
}
```

---

## Socket.IO Events

### Backend → Agent
```javascript
Event: 'deploy_software'
Payload: {
  deployment_id: number,
  target_id: number,
  software_name: string,
  download_url: string,
  install_args: string
}
```

### Agent → Backend
```javascript
Event: 'deployment_result'
Payload: {
  deployment_id: number,
  target_id: number,
  status: 'success' | 'failed',
  message: string,
  error_details?: string
}
```

### Backend → Frontend
```javascript
Event: 'deployment_completed'
Payload: {
  deployment_id: number,
  deployment_name: string,
  status: string,
  success_count: number,
  failure_count: number,
  total_count: number
}
```

---

## Performance Considerations

1. **Async Execution**: Background tasks don't block API responses
2. **Parallel Deployments**: Multiple devices receive commands simultaneously
3. **Database Optimization**: Batch updates where possible
4. **Socket.IO Efficiency**: Direct SID routing to specific agents
5. **Error Recovery**: Automatic retry mechanisms

---

## Security Features

1. **Authentication**: JWT token required
2. **Authorization**: Users can only deploy to their devices
3. **Validation**: Software URLs and payloads validated
4. **Audit Trail**: All deployments logged with user ID
5. **Resource Limits**: Prevent DOS with rate limiting

---

**Last Updated**: January 9, 2025
**Version**: 1.0
