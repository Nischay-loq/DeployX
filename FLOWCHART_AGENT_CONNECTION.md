# Agent Connection Flow - DeployX

## Overview
This flowchart explains how agents connect to the DeployX backend server and establish real-time communication.

---

## Agent Connection Flowchart

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       AGENT CONNECTION FLOW                              │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   START      │
│   Agent      │
│   Launch     │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│ Read Configuration   │
│ - Server URL         │
│ - Agent ID           │
│ - Machine Info       │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Generate/Load Machine ID     │
│ - Check machine_id.json      │
│ - Create if not exists       │
│ - Use hardware UUID          │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Initialize Socket.IO Client  │
│ - Connect to server          │
│ - Set reconnection options   │
│ - Enable auto-reconnect      │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│  Socket.IO Connection        │
│  Attempt                     │
└──────┬───────────────────────┘
       │
       ├─────────────┬─────────────────┐
       │             │                 │
       ▼             ▼                 ▼
   SUCCESS       FAILURE           TIMEOUT
       │             │                 │
       │             ▼                 ▼
       │      ┌─────────────┐   ┌─────────────┐
       │      │   Log Error │   │   Retry     │
       │      │   Wait 5s   │   │  Connection │
       │      └──────┬──────┘   └──────┬──────┘
       │             │                 │
       │             └────────┬────────┘
       │                      │
       │                      ▼
       │              ┌───────────────┐
       │              │  Retry Loop   │
       │              │  (Max 10x)    │
       │              └───────┬───────┘
       │                      │
       │                      └──────────┐
       │                                 │
       ▼                                 ▼
┌──────────────────────────────┐  ┌────────────┐
│  'connect' Event Triggered   │  │    FAIL    │
└──────┬───────────────────────┘  │   EXIT     │
       │                           └────────────┘
       ▼
┌──────────────────────────────┐
│  Log: Agent Connected        │
│  Status: Online              │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Emit 'agent_register' Event         │
│  Payload:                            │
│  {                                   │
│    agent_id: string,                 │
│    hostname: string,                 │
│    platform: string,                 │
│    ip_address: string,               │
│    machine_id: string                │
│  }                                   │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│        BACKEND PROCESSING            │
│                                      │
│  1. Receive 'agent_register'        │
│  2. Validate agent data             │
│  3. Check if agent exists in DB     │
│     ├─ Exists: Update status        │
│     └─ New: Create device record    │
│  4. Save to Database                │
│  5. Store Socket.IO session (SID)   │
│  6. Map agent_id → SID              │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Emit 'registration_success'         │
│  Payload: { agent_id: string }       │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  AGENT: Receive 'registration_       │
│         success'                     │
│  - Log success message               │
│  - Set status: registered            │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Broadcast to All Frontend Clients   │
│  Event: 'device_status_changed'      │
│  Payload: {                          │
│    agent_id: string,                 │
│    device_name: string,              │
│    status: 'online',                 │
│    last_seen: timestamp              │
│  }                                   │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  FRONTEND: Receive Event             │
│  - Update device list UI             │
│  - Show notification                 │
│  - Update dashboard stats            │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Agent Enters Ready State            │
│  - Listening for commands            │
│  - Heartbeat active                  │
│  - Ready for deployments             │
└──────┬───────────────────────────────┘
       │
       ▼
   ┌───────┐
   │ READY │
   └───┬───┘
       │
       ▼
┌──────────────────────────────────────┐
│      HEARTBEAT LOOP (Every 30s)      │
│                                      │
│  ┌──────────────────────┐           │
│  │ Send Ping to Server  │           │
│  └─────────┬────────────┘           │
│            │                         │
│            ▼                         │
│  ┌──────────────────────┐           │
│  │ Server Responds Pong │           │
│  └─────────┬────────────┘           │
│            │                         │
│            ▼                         │
│  ┌──────────────────────┐           │
│  │ Update last_seen     │           │
│  │ in Database          │           │
│  └─────────┬────────────┘           │
│            │                         │
│            └──────┐                  │
│                   │                  │
│         ┌─────────▼────────┐        │
│         │  Wait 30 seconds │        │
│         └─────────┬────────┘        │
│                   │                  │
│                   └────────┐         │
│                            │         │
└────────────────────────────┼─────────┘
                             │
                             ▼
                    (Continue Loop)
```

---

## Disconnection Flow

```
┌──────────────────────────────────────┐
│     AGENT DISCONNECTION              │
└──────────────────────────────────────┘

   Trigger Events:
   - Agent crashes
   - Network failure
   - Manual shutdown
   - Server shutdown
         │
         ▼
┌──────────────────────────────────────┐
│  Socket.IO 'disconnect' Event        │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  BACKEND: Handle Disconnect          │
│  1. Log disconnection                │
│  2. Update device status: 'offline'  │
│  3. Update last_seen timestamp       │
│  4. Remove SID mapping               │
│  5. Save to database                 │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Broadcast to Frontend               │
│  Event: 'device_status_changed'      │
│  Payload: {                          │
│    agent_id: string,                 │
│    status: 'offline'                 │
│  }                                   │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  FRONTEND: Update UI                 │
│  - Device shows as offline (red)     │
│  - Show notification                 │
│  - Update dashboard counters         │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  AGENT: Auto-Reconnect Attempt       │
│  - Wait exponential backoff          │
│  - Retry connection                  │
│  - Max attempts: 10                  │
└──────┬───────────────────────────────┘
       │
       ├────────────┬─────────────┐
       │            │             │
       ▼            ▼             ▼
   SUCCESS     MAX RETRIES    WAITING
       │            │             │
       │            ▼             │
       │     ┌──────────┐        │
       │     │   STOP   │        │
       │     │  Agent   │        │
       │     └──────────┘        │
       │                         │
       └──────────┬──────────────┘
                  │
                  ▼
          (Back to Connection Flow)
```

---

## Key Components

### 1. **Agent Side (Python)**
- **File**: `agent/main.py`
- **Socket.IO Client**: Connects to backend
- **Machine ID**: Unique identifier generation
- **Event Handlers**: `connect`, `disconnect`, `registration_success`

### 2. **Backend Side (FastAPI)**
- **File**: `backend/app/main.py`
- **Socket.IO Server**: Accepts agent connections
- **Event Handlers**: `agent_register`, `disconnect`
- **Database**: Device table for agent storage

### 3. **Frontend Side (React)**
- **File**: `frontend/src/pages/Dashboard.jsx`
- **Socket.IO Client**: Receives device updates
- **Event Listener**: `device_status_changed`
- **UI Updates**: Real-time device list refresh

---

## Data Flow

```
Agent              Backend             Database           Frontend
  │                   │                   │                   │
  │  agent_register   │                   │                   │
  ├──────────────────►│                   │                   │
  │                   │   Save/Update     │                   │
  │                   ├──────────────────►│                   │
  │                   │                   │                   │
  │                   │   device_status_  │                   │
  │                   │     changed       │                   │
  │                   ├───────────────────┼──────────────────►│
  │                   │                   │                   │
  │  registration_    │                   │    Update UI      │
  │    success        │                   │                   │
  │◄──────────────────┤                   │                   │
  │                   │                   │                   │
```

---

## Error Handling

### Connection Errors
```
Error Type              Action
─────────────────────────────────────────────────
Network Timeout         → Retry with backoff
Invalid Credentials     → Log & Exit
Server Unavailable      → Retry 10 times
Socket Error            → Reconnect
Registration Failed     → Log & Retry
Database Error          → Server logs error
```

---

## Status States

```
Agent States:
┌────────────┐
│   Start    │
└─────┬──────┘
      │
      ▼
┌────────────┐
│ Connecting │
└─────┬──────┘
      │
      ▼
┌────────────┐     Error      ┌────────────┐
│ Connected  ├───────────────►│ Retrying   │
└─────┬──────┘                └─────┬──────┘
      │                             │
      ▼                             │
┌────────────┐                      │
│Registering │                      │
└─────┬──────┘                      │
      │                             │
      ▼                             │
┌────────────┐     Disconnect       │
│   Ready    ├─────────────────────►│
└─────┬──────┘                      │
      │                             │
      ▼                             │
┌────────────┐                      │
│  Active    │                      │
│ (Listening)│                      │
└─────┬──────┘                      │
      │                             │
      └─────────────────────────────┘
```

---

## Database Schema

### Device Table
```
┌─────────────────────────────────────┐
│          devices                    │
├─────────────────────────────────────┤
│ id              INTEGER PRIMARY KEY │
│ agent_id        TEXT UNIQUE         │
│ device_name     TEXT                │
│ hostname        TEXT                │
│ platform        TEXT                │
│ ip_address      TEXT                │
│ machine_id      TEXT UNIQUE         │
│ status          TEXT (online/offline)│
│ last_seen       TIMESTAMP           │
│ created_at      TIMESTAMP           │
│ user_id         INTEGER (FK)        │
└─────────────────────────────────────┘
```

---

## Configuration

### Agent Configuration
```python
# agent/main.py
SERVER_URL = "https://deployx-server.onrender.com"
RECONNECT_ATTEMPTS = 10
RECONNECT_DELAY = 5  # seconds
HEARTBEAT_INTERVAL = 30  # seconds
```

### Backend Configuration
```python
# backend/app/main.py
PING_TIMEOUT = 60  # seconds
PING_INTERVAL = 25  # seconds
CORS_ORIGINS = ["http://localhost:5173", ...]
```

---

## Security Considerations

1. **Authentication**: Socket.IO connections are session-based
2. **User Association**: Devices linked to user accounts
3. **Validation**: Agent registration data validated
4. **IP Tracking**: Source IP logged for security
5. **Session Management**: SID mapped to agent_id

---

## Monitoring & Logging

### Agent Logs
```
[INFO] Connecting to server...
[INFO] Connected successfully
[INFO] Registering agent: DESKTOP-ABC123
[INFO] Registration successful
[INFO] Agent ready - Listening for commands
```

### Backend Logs
```
[INFO] New agent connection: sid=xyz123
[INFO] Agent registered: DESKTOP-ABC123
[INFO] Device status updated: online
[INFO] Broadcasting status change
```

### Frontend Logs
```
[INFO] Device status changed: DESKTOP-ABC123 → online
[INFO] Dashboard stats updated
[INFO] Notification: Agent Connected
```

---

**Last Updated**: January 9, 2025
**Version**: 1.0
