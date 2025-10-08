# DeployX - Comprehensive System Flowchart

## Overview
This document provides a complete end-to-end view of the DeployX system, showing how all components work together.

---

## High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    DeployX SYSTEM ARCHITECTURE                           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│                          USER INTERFACE                                  │
│                         (React Frontend)                                 │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Dashboard  │  Software  │  Files  │  Devices  │  Groups         │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└────────────────────────────┬─────────────────────────────────────────────┘
                             │
                             │ HTTP/HTTPS + WebSocket
                             │
┌────────────────────────────▼─────────────────────────────────────────────┐
│                                                                          │
│                        BACKEND SERVER                                    │
│                       (FastAPI + Socket.IO)                              │
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │     Auth     │  │  Deployment  │  │    Files     │  │  Devices   │  │
│  │   Routes     │  │   Routes     │  │   Routes     │  │  Routes    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘  │
│                                                                          │
└────────┬─────────────────────┬───────────────────────────┬───────────────┘
         │                     │                           │
         │ Database            │ Socket.IO Events          │ File System
         │                     │                           │
┌────────▼────────┐   ┌────────▼──────────┐   ┌──────────▼────────┐
│                 │   │                   │   │                    │
│   PostgreSQL    │   │   Socket.IO Hub   │   │   uploads/         │
│   Database      │   │   (Real-time)     │   │   (File Storage)   │
│                 │   │                   │   │                    │
└─────────────────┘   └────────┬──────────┘   └────────────────────┘
                               │
                               │ WebSocket
                               │
         ┌─────────────────────┴──────────────────────┬────────────────┐
         │                                            │                │
         │                                            │                │
┌────────▼────────┐   ┌────────────────┐   ┌─────────▼─────┐   ┌──────────┐
│                 │   │                │   │               │   │          │
│   Agent 1       │   │   Agent 2      │   │   Agent 3     │   │  Agent N │
│   (Windows)     │   │   (Ubuntu)     │   │   (CentOS)    │   │  (...)   │
│                 │   │                │   │               │   │          │
└─────────────────┘   └────────────────┘   └───────────────┘   └──────────┘
```

---

## Complete System Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      END-TO-END SYSTEM FLOW                              │
└─────────────────────────────────────────────────────────────────────────┘

1. USER LOGIN
   │
   ▼
┌─────────────────────────────────────────┐
│ Frontend: Login Page                    │
│ - User enters credentials               │
│ - POST /auth/login                      │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ Backend: Verify Credentials             │
│ - Check username/password hash          │
│ - Generate JWT token                    │
│ - Return token + user info              │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ Frontend: Store Token                   │
│ - Save in localStorage                  │
│ - Redirect to Dashboard                 │
└──────────┬──────────────────────────────┘
           │
           │
2. DASHBOARD INITIALIZATION
   │
   ▼
┌─────────────────────────────────────────┐
│ Frontend: Dashboard Loads               │
│ - Connect to Socket.IO server           │
│ - Fetch initial data (API calls)        │
│   * GET /devices                        │
│   * GET /groups                         │
│   * GET /deployments                    │
│   * GET /files/deployments              │
│   * GET /files/uploaded                 │
│   * GET /stats                          │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ Backend: Return Data                    │
│ - Query database                        │
│ - Format response                       │
│ - Send JSON                             │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ Frontend: Update State & Render         │
│ - Display stats cards                   │
│ - Show device list                      │
│ - Display deployment history            │
└──────────┬──────────────────────────────┘
           │
           │
3. AGENT CONNECTION
   │
   ▼
┌─────────────────────────────────────────┐
│ Agent: Start & Connect                  │
│ - Read config (server URL, port)        │
│ - Generate/read machine ID              │
│ - Establish Socket.IO connection        │
│ - Emit 'agent_connected' event          │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ Backend: Handle Agent Connection        │
│ - Receive 'agent_connected' event       │
│ - Extract device info from payload      │
│ - Query database for device             │
│   * If exists: Update status to online  │
│   * If new: Create device record        │
│ - Store Socket.IO session ID (sid)      │
│ - Emit 'agent_connected' to frontend    │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ Frontend: Receive Agent Event           │
│ - Update device list (add/update)       │
│ - Increment online count                │
│ - Show notification "Agent Connected"   │
│ - Refresh stats                         │
└──────────┬──────────────────────────────┘
           │
           │
4. SOFTWARE DEPLOYMENT
   │
   ▼
┌─────────────────────────────────────────┐
│ Frontend: User Deploys Software         │
│ - Navigate to Software Deployment       │
│ - Fill form:                            │
│   * Software name: "Nginx"              │
│   * Version: "1.21"                     │
│   * Package type: "apt"                 │
│   * Select devices/groups               │
│ - Click "Deploy Software"               │
│ - POST /deployments/deploy              │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ Backend: Create Deployment              │
│ - Validate payload                      │
│ - Expand group IDs to device IDs        │
│ - Create deployment record (DB)         │
│ - Create deployment_targets (DB)        │
│ - Return deployment_id                  │
│ - Start async background task           │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ Backend: Async Deployment Task          │
│ - For each target device:               │
│   * Check if agent online               │
│   * Get Socket.IO session ID            │
│   * Emit 'deploy_software' event        │
│     Payload: {                          │
│       deployment_id: int,               │
│       software_name: str,               │
│       version: str,                     │
│       package_type: str                 │
│     }                                   │
│   * Update status to 'pending'          │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ Agent: Receive Deploy Command           │
│ - Event: 'deploy_software'              │
│ - Extract payload                       │
│ - Determine OS and package manager      │
│ - Execute installation command:         │
│   * Linux: apt/yum install nginx        │
│   * Windows: choco install nginx        │
│ - Capture stdout/stderr                 │
│ - Determine success/failure             │
│ - Emit 'deployment_result' event        │
│   Payload: {                            │
│     deployment_id: int,                 │
│     device_id: int,                     │
│     status: 'success' | 'error',        │
│     message: str,                       │
│     output: str                         │
│   }                                     │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ Backend: Receive Deployment Result      │
│ - Event: 'deployment_result'            │
│ - Update deployment_targets table       │
│   * Set status                          │
│   * Store output/error                  │
│   * Set executed_at timestamp           │
│ - Schedule final status check           │
│   (after 30 seconds)                    │
└──────────┬──────────────────────────────┘
           │
           │ (Wait 30s)
           │
           ▼
┌─────────────────────────────────────────┐
│ Backend: Final Status Check             │
│ - Count results: pending, success, fail │
│ - Determine overall status:             │
│   * All done + no failures → completed  │
│   * All done + some failures → partial  │
│   * All failed → failed                 │
│   * Still pending → keep pending        │
│ - Update deployment record              │
│ - Set completed_at timestamp            │
│ - Emit notification event               │
│   Event: 'deployment_completed'         │
│   Payload: {                            │
│     deployment_id: int,                 │
│     software_name: str,                 │
│     status: str,                        │
│     success_count: int,                 │
│     failure_count: int,                 │
│     total_count: int                    │
│   }                                     │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ Frontend: Receive Notification          │
│ - Event: 'notification'                 │
│ - Add to notifications array            │
│ - Increment unread badge                │
│ - Show notification popup               │
│   "✓ Deployment Completed"              │
│   "Nginx deployment: 3/3 successful"    │
│ - Refresh deployment list               │
│ - Refresh stats                         │
└──────────┬──────────────────────────────┘
           │
           │
5. FILE DEPLOYMENT
   │
   ▼
┌─────────────────────────────────────────┐
│ Frontend: User Uploads File             │
│ - Click "Upload Files"                  │
│ - Select file from disk                 │
│ - POST /files/upload (FormData)         │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ Backend: Save File                      │
│ - Validate file (size, extension)       │
│ - Generate unique filename              │
│ - Calculate SHA-256 hash                │
│ - Save to uploads/ directory            │
│ - Create uploaded_files record (DB)     │
│ - Return file_id                        │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ Frontend: File Listed                   │
│ - Add to uploadedFiles state            │
│ - Display in file list                  │
│ - Enable "Deploy" button                │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ Frontend: User Deploys File             │
│ - Select file(s)                        │
│ - Select target devices/groups          │
│ - Enter destination path                │
│ - Click "Deploy Files"                  │
│ - POST /files/deploy                    │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ Backend: Create File Deployment         │
│ - Validate payload                      │
│ - Create file_deployments record        │
│ - Create file_deployment_results        │
│ - Return deployment_id                  │
│ - Start async task                      │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ Backend: Async File Transfer            │
│ - For each (file × device):             │
│   * Read file from disk                 │
│   * Encode to Base64                    │
│   * Get agent Socket.IO sid             │
│   * Emit 'file_transfer' event          │
│     Payload: {                          │
│       file_id: int,                     │
│       filename: str,                    │
│       content: base64_str,              │
│       destination: str,                 │
│       deployment_id: int                │
│     }                                   │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ Agent: Receive File Transfer            │
│ - Event: 'file_transfer'                │
│ - Decode Base64 content                 │
│ - Validate destination path             │
│ - Create directory if needed            │
│ - Write file to disk                    │
│ - Emit 'file_transfer_result' event     │
│   Payload: {                            │
│     deployment_id: int,                 │
│     file_id: int,                       │
│     device_id: int,                     │
│     status: 'success' | 'error',        │
│     message: str,                       │
│     file_path: str                      │
│   }                                     │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ Backend: Update File Deployment         │
│ - Event: 'file_transfer_result'         │
│ - Update file_deployment_results        │
│ - Schedule final status check           │
└──────────┬──────────────────────────────┘
           │
           │ (Wait 30s)
           │
           ▼
┌─────────────────────────────────────────┐
│ Backend: Final File Status              │
│ - Count results                         │
│ - Update file_deployments record        │
│ - Emit notification                     │
│   Event: 'file_deployment_completed'    │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ Frontend: Show Notification             │
│ - "✓ Files Deployed"                    │
│ - Update file deployment list           │
└──────────┬──────────────────────────────┘
           │
           │
6. AGENT DISCONNECTION
   │
   ▼
┌─────────────────────────────────────────┐
│ Agent: Disconnect                       │
│ - Network loss / Agent stop             │
│ - Socket.IO disconnect event            │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ Backend: Handle Disconnect              │
│ - Event: 'disconnect'                   │
│ - Extract device_id from session        │
│ - Update device status to offline (DB)  │
│ - Remove Socket.IO session mapping      │
│ - Emit 'agent_disconnected' to frontend │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ Frontend: Update UI                     │
│ - Update device status to offline       │
│ - Decrement online count                │
│ - Show notification "Agent Disconnected"│
│ - Refresh stats                         │
└─────────────────────────────────────────┘
```

---

## Technology Stack

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         TECHNOLOGY STACK                                 │
└─────────────────────────────────────────────────────────────────────────┘

FRONTEND
├── React 18.x
│   ├── Vite (Build tool)
│   ├── TailwindCSS (Styling)
│   └── lucide-react (Icons)
├── Socket.IO Client
│   └── Real-time communication
├── Axios
│   └── HTTP requests
└── React Router (Navigation)

BACKEND
├── FastAPI
│   ├── Python 3.9+
│   ├── Uvicorn (ASGI server)
│   └── Pydantic (Data validation)
├── Socket.IO Server
│   └── python-socketio
├── SQLAlchemy
│   └── ORM for database
└── PostgreSQL
    └── Database

AGENT
├── Python 3.9+
├── Socket.IO Client
│   └── python-socketio
├── psutil
│   └── System information
└── Platform-specific tools
    ├── Linux: apt, yum, dnf
    └── Windows: PowerShell, chocolatey

INFRASTRUCTURE
├── Nginx (Reverse proxy)
├── PostgreSQL (Database)
└── File System (uploads/)
```

---

## Database Schema Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         DATABASE SCHEMA                                  │
└─────────────────────────────────────────────────────────────────────────┘

users                    devices                  device_groups
─────                    ─────────                ──────────────
id ◄────┐                id ◄────┐                id ◄────┐
username│                name    │                name    │
password│                ip      │                created │
created │                os      │                        │
        │                connected               device_group_members
        │                created  │              ────────────────────
        │                         │              device_id ──┘
        │                         │              group_id ────┘
        │                         │
        │                         │
deployments             deployment_targets        uploaded_files
───────────             ──────────────────        ──────────────
id ◄────┐               id                        id ◄────┐
software│               deployment_id ──┘         filename│
version │               device_id ───────┘        file_path
status  │               status                    file_size
created_by ──┘          output                    file_hash
created │               executed_at               uploaded_by ──┘
        │                                         uploaded_at
        │
        │               file_deployments          file_deployment_results
        │               ─────────────────         ───────────────────────
        │               id ◄────┐                 id
        │               status  │                 deployment_id ──┘
        │               dest_path                 file_id ──────────┘
        │               created_by ──┘            device_id ─────────┘
        │               created │                 status
        │                       │                 result_message
        │                       │                 transferred_at
        └───────────────────────┘
```

---

## Socket.IO Event Map

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      SOCKET.IO EVENTS                                    │
└─────────────────────────────────────────────────────────────────────────┘

AGENT → BACKEND
────────────────
agent_connected         : Agent startup, send device info
deployment_result       : Software deployment result
file_transfer_result    : File transfer result
disconnect              : Agent shutdown/network loss

BACKEND → AGENT
────────────────
deploy_software         : Command to install software
file_transfer           : Send file for deployment
disconnect_agent        : Force disconnect (admin action)

BACKEND → FRONTEND
───────────────────
agent_connected         : New agent online
agent_disconnected      : Agent went offline
notification            : General notification
deployment_completed    : Software deployment done
file_deployment_completed : File deployment done

FRONTEND → BACKEND
───────────────────
(No direct events, uses HTTP REST API)
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          DATA FLOW                                       │
└─────────────────────────────────────────────────────────────────────────┘

┌────────────┐
│  Frontend  │
└─────┬──────┘
      │
      │ 1. HTTP GET /deployments
      ▼
┌────────────────┐
│   Backend      │
│   API Routes   │
└─────┬──────────┘
      │
      │ 2. Query Database
      ▼
┌────────────────┐
│  PostgreSQL    │
└─────┬──────────┘
      │
      │ 3. Return Data
      ▼
┌────────────────┐
│   Backend      │
│   Response     │
└─────┬──────────┘
      │
      │ 4. JSON Response
      ▼
┌────────────┐
│  Frontend  │
│  Update UI │
└────────────┘

┌────────────┐
│  Frontend  │
└─────┬──────┘
      │
      │ 1. POST /deployments/deploy
      ▼
┌────────────────┐
│   Backend      │
│   Create Task  │
└─────┬──────────┘
      │
      │ 2. Save to DB
      ▼
┌────────────────┐
│  PostgreSQL    │
└────────────────┘
      │
      │ 3. Async Task
      ▼
┌────────────────┐
│   Backend      │
│   Emit Event   │
└─────┬──────────┘
      │
      │ 4. Socket.IO: deploy_software
      ▼
┌────────────┐
│   Agent    │
│   Execute  │
└─────┬──────┘
      │
      │ 5. Socket.IO: deployment_result
      ▼
┌────────────────┐
│   Backend      │
│   Update DB    │
└─────┬──────────┘
      │
      │ 6. Socket.IO: notification
      ▼
┌────────────┐
│  Frontend  │
│  Show Alert│
└────────────┘
```

---

## Security Features

```
1. Authentication
   ├── JWT tokens for API
   ├── Token expiration
   └── Secure password hashing (bcrypt)

2. Authorization
   ├── User-based resource isolation
   ├── Device ownership verification
   └── Group membership checks

3. Input Validation
   ├── Pydantic models
   ├── File size limits
   ├── Extension whitelisting
   └── Path sanitization

4. Data Integrity
   ├── SHA-256 file hashing
   ├── Database constraints
   └── Transaction rollback

5. Network Security
   ├── HTTPS/WSS encryption
   ├── Socket.IO authentication
   └── CORS configuration

6. Agent Security
   ├── Machine ID verification
   ├── Command whitelisting
   └── Sandboxed execution
```

---

## Deployment States

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      DEPLOYMENT STATE MACHINE                            │
└─────────────────────────────────────────────────────────────────────────┘

    pending
       │
       ├──► Agent offline ──► failed
       │
       ├──► Agent online
       │         │
       │         ▼
       │    executing
       │         │
       │         ├──► All success ──► completed
       │         │
       │         ├──► Some fail ──► partial
       │         │
       │         └──► All fail ──► failed
       │
       └──► Timeout (30s) ──► Check again
                                   │
                                   ▼
                             (Final status)
```

---

## Performance Characteristics

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     PERFORMANCE METRICS                                  │
└─────────────────────────────────────────────────────────────────────────┘

Real-time Communication
├── Agent connection: < 1 second
├── Event propagation: < 100ms
└── Notification delivery: < 200ms

Software Deployment
├── Small package (< 10 MB): 10-30 seconds
├── Medium package (10-100 MB): 1-5 minutes
└── Large package (> 100 MB): 5-15 minutes

File Transfer
├── Small file (< 1 MB): < 1 second
├── Medium file (1-10 MB): 1-5 seconds
└── Large file (10-100 MB): 10-60 seconds

Dashboard
├── Initial load: < 2 seconds
├── Section switch: < 100ms
└── Data refresh: < 500ms
```

---

## Error Handling Strategy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       ERROR HANDLING                                     │
└─────────────────────────────────────────────────────────────────────────┘

Layer           Error Type              Handler
────────────────────────────────────────────────────────────────────
Frontend        Network Failure         Retry with exponential backoff
                Invalid Input           Client-side validation
                API Error               Display error message

Backend         Database Error          Rollback transaction, log error
                File System Error       Return 500, log error
                Agent Offline           Mark deployment as failed
                Validation Error        Return 400 with details

Agent           Command Failure         Capture stderr, send error result
                Permission Denied       Send error result with details
                Disk Full               Send error result
                Network Loss            Auto-reconnect with backoff

Database        Constraint Violation    Return error to backend
                Connection Lost         Retry connection pool
                Deadlock                Retry transaction
```

---

## Scalability Considerations

```
1. Horizontal Scaling
   ├── Multiple backend instances
   ├── Load balancer (Nginx)
   └── Shared PostgreSQL database

2. Agent Scaling
   ├── Supports thousands of agents
   ├── Connection pooling
   └── Event queue management

3. Database Scaling
   ├── Connection pooling
   ├── Indexing on foreign keys
   └── Query optimization

4. File Storage
   ├── Distributed file system (future)
   ├── S3-compatible storage (future)
   └── CDN for large files (future)
```

---

## Monitoring & Logging

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    MONITORING & LOGGING                                  │
└─────────────────────────────────────────────────────────────────────────┘

Backend Logs
├── agent.log (Agent events)
├── deployment.log (Deployment events)
├── error.log (Errors)
└── access.log (API access)

Agent Logs
├── agent.log (Local log file)
└── Console output (Development)

Metrics
├── Active agents
├── Deployment success rate
├── Average deployment time
└── File transfer speed

Alerts (Future)
├── Agent disconnection
├── Deployment failures
├── Disk space low
└── System errors
```

---

## Future Enhancements

```
1. Advanced Deployments
   ├── Blue-Green deployments
   ├── Canary deployments
   ├── Rollback mechanism
   └── Scheduled deployments

2. Monitoring
   ├── Agent health metrics
   ├── Resource usage graphs
   ├── Deployment analytics
   └── Custom dashboards

3. Integrations
   ├── Git integration
   ├── CI/CD pipelines
   ├── Slack/Teams notifications
   └── Webhook support

4. Security
   ├── Role-based access control (RBAC)
   ├── Audit logs
   ├── Two-factor authentication
   └── IP whitelisting

5. Features
   ├── Script execution
   ├── Configuration management
   ├── Service management
   └── Log aggregation
```

---

## System Requirements

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      SYSTEM REQUIREMENTS                                 │
└─────────────────────────────────────────────────────────────────────────┘

BACKEND SERVER
├── OS: Linux (Ubuntu 20.04+ recommended)
├── CPU: 2+ cores
├── RAM: 4 GB minimum, 8 GB recommended
├── Disk: 50 GB+ (for uploads)
└── Python: 3.9+

FRONTEND
├── Modern web browser
├── JavaScript enabled
└── WebSocket support

AGENT
├── OS: Windows 10+, Ubuntu 18.04+, CentOS 7+
├── CPU: 1+ core
├── RAM: 512 MB minimum
├── Disk: 100 MB for agent
└── Python: 3.9+

DATABASE
├── PostgreSQL 12+
├── RAM: 2 GB minimum
└── Disk: 10 GB minimum
```

---

**Last Updated**: January 9, 2025
**Version**: 1.0
