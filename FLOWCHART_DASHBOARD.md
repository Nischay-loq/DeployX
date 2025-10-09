# Dashboard Features Flow - DeployX

## Overview
This flowchart explains the main dashboard UI components, data flow, and real-time updates.

---

## Dashboard Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     DASHBOARD ARCHITECTURE                               │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                           DASHBOARD.JSX                                  │
│                                                                          │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐           │
│  │   Header       │  │   Stats Cards  │  │   Sidebar      │           │
│  │   Component    │  │   Component    │  │   Component    │           │
│  └────────────────┘  └────────────────┘  └────────────────┘           │
│                                                                          │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐           │
│  │   Software     │  │   File         │  │   Notifications│           │
│  │   Deployment   │  │   Deployment   │  │   Panel        │           │
│  └────────────────┘  └────────────────┘  └────────────────┘           │
│                                                                          │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐           │
│  │   Device       │  │   Group        │  │   Upload       │           │
│  │   Management   │  │   Management   │  │   Modal        │           │
│  └────────────────┘  └────────────────┘  └────────────────┘           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Dashboard Load Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    DASHBOARD INITIALIZATION                              │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│  Component   │
│  Mount       │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Check Authentication                │
│  - Verify JWT token                  │
│  - Redirect to login if invalid      │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Initialize State Variables          │
│  - activeSection: 'overview'         │
│  - devices: []                       │
│  - groups: []                        │
│  - deployments: []                   │
│  - fileDeployments: []               │
│  - uploadedFiles: []                 │
│  - stats: {}                         │
│  - notifications: []                 │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Setup Socket.IO Connection          │
│  - Connect to backend                │
│  - Register event listeners          │
│  - Store socket instance             │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Fetch Initial Data (Parallel)       │
│  ┌────────────────────────────────┐  │
│  │ 1. Fetch Devices               │  │
│  │ 2. Fetch Groups                │  │
│  │ 3. Fetch Deployments           │  │
│  │ 4. Fetch File Deployments      │  │
│  │ 5. Fetch Uploaded Files        │  │
│  │ 6. Fetch Dashboard Stats       │  │
│  └────────────────────────────────┘  │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Process API Responses               │
│  - Update state with data            │
│  - Handle errors                     │
│  - Show loading indicators           │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Render Dashboard                    │
│  - Show header                       │
│  - Display stats cards               │
│  - Render active section             │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Start Auto-Refresh Timer            │
│  - Interval: 30 seconds              │
│  - Refresh deployments & stats       │
└──────┬───────────────────────────────┘
       │
       ▼
   ┌────────┐
   │ READY  │
   └────────┘
```

---

## Stats Cards Component

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         STATS CARDS LAYOUT                               │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌──────────┐│
│  │ Total Agents  │  │   Active      │  │  Pending      │  │  Failed  ││
│  │               │  │  Deployments  │  │  Deployments  │  │  Deploys ││
│  │     42        │  │      15       │  │       3       │  │    2     ││
│  │  ● 38 Online  │  │   +2 today    │  │   -1 today    │  │  0 today ││
│  └───────────────┘  └───────────────┘  └───────────────┘  └──────────┘│
└──────────────────────────────────────────────────────────────────────────┘

Data Flow:
┌──────────────┐
│ GET /stats   │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Backend Calculates:                  │
│ - COUNT(devices)                     │
│ - COUNT(devices WHERE connected=true)│
│ - COUNT(deployments WHERE status=...)│
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Frontend Updates State:              │
│ setStats(data)                       │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Render Stats Cards                   │
└──────────────────────────────────────┘
```

---

## Software Deployment Section

```
┌─────────────────────────────────────────────────────────────────────────┐
│                   SOFTWARE DEPLOYMENT UI FLOW                            │
└─────────────────────────────────────────────────────────────────────────┘

User clicks "Software Deployment"
      │
      ▼
┌──────────────────────────────────────┐
│  Change activeSection state          │
│  setActiveSection('software')        │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Render Software Deployment Form     │
│  ┌────────────────────────────────┐  │
│  │ Software Name:  [________]     │  │
│  │ Version:        [________]     │  │
│  │ Package Type:   [v Dropdown]   │  │
│  │ Target Devices: [☐ Device 1]  │  │
│  │                 [☑ Device 2]   │  │
│  │ Target Groups:  [☑ Group A]    │  │
│  │                 [☐ Group B]    │  │
│  │                                │  │
│  │  [Deploy Software]             │  │
│  └────────────────────────────────┘  │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  User Fills Form                     │
│  - Enter software details            │
│  - Select devices/groups             │
│  - Click Deploy button               │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Validate Form                       │
│  - Check required fields             │
│  - Validate at least one target      │
│  - Show errors if invalid            │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  POST /deployments/deploy            │
│  {                                   │
│    software_name: "Nginx",           │
│    version: "1.21",                  │
│    package_type: "apt",              │
│    device_ids: [1, 2],               │
│    group_ids: [3]                    │
│  }                                   │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Show Loading State                  │
│  - Disable form                      │
│  - Show spinner                      │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Receive Response                    │
│  {                                   │
│    success: true,                    │
│    deployment_id: 42                 │
│  }                                   │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Update UI                           │
│  - Show success message              │
│  - Clear form                        │
│  - Refresh deployment list           │
│  - Switch to deployments tab         │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Listen for Updates                  │
│  - Socket.IO events                  │
│  - Auto-refresh data                 │
└──────────────────────────────────────┘
```

---

## File Upload & Deployment Section

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      FILE UPLOAD UI FLOW                                 │
└─────────────────────────────────────────────────────────────────────────┘

User clicks "Upload Files"
      │
      ▼
┌──────────────────────────────────────┐
│  Open File Upload Modal              │
│  setShowUploadModal(true)            │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│  Render Upload Modal                         │
│  ┌────────────────────────────────────────┐  │
│  │  Upload Files                      [×] │  │
│  │  ────────────────────────────────────  │  │
│  │                                        │  │
│  │  ┌──────────────────────────────────┐ │  │
│  │  │  Drag & Drop Files Here          │ │  │
│  │  │         or                       │ │  │
│  │  │    [Browse Files]                │ │  │
│  │  └──────────────────────────────────┘ │  │
│  │                                        │  │
│  │  Allowed: All files (< 100 MB)        │  │
│  │                                        │  │
│  │  [Cancel]             [Upload]         │  │
│  └────────────────────────────────────────┘  │
└──────┬───────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  User Selects File(s)                │
│  - Via browse button                 │
│  - Via drag & drop                   │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Display File Preview                │
│  - File name                         │
│  - File size                         │
│  - File icon                         │
│  - Remove button                     │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  User Clicks Upload                  │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Upload Files                        │
│  - Create FormData                   │
│  - POST to /files/upload             │
│  - Show progress bar                 │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Handle Response                     │
│  - Add to uploadedFiles state        │
│  - Close modal                       │
│  - Show success notification         │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Display in Files List               │
│  ┌────────────────────────────────┐  │
│  │ ✓ nginx.conf      1.2 KB       │  │
│  │   Uploaded 2 min ago           │  │
│  │   [Deploy] [Delete]            │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

---

## Device Management Section

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     DEVICE MANAGEMENT UI                                 │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│  Devices                                                    [+ Add Device]│
│  ────────────────────────────────────────────────────────────────────────│
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ Device Name    IP Address      OS        Status    Actions       │   │
│  ├──────────────────────────────────────────────────────────────────┤   │
│  │ Server-001     192.168.1.10    Ubuntu    ● Online   [Edit][Del] │   │
│  │ Server-002     192.168.1.11    CentOS    ○ Offline  [Edit][Del] │   │
│  │ Workstation-A  192.168.1.20    Windows   ● Online   [Edit][Del] │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘

Data Flow:
GET /devices → Fetch all devices → setDevices(data) → Render table

Real-time Updates:
Socket 'agent_connected' → Update device status → Re-render
Socket 'agent_disconnected' → Update device status → Re-render
```

---

## Group Management Section

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      GROUP MANAGEMENT UI                                 │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│  Groups                                                     [+ Add Group] │
│  ────────────────────────────────────────────────────────────────────────│
│                                                                          │
│  ┌────────────────────────────────────────────────────────┐             │
│  │ Production Servers                         (5 devices) │             │
│  │ ├─ Server-001                                          │             │
│  │ ├─ Server-002                                          │             │
│  │ ├─ Server-003                                          │             │
│  │ └─ ...                                                 │             │
│  │                                    [Edit] [Delete]     │             │
│  └────────────────────────────────────────────────────────┘             │
│                                                                          │
│  ┌────────────────────────────────────────────────────────┐             │
│  │ Development Servers                        (3 devices) │             │
│  │ ├─ Dev-Server-01                                       │             │
│  │ ├─ Dev-Server-02                                       │             │
│  │ └─ Dev-Server-03                                       │             │
│  │                                    [Edit] [Delete]     │             │
│  └────────────────────────────────────────────────────────┘             │
└──────────────────────────────────────────────────────────────────────────┘

Data Flow:
GET /groups → Fetch groups with devices → setGroups(data) → Render cards
```

---

## Real-time Data Refresh

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    AUTO-REFRESH MECHANISM                                │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│  useEffect   │
│  Hook        │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Set Interval Timer                  │
│  setInterval(() => {                 │
│    refreshData();                    │
│  }, 30000);  // 30 seconds           │
└──────┬───────────────────────────────┘
       │
       │ Every 30s
       ▼
┌──────────────────────────────────────┐
│  refreshData() Function              │
│  ┌────────────────────────────────┐  │
│  │ 1. Fetch Deployments           │  │
│  │ 2. Fetch File Deployments      │  │
│  │ 3. Fetch Stats                 │  │
│  │ 4. Update State                │  │
│  └────────────────────────────────┘  │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Component Re-renders                │
│  - Updated data displayed            │
│  - No page reload needed             │
└──────────────────────────────────────┘

Socket.IO Events (Real-time):
┌──────────────────────────────────────┐
│  agent_connected                     │
│  agent_disconnected                  │
│  deployment_completed                │
│  file_deployment_completed           │
│  → Trigger immediate refresh         │
└──────────────────────────────────────┘
```

---

## Active Section Switching

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    SECTION NAVIGATION FLOW                               │
└─────────────────────────────────────────────────────────────────────────┘

User clicks sidebar item
      │
      ▼
┌──────────────────────────────────────┐
│  Update activeSection State          │
│  setActiveSection('newSection')      │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Conditional Rendering               │
│  {activeSection === 'overview' && (  │
│    <OverviewSection />               │
│  )}                                  │
│  {activeSection === 'software' && (  │
│    <SoftwareDeployment />            │
│  )}                                  │
│  {activeSection === 'files' && (     │
│    <FileDeployment />                │
│  )}                                  │
│  // ... etc                          │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Highlight Active Item in Sidebar    │
│  - Add active class                  │
│  - Change background color           │
└──────────────────────────────────────┘
```

---

## Agent Status Card (Real-time)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                   AGENT STATUS CARD (HEADER)                             │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────┐
│  Agent Status                        │
│  ────────────────────────────────    │
│  ● 38 Online    42 Total             │
│    ↑ animate-pulse                   │
└──────────────────────────────────────┘

Data Source:
GET /stats → { total_agents: 42, online_agents: 38 }

Real-time Update:
Socket 'agent_connected' → online_agents++
Socket 'agent_disconnected' → online_agents--

Styling:
- Green pulsing dot for online
- Updated every time socket event fires
```

---

## Performance Optimizations

```
1. Lazy Loading
   - Load sections on demand
   - Use React.lazy() for code splitting

2. Memoization
   - useMemo for expensive calculations
   - React.memo for component optimization

3. Debouncing
   - Search inputs
   - Filter operations

4. Virtual Scrolling
   - Large device/deployment lists
   - Use react-window library

5. Pagination
   - Limit API results
   - Load more on scroll

6. Caching
   - Store API responses
   - Invalidate on updates
```

---

## Error Handling

```
┌──────────────────────────────────────┐
│  API Call Error                      │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Catch Error                         │
│  .catch(error => {                   │
│    console.error(error);             │
│    setError(error.message);          │
│    showToast('error', message);      │
│  })                                  │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Display Error UI                    │
│  - Error banner                      │
│  - Retry button                      │
│  - Error details (dev mode)          │
└──────────────────────────────────────┘
```

---

## State Management Summary

```javascript
// Main State Variables
const [activeSection, setActiveSection] = useState('overview')
const [devices, setDevices] = useState([])
const [groups, setGroups] = useState([])
const [deployments, setDeployments] = useState([])
const [fileDeployments, setFileDeployments] = useState([])
const [uploadedFiles, setUploadedFiles] = useState([])
const [stats, setStats] = useState({})
const [notifications, setNotifications] = useState([])
const [unreadCount, setUnreadCount] = useState(0)
const [showNotifications, setShowNotifications] = useState(false)
const [showUploadModal, setShowUploadModal] = useState(false)
const [loading, setLoading] = useState(false)
const [error, setError] = useState(null)
```

---

**Last Updated**: January 9, 2025
**Version**: 1.0
