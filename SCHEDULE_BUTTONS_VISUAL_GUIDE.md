# Schedule Buttons - Visual Guide

## 📍 Where to Find the Schedule Buttons

### 1. Command Deployment Page

**Single Command Mode:**
```
┌─────────────────────────────────────────────────────────────┐
│ Command Input                                                │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Enter command...                                        │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─────────────┐  ┌─────────────┐                            │
│ │ 📅 Schedule │  │ ▶ Execute   │                            │
│ └─────────────┘  └─────────────┘                            │
│      BLUE            PURPLE                                  │
└─────────────────────────────────────────────────────────────┘
```

**Batch Command Mode:**
```
┌─────────────────────────────────────────────────────────────┐
│ Batch Commands                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Command 1...                                   [×]      │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Command 2...                                   [×]      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─────────────┐  ┌──────────────────┐  ┌────────────────┐  │
│ │ + Add Cmd   │  │ 📅 Schedule Batch│  │ ▶ Execute Batch│  │
│ └─────────────┘  └──────────────────┘  └────────────────┘  │
│     GRAY               BLUE                  PURPLE          │
└─────────────────────────────────────────────────────────────┘
```

### 2. Software Deployment Page

**Installation Section:**
```
┌─────────────────────────────────────────────────────────────┐
│ Software Selection                                           │
│ ☑ Chrome  ☑ Firefox  ☑ VS Code                              │
│                                                              │
│ Target: 5 total devices (2 groups + 3 individual)           │
│                                                              │
│ ┌─────────────────────┐  ┌─────────────────────┐            │
│ │ 📅 Schedule         │  │ Install Now         │            │
│ │    Installation     │  │                     │            │
│ └─────────────────────┘  └─────────────────────┘            │
│        BLUE                    ELECTRIC BLUE                 │
└─────────────────────────────────────────────────────────────┘
```

### 3. File Deployment Page (Step 3: Deploy)

**Deployment Configuration:**
```
┌─────────────────────────────────────────────────────────────┐
│ Deployment Configuration                                     │
│                                                              │
│ Target Path:                                                 │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ /path/to/destination                                    │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ Summary:                                                     │
│ • Files to deploy: 3                                         │
│ • Target devices: 5                                          │
│ • Target path: /path/to/destination                          │
│                                                              │
│ ┌───────────────────────┐  ┌───────────────────────┐        │
│ │ 📅 Schedule           │  │ ➜ Deploy Now          │        │
│ │    Deployment         │  │                       │        │
│ └───────────────────────┘  └───────────────────────┘        │
│      SECONDARY                    PRIMARY                    │
└─────────────────────────────────────────────────────────────┘
```

## 🎨 Button Appearance

### Schedule Button (Blue)
```
┌─────────────────┐
│ 📅 Schedule     │  ← Blue background (#3B82F6)
└─────────────────┘     White text
                        Calendar icon
```

### Execute/Deploy Button (Purple/Primary)
```
┌─────────────────┐
│ ▶ Execute       │  ← Purple background (#A855F7)
└─────────────────┘     White text
                        Play icon
```

## 🔘 Button States

### Enabled (Ready to use)
```
┌─────────────────┐
│ 📅 Schedule     │  ← Full color, clickable
└─────────────────┘     Hover: Darker shade
```

### Disabled (Requirements not met)
```
┌─────────────────┐
│ 📅 Schedule     │  ← Gray, not clickable
└─────────────────┘     Opacity: 50%
                        Cursor: not-allowed
```

## 📋 Button Enable Requirements

### Command Deployment
**Requirements:**
- ✅ Command text entered
- ✅ Agent or group selected
- ✅ Backend connected

**Example Error Messages:**
- "Please enter a command"
- "Please select an agent or group"
- "Backend connection required"

### Software Deployment
**Requirements:**
- ✅ Software selected OR custom software entered
- ✅ At least one device or group selected

**Example Error Messages:**
- "Please select software to install or enter custom software"
- "Please select at least one group or device"

### File Deployment
**Requirements:**
- ✅ Files uploaded
- ✅ At least one device or group selected
- ✅ Target path specified

**Example Error Messages:**
- "Please upload files first"
- "Please select at least one device or group"

## 🖱️ User Flow

### Step-by-Step: Scheduling a Command

```
1. User opens Command Deployment page
   ↓
2. User enters command: "apt update"
   ↓
3. User selects target (agent or group)
   ↓
4. User clicks "📅 Schedule" button
   ↓
5. Scheduling Modal opens
   ┌─────────────────────────────────┐
   │ Schedule Task                   │
   │ ───────────────────────────────│
   │ Task Name: Daily Update         │
   │ Recurrence: Daily               │
   │ Time: 02:00 AM                  │
   │                                 │
   │ [Schedule Task] [Execute Now]   │
   └─────────────────────────────────┘
   ↓
6. User configures schedule
   ↓
7. User clicks "Schedule Task"
   ↓
8. Success! "Command scheduled successfully!"
   ↓
9. View task in "Scheduled Tasks" tab
```

## 🎯 Quick Access

### Finding Your Scheduled Tasks

After scheduling, view your tasks here:
```
Dashboard / Navigation
  ↓
Scheduled Tasks Tab (📅)
  ↓
All scheduled tasks appear with:
  • Task name
  • Next run time
  • Status
  • Control buttons (Pause/Resume/Execute/Delete)
```

## 💡 Tips

1. **Blue = Schedule** (plan for later)
2. **Purple/Primary = Execute/Deploy** (do it now)
3. **Buttons side-by-side** for easy choice
4. **Hover to see darker shade** when enabled
5. **Gray and faded** when disabled

## 🔍 Troubleshooting

**"I don't see the Schedule button"**
- ✅ Make sure frontend is running: `npm run dev`
- ✅ Refresh your browser (Ctrl+F5)
- ✅ Check browser console for errors (F12)

**"Schedule button is grayed out"**
- ✅ Check all requirements are met (see above)
- ✅ Enter/select required fields first
- ✅ Verify backend is connected

**"Modal doesn't open"**
- ✅ Check browser console for errors
- ✅ Verify SchedulingModal.jsx exists in components folder
- ✅ Check that scheduling.js exists in services folder

---

**All schedule buttons are now live and ready to use! 🎉**
