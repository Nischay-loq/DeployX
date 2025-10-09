# File Deployment Flow - DeployX

## Overview
This flowchart explains how files are transferred from the backend to remote devices through Socket.IO.

---

## File Deployment Flowchart

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     FILE DEPLOYMENT FLOW                                 │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   START      │
│   User       │
│   Upload     │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────┐
│  FRONTEND: File Upload               │
│                                      │
│  User Actions:                       │
│  1. Click "Upload Files"             │
│  2. Select file(s) from disk         │
│  3. (Multiple files supported)       │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Frontend Validation                 │
│  - Check file size (< 100 MB)        │
│  - Check file extension              │
│  - Validate file type                │
│  - Check allowed extensions          │
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
│  POST /files/upload                  │
│  (Multipart Form Data)               │
│                                      │
│  FormData:                           │
│  - file: File object                 │
│  - filename: string                  │
│  - Content-Type: multipart/form-data │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│         BACKEND: File Upload Handler             │
│                                                   │
│  1. Authenticate User (JWT)                      │
│  2. Validate File                                │
│     - Check size (MAX_FILE_SIZE = 100 MB)        │
│     - Check extension (ALLOWED_EXTENSIONS)       │
│  3. Generate Unique Filename                     │
│     - Format: timestamp_originalname             │
│  4. Calculate File Hash (SHA-256)                │
│  5. Check for Duplicates                         │
└──────┬───────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Save File to Disk                   │
│  - Directory: uploads/               │
│  - Path: uploads/{timestamp}_{name}  │
│  - Permissions: 644                  │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Create Database Record              │
│                                      │
│  uploaded_files table:               │
│  - id (auto)                         │
│  - filename                          │
│  - original_filename                 │
│  - file_path                         │
│  - file_size                         │
│  - file_hash (SHA-256)               │
│  - uploaded_by (user_id)             │
│  - uploaded_at                       │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Return Success Response             │
│  {                                   │
│    success: true,                    │
│    file_id: number,                  │
│    filename: string,                 │
│    size: number                      │
│  }                                   │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  FRONTEND: Display Uploaded File     │
│  - Show in file list                 │
│  - Display file icon                 │
│  - Show file size                    │
│  - Enable deployment button          │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  User Clicks "Deploy Files"          │
│                                      │
│  Selects:                            │
│  ✓ File(s) to deploy                 │
│  ✓ Target devices                    │
│  ✓ Target groups                     │
│  ✓ Destination path                  │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  POST /files/deploy                  │
│                                      │
│  Payload: {                          │
│    file_ids: number[],               │
│    device_ids: number[],             │
│    group_ids: number[],              │
│    destination_path: string          │
│  }                                   │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│         BACKEND: Deploy Files Handler            │
│                                                   │
│  1. Authenticate User                            │
│  2. Validate Payload                             │
│  3. Get File Objects from Database               │
│  4. Expand Group IDs to Device IDs               │
│  5. Verify Device Ownership                      │
│  6. Verify File Ownership                        │
└──────┬─────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Create File Deployment Record       │
│                                      │
│  file_deployments table:             │
│  - id (auto)                         │
│  - status: 'pending'                 │
│  - destination_path                  │
│  - created_by (user_id)              │
│  - created_at                        │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Create Deployment Results           │
│                                      │
│  For Each (File × Device):           │
│  file_deployment_results table:      │
│  - deployment_id                     │
│  - file_id                           │
│  - device_id                         │
│  - status: 'pending'                 │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Start Async Deployment Task         │
│  process_file_deployment_async()     │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Return Response                     │
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
       │   │  ASYNC DEPLOYMENT       │  │
       │   └─────────────────────────┘  │
       │                │                │
       │                ▼                │
       │   ┌─────────────────────────┐  │
       │   │  For Each Device:       │  │
       │   │  ┌──────────────────┐   │  │
       │   │  │ Check Agent      │   │  │
       │   │  │ Connection       │   │  │
       │   │  └────────┬─────────┘   │  │
       │   │           │              │  │
       │   │           ├────────┬─────┤  │
       │   │           │        │     │  │
       │   │           ▼        ▼     ▼  │
       │   │        Online  Offline Error│
       │   │           │        │     │  │
       │   │           │        └──┬──┘  │
       │   │           │           │     │
       │   │           │           ▼     │
       │   │           │   ┌──────────┐  │
       │   │           │   │ Mark as  │  │
       │   │           │   │ Failed   │  │
       │   │           │   └──────────┘  │
       │   │           │                 │
       │   │           ▼                 │
       │   │  ┌──────────────────────┐  │
       │   │  │ For Each File:       │  │
       │   │  │  Read from disk      │  │
       │   │  │  Convert to Base64   │  │
       │   │  └────────┬─────────────┘  │
       │   │           │                │
       │   │           ▼                │
       │   │  ┌──────────────────────┐ │
       │   │  │ Find Agent SID       │ │
       │   │  │ (Socket.IO Session)  │ │
       │   │  └────────┬─────────────┘ │
       │   │           │                │
       │   │           ▼                │
       │   │  ┌──────────────────────┐ │
       │   │  │ Emit Socket Event:   │ │
       │   │  │ 'file_transfer'      │ │
       │   │  │                      │ │
       │   │  │ Payload: {           │ │
       │   │  │   file_id: int,      │ │
       │   │  │   filename: str,     │ │
       │   │  │   content: base64,   │ │
       │   │  │   destination: str,  │ │
       │   │  │   deployment_id: int │ │
       │   │  │ }                    │ │
       │   │  └────────┬─────────────┘ │
       │   │           │                │
       │   │           ▼                │
       │   │  ┌──────────────────────┐ │
       │   │  │ Update Result:       │ │
       │   │  │ status = 'pending'   │ │
       │   │  └──────────────────────┘ │
       │   └──────────────────────────┘ │
       │                                │
       ▼                                ▼
┌──────────────────────────────────────────┐
│      AGENT: Receive 'file_transfer'      │
│                                          │
│  Handler: handle_file_transfer()         │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Agent: Process File Transfer        │
│                                      │
│  1. Decode Base64 Content            │
│  2. Validate Destination Path        │
│  3. Create Directory if Needed       │
│  4. Check Disk Space                 │
│  5. Check Write Permissions          │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Write File to Destination           │
│  - Path: {destination_path}/{filename}│
│  - Mode: Binary write                │
│  - Permissions: Based on OS          │
└──────┬───────────────────────────────┘
       │
       ├─────────────┬─────────────┐
       │             │             │
       ▼             ▼             ▼
   SUCCESS       FAILURE       ERROR
       │             │             │
       │             └─────┬───────┘
       │                   │
       ▼                   ▼
┌──────────────────────────────────────┐
│  Emit 'file_transfer_result'         │
│                                      │
│  Payload: {                          │
│    deployment_id: int,               │
│    file_id: int,                     │
│    device_id: int,                   │
│    status: 'success' | 'error',      │
│    message: string,                  │
│    error_details?: string,           │
│    file_path: string                 │
│  }                                   │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  BACKEND: Receive Result             │
│  Event: 'file_transfer_result'       │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Update Database                     │
│                                      │
│  file_deployment_results:            │
│  - status: result.status             │
│  - result_message: result.message    │
│  - error_details: result.error       │
│  - transferred_at: NOW()             │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Schedule Final Status Check         │
│  (After 30 seconds)                  │
│                                      │
│  update_deployment_final_status()    │
└──────┬───────────────────────────────┘
       │
       │ (Wait 30s)
       │
       ▼
┌──────────────────────────────────────┐
│  Check All Results                   │
│  - Count pending                     │
│  - Count success                     │
│  - Count error                       │
└──────┬───────────────────────────────┘
       │
       ├──────────┬──────────┬──────────┐
       │          │          │          │
       ▼          ▼          ▼          ▼
   All Done  Still Pending All Failed  Partial
       │          │          │          │
       ▼          │          ▼          ▼
┌──────────┐     │    ┌──────────┐ ┌──────────┐
│ status = │     │    │ status = │ │ status = │
│'completed'│    │    │ 'failed' │ │ 'partial'│
└────┬─────┘     │    └────┬─────┘ └────┬─────┘
     │           │         │            │
     └───────────┼─────────┴────────────┘
                 │
                 ▼
         ┌──────────────┐
         │ Retry Check  │
         │ (One more    │
         │  time)       │
         └──────┬───────┘
                │
                ▼
┌──────────────────────────────────────┐
│  Update Deployment Status            │
│  - Set final status                  │
│  - Set completed_at timestamp        │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Emit Notification Event             │
│  'file_deployment_completed'         │
│                                      │
│  Payload: {                          │
│    deployment_id: int,               │
│    file_name: string,                │
│    status: string,                   │
│    success_count: int,               │
│    failure_count: int,               │
│    total_count: int                  │
│  }                                   │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  FRONTEND: Receive Notification      │
│  - Show notification popup           │
│  - Update file deployment list       │
│  - Refresh dashboard stats           │
└──────┬───────────────────────────────┘
       │
       ▼
   ┌────────┐
   │  END   │
   └────────┘
```

---

## File Upload Process Detail

```
┌─────────────────────────────────────────────────────────────┐
│              FILE UPLOAD DETAILED FLOW                       │
└─────────────────────────────────────────────────────────────┘

User Selects File
      │
      ▼
┌─────────────────────┐
│ Frontend Validation │
│ - Size check        │
│ - Extension check   │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Create FormData     │
│ - Append file       │
│ - Set headers       │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Upload with Progress│
│ - XMLHttpRequest    │
│ - Show progress bar │
│ - Display %         │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Backend Receives    │
│ - Save to temp      │
│ - Calculate hash    │
│ - Move to uploads/  │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Database Record     │
│ - Store metadata    │
│ - Return file_id    │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Frontend Update     │
│ - Add to file list  │
│ - Show success msg  │
└─────────────────────┘
```

---

## Base64 Encoding Process

```
┌─────────────────────────────────────────────────────────────┐
│            FILE ENCODING FOR TRANSFER                        │
└─────────────────────────────────────────────────────────────┘

Backend reads file from disk
      │
      ▼
┌──────────────────────────┐
│ Read Binary Content      │
│ file_path = "uploads/..." │
│ mode = "rb"              │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ Encode to Base64         │
│ import base64            │
│ content = base64.b64encode│
│           (file_data)    │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ Convert to String        │
│ content_str =            │
│   content.decode('utf-8')│
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ Send via Socket.IO       │
│ (JSON serializable)      │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ Agent Receives String    │
│ base64_content = payload │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ Decode from Base64       │
│ file_data =              │
│   base64.b64decode(      │
│     content.encode())    │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ Write Binary to Disk     │
│ mode = "wb"              │
│ write(file_data)         │
└──────────────────────────┘
```

---

## Error Handling

```
Error Type                    Handler
──────────────────────────────────────────────
File Too Large               → Return 400 error
Invalid Extension            → Return 400 error
Upload Failed                → Retry 3x
Disk Space Full (Backend)    → Return 507 error
Disk Space Full (Agent)      → Emit error result
Permission Denied (Agent)    → Emit error result
Agent Offline                → Mark as failed
Encoding/Decoding Error      → Log & fail
Path Traversal Attack        → Sanitize & block
Network Timeout              → Retry transfer
Corrupted File               → Hash mismatch, fail
```

---

## Database Schema

```
┌────────────────────────────────────────┐
│         uploaded_files                 │
├────────────────────────────────────────┤
│ id                INTEGER PRIMARY KEY  │
│ filename          TEXT                 │
│ original_filename TEXT                 │
│ file_path         TEXT                 │
│ file_size         INTEGER              │
│ file_hash         TEXT (SHA-256)       │
│ uploaded_by       INTEGER (FK users)   │
│ uploaded_at       TIMESTAMP            │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│       file_deployments                 │
├────────────────────────────────────────┤
│ id                INTEGER PRIMARY KEY  │
│ status            TEXT                 │
│ destination_path  TEXT                 │
│ created_by        INTEGER (FK users)   │
│ created_at        TIMESTAMP            │
│ started_at        TIMESTAMP            │
│ completed_at      TIMESTAMP            │
└────────────────────────────────────────┘
           │
           │ 1:N
           ▼
┌────────────────────────────────────────┐
│    file_deployment_results             │
├────────────────────────────────────────┤
│ id                INTEGER PRIMARY KEY  │
│ deployment_id     INTEGER (FK)         │
│ file_id           INTEGER (FK)         │
│ device_id         INTEGER (FK)         │
│ status            TEXT                 │
│ result_message    TEXT                 │
│ error_details     TEXT                 │
│ transferred_at    TIMESTAMP            │
└────────────────────────────────────────┘
```

---

## API Endpoints

### Upload File
```
POST /files/upload
Headers: 
  Authorization: Bearer {token}
  Content-Type: multipart/form-data
Body: FormData with file
Response: {
  success: boolean,
  file_id: number,
  filename: string,
  size: number
}
```

### Deploy Files
```
POST /files/deploy
Headers: Authorization: Bearer {token}
Body: {
  file_ids: number[],
  device_ids: number[],
  group_ids: number[],
  destination_path: string
}
Response: {
  success: boolean,
  deployment_id: number
}
```

### Get Deployment Progress
```
GET /files/deployments/{id}/progress
Response: {
  deployment_id: number,
  status: string,
  results: FileDeploymentResult[]
}
```

---

## Socket.IO Events

### Backend → Agent
```javascript
Event: 'file_transfer'
Payload: {
  file_id: number,
  filename: string,
  content: string (base64),
  destination: string,
  deployment_id: number
}
```

### Agent → Backend
```javascript
Event: 'file_transfer_result'
Payload: {
  deployment_id: number,
  file_id: number,
  device_id: number,
  status: 'success' | 'error',
  message: string,
  error_details?: string,
  file_path: string
}
```

### Backend → Frontend
```javascript
Event: 'file_deployment_completed'
Payload: {
  deployment_id: number,
  file_name: string,
  status: string,
  success_count: number,
  failure_count: number,
  total_count: number
}
```

---

## Security Features

1. **File Validation**: Size and extension checks
2. **Path Sanitization**: Prevent directory traversal
3. **Hash Verification**: SHA-256 for integrity
4. **User Isolation**: Users can only deploy their files
5. **Permission Checks**: Verify write access before transfer
6. **Duplicate Detection**: Hash-based deduplication

---

## Performance Optimizations

1. **Async Processing**: Non-blocking file transfers
2. **Base64 Chunking**: Large files split into chunks (future)
3. **Compression**: Optional gzip compression (future)
4. **Parallel Transfers**: Multiple devices simultaneously
5. **Resume Support**: Partial transfer recovery (future)

---

**Last Updated**: January 9, 2025
**Version**: 1.0
