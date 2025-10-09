# Notification System Flow - DeployX

## Overview
This flowchart explains the real-time notification system that keeps users informed about deployment events.

---

## Notification System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                  NOTIFICATION SYSTEM ARCHITECTURE                        │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────┐          ┌──────────────┐          ┌──────────────┐
│              │          │              │          │              │
│   BACKEND    │◄────────►│  SOCKET.IO   │◄────────►│  FRONTEND    │
│              │          │              │          │              │
└──────┬───────┘          └──────┬───────┘          └──────┬───────┘
       │                         │                         │
       │ Event Trigger           │ Broadcast               │ Receive
       │                         │                         │
       ▼                         ▼                         ▼
┌──────────────┐          ┌──────────────┐          ┌──────────────┐
│ Deployment   │          │ Event Queue  │          │ Notification │
│ Status       │          │              │          │ State        │
│ Changed      │          │              │          │              │
└──────────────┘          └──────────────┘          └──────────────┘
```

---

## Complete Notification Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    NOTIFICATION EVENT FLOW                               │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   START      │
│   Event      │
│   Occurs     │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────┐
│  BACKEND: Event Trigger              │
│                                      │
│  Possible Events:                    │
│  1. Agent connects/disconnects       │
│  2. Deployment started               │
│  3. Deployment completed             │
│  4. Deployment failed                │
│  5. File deployment completed        │
│  6. Error occurred                   │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Determine Event Type                │
└──────┬───────────────────────────────┘
       │
       ├────────┬────────┬────────┬────────┬────────┐
       │        │        │        │        │        │
       ▼        ▼        ▼        ▼        ▼        ▼
   Agent    Deploy   Deploy  Deploy   File    Error
   Event    Start    Done    Fail    Deploy   Event
       │        │        │        │        │        │
       │        └────────┴────────┴────────┴────────┘
       │                      │
       ▼                      ▼
┌──────────────┐    ┌────────────────────┐
│ Agent Event  │    │ Deployment Event   │
└──────┬───────┘    └────────┬───────────┘
       │                     │
       ▼                     ▼
┌──────────────────────────────────────┐
│  Collect Event Data                  │
│                                      │
│  Agent Event:                        │
│  - device_id                         │
│  - device_name                       │
│  - event_type (connect/disconnect)   │
│  - timestamp                         │
│                                      │
│  Deployment Event:                   │
│  - deployment_id                     │
│  - deployment_type (software/file)   │
│  - software_name / file_name         │
│  - status                            │
│  - target_count                      │
│  - success_count                     │
│  - failure_count                     │
│  - timestamp                         │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Format Notification Payload         │
│                                      │
│  {                                   │
│    id: uuid(),                       │
│    type: 'success' | 'error' |       │
│          'warning' | 'info',         │
│    title: string,                    │
│    message: string,                  │
│    timestamp: ISO string,            │
│    read: false,                      │
│    data: { ...event_details }        │
│  }                                   │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Emit Socket.IO Event                │
│                                      │
│  Event Name: 'notification'          │
│  Target: All connected clients       │
│         (or specific user)           │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  FRONTEND: Socket Listener           │
│                                      │
│  useEffect(() => {                   │
│    socket.on('notification', (data) => {│
│      handleNotification(data);       │
│    });                               │
│  }, []);                             │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Handle Notification                 │
│                                      │
│  1. Add to state array               │
│     setNotifications(prev =>         │
│       [data, ...prev]                │
│     )                                │
│                                      │
│  2. Increment badge count            │
│     setUnreadCount(c => c + 1)       │
│                                      │
│  3. Play sound (optional)            │
│                                      │
│  4. Show toast (optional)            │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Update UI                           │
│                                      │
│  - Badge shows unread count          │
│  - Notification bell icon highlights │
│  - Latest notification at top        │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Auto-Dismiss Timer                  │
│                                      │
│  setTimeout(() => {                  │
│    removeNotification(id);           │
│  }, 5000);                           │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  User Interaction Options            │
└──────┬───────────────────────────────┘
       │
       ├────────┬────────┬────────┐
       │        │        │        │
       ▼        ▼        ▼        ▼
   Click    Mark All  Clear    Ignore
   Bell     as Read   All
       │        │        │        │
       ▼        │        │        │
┌──────────┐   │        │        │
│ Toggle   │   │        │        │
│ Panel    │   │        │        │
└────┬─────┘   │        │        │
     │         │        │        │
     └─────────┴────────┴────────┘
               │
               ▼
       ┌──────────────┐
       │ Update State │
       └──────┬───────┘
              │
              ▼
          ┌────────┐
          │  END   │
          └────────┘
```

---

## Notification Types

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      NOTIFICATION TYPE MATRIX                            │
└─────────────────────────────────────────────────────────────────────────┘

Event                      Type        Title                   Icon
──────────────────────────────────────────────────────────────────────────
Agent Connected           SUCCESS     "Agent Connected"        ✓ Check
Agent Disconnected        WARNING     "Agent Disconnected"     ⚠ Alert
Deployment Started        INFO        "Deployment Started"     ℹ Info
Deployment Completed      SUCCESS     "Deployment Completed"   ✓ Check
Deployment Failed         ERROR       "Deployment Failed"      ✕ X
Partial Success           WARNING     "Deployment Partial"     ⚠ Alert
File Upload Success       SUCCESS     "File Uploaded"          ✓ Check
File Upload Failed        ERROR       "Upload Failed"          ✕ X
File Deployment Done      SUCCESS     "Files Deployed"         ✓ Check
File Deployment Failed    ERROR       "File Deploy Failed"     ✕ X
```

---

## Notification State Management

```
┌─────────────────────────────────────────────────────────────────────────┐
│                  FRONTEND STATE MANAGEMENT                               │
└─────────────────────────────────────────────────────────────────────────┘

// State Variables
const [notifications, setNotifications] = useState([])
const [unreadCount, setUnreadCount] = useState(0)
const [showNotifications, setShowNotifications] = useState(false)

// Notification Object Structure
{
  id: string,              // UUID
  type: string,            // 'success' | 'error' | 'warning' | 'info'
  title: string,           // Short title
  message: string,         // Detailed message
  timestamp: string,       // ISO 8601
  read: boolean,           // Read status
  data: {                  // Event-specific data
    deployment_id?: number,
    device_id?: number,
    software_name?: string,
    file_name?: string,
    ...
  }
}

// Operations
┌──────────────────────────────────────┐
│  Add Notification                    │
│  setNotifications(prev => [          │
│    newNotif, ...prev                 │
│  ])                                  │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│  Mark as Read                        │
│  setNotifications(prev =>            │
│    prev.map(n =>                     │
│      n.id === id ? {...n, read: true}│
│                  : n                 │
│    )                                 │
│  )                                   │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│  Mark All as Read                    │
│  setNotifications(prev =>            │
│    prev.map(n => ({...n, read: true}))│
│  )                                   │
│  setUnreadCount(0)                   │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│  Clear All                           │
│  setNotifications([])                │
│  setUnreadCount(0)                   │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│  Remove Single                       │
│  setNotifications(prev =>            │
│    prev.filter(n => n.id !== id)     │
│  )                                   │
└──────────────────────────────────────┘
```

---

## Backend Emission Helpers

```python
# File: backend/app/Deployments/routes.py

def emit_deployment_notification(
    deployment_id: int,
    software_name: str,
    status: str,
    success_count: int = 0,
    failure_count: int = 0,
    total_count: int = 0
):
    """Emit deployment notification via Socket.IO"""
    
    # Determine notification type
    if status == "completed":
        if failure_count == 0:
            notif_type = "success"
            title = "Deployment Completed"
        else:
            notif_type = "warning"
            title = "Deployment Partially Completed"
    elif status == "failed":
        notif_type = "error"
        title = "Deployment Failed"
    else:
        notif_type = "info"
        title = "Deployment Status Update"
    
    # Format message
    message = f"{software_name} deployment: "
    message += f"{success_count}/{total_count} successful"
    if failure_count > 0:
        message += f", {failure_count} failed"
    
    # Create notification payload
    notification = {
        "id": str(uuid.uuid4()),
        "type": notif_type,
        "title": title,
        "message": message,
        "timestamp": datetime.utcnow().isoformat(),
        "read": False,
        "data": {
            "deployment_id": deployment_id,
            "software_name": software_name,
            "status": status,
            "success_count": success_count,
            "failure_count": failure_count,
            "total_count": total_count
        }
    }
    
    # Emit to all connected clients
    sio.emit("notification", notification)
```

```python
# File: backend/app/files/routes.py

def emit_file_deployment_notification(
    deployment_id: int,
    file_name: str,
    status: str,
    success_count: int = 0,
    failure_count: int = 0,
    total_count: int = 0
):
    """Emit file deployment notification"""
    
    # Similar structure as software deployment
    # ...
    
    sio.emit("notification", notification)
```

---

## Frontend Socket Listeners

```javascript
// File: frontend/src/pages/Dashboard.jsx

useEffect(() => {
  // Connect to Socket.IO server
  const socket = io(BACKEND_URL);
  
  // Listen for notifications
  socket.on('notification', (data) => {
    console.log('Notification received:', data);
    
    // Add to notifications array
    setNotifications(prev => [data, ...prev]);
    
    // Increment unread count
    setUnreadCount(count => count + 1);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      removeNotification(data.id);
    }, 5000);
  });
  
  // Listen for agent connection events
  socket.on('agent_connected', (data) => {
    const notification = {
      id: uuidv4(),
      type: 'success',
      title: 'Agent Connected',
      message: `${data.device_name} is now online`,
      timestamp: new Date().toISOString(),
      read: false,
      data: data
    };
    addNotification(notification);
  });
  
  // Listen for agent disconnection events
  socket.on('agent_disconnected', (data) => {
    const notification = {
      id: uuidv4(),
      type: 'warning',
      title: 'Agent Disconnected',
      message: `${data.device_name} went offline`,
      timestamp: new Date().toISOString(),
      read: false,
      data: data
    };
    addNotification(notification);
  });
  
  // Listen for deployment updates
  socket.on('deployment_completed', (data) => {
    // Handled by emit_deployment_notification
  });
  
  socket.on('file_deployment_completed', (data) => {
    // Handled by emit_file_deployment_notification
  });
  
  // Cleanup
  return () => {
    socket.disconnect();
  };
}, []);
```

---

## Notification Panel UI

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      NOTIFICATION PANEL UI                               │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Header                                  │
│  ┌────────────────────────────────────┐ │
│  │ Notifications (Badge: 5)           │ │
│  │                      [Mark All Read]│ │
│  │                      [Clear All]    │ │
│  └────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│  Notification List (Scrollable)          │
│  ┌────────────────────────────────────┐ │
│  │ ✓ Deployment Completed             │ │
│  │   Nginx deployment: 3/3 successful │ │
│  │   2 minutes ago               [×]  │ │
│  │────────────────────────────────────│ │
│  │ ⚠ Agent Disconnected               │ │
│  │   Server-001 went offline          │ │
│  │   5 minutes ago               [×]  │ │
│  │────────────────────────────────────│ │
│  │ ℹ Deployment Started                │ │
│  │   MySQL deployment started         │ │
│  │   10 minutes ago              [×]  │ │
│  │────────────────────────────────────│ │
│  │ ✕ Deployment Failed                │ │
│  │   Apache deployment: 0/2 failed    │ │
│  │   15 minutes ago              [×]  │ │
│  └────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│  Empty State (if no notifications)       │
│  ┌────────────────────────────────────┐ │
│  │         🔔                         │ │
│  │   No notifications yet              │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## Color Coding

```
Notification Type    Background       Icon Color    Border
──────────────────────────────────────────────────────────
SUCCESS             green-50         green-600     green-200
ERROR               red-50           red-600       red-200
WARNING             yellow-50        yellow-600    yellow-200
INFO                blue-50          blue-600      blue-200
```

---

## Auto-Dismiss Logic

```javascript
// File: frontend/src/pages/Dashboard.jsx

const addNotification = (notification) => {
  // Add to state
  setNotifications(prev => [notification, ...prev]);
  setUnreadCount(c => c + 1);
  
  // Auto-dismiss after 5 seconds
  const dismissTimer = setTimeout(() => {
    removeNotification(notification.id);
  }, 5000);
  
  // Store timer ID for manual cancellation
  notificationTimers.current[notification.id] = dismissTimer;
};

const removeNotification = (id) => {
  // Clear timer
  if (notificationTimers.current[id]) {
    clearTimeout(notificationTimers.current[id]);
    delete notificationTimers.current[id];
  }
  
  // Remove from state
  setNotifications(prev => prev.filter(n => n.id !== id));
};
```

---

## Click Outside Handler

```javascript
// Close panel when clicking outside
useEffect(() => {
  const handleClickOutside = (event) => {
    const panel = document.querySelector('.notification-container');
    if (panel && !panel.contains(event.target)) {
      setShowNotifications(false);
    }
  };
  
  if (showNotifications) {
    document.addEventListener('mousedown', handleClickOutside);
  }
  
  return () => {
    document.removeEventListener('mousedown', handleClickOutside);
  };
}, [showNotifications]);
```

---

## Badge Counter

```jsx
{/* Notification Bell with Badge */}
<button
  onClick={() => setShowNotifications(!showNotifications)}
  className="relative w-10 h-10 flex items-center justify-center"
>
  <Bell className="w-5 h-5" />
  
  {/* Badge */}
  {unreadCount > 0 && (
    <span className="absolute -top-1 -right-1 bg-red-500 text-white 
                     text-xs rounded-full w-5 h-5 flex items-center 
                     justify-center">
      {unreadCount > 9 ? '9+' : unreadCount}
    </span>
  )}
</button>
```

---

## Performance Considerations

1. **Limit Array Size**: Keep only last 50 notifications
2. **Virtual Scrolling**: Use for long lists (future)
3. **Debounce**: Prevent rapid-fire notifications
4. **Memory Cleanup**: Clear timers on unmount
5. **LocalStorage**: Persist notifications (optional)

---

## Future Enhancements

1. **Sound Alerts**: Customizable notification sounds
2. **Desktop Notifications**: Browser Notification API
3. **Filtering**: Filter by type, date, or keyword
4. **Persistence**: Store in database for history
5. **User Preferences**: Disable certain notification types
6. **Email Notifications**: Critical events via email
7. **Webhooks**: External system integration

---

**Last Updated**: January 9, 2025
**Version**: 1.0
