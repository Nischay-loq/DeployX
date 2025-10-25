# Frontend Scheduling Integration Guide

## Overview

This guide shows how to integrate the scheduling functionality into the existing DeployX frontend components. The scheduling system allows users to schedule command execution, software deployment, and file deployment.

## Files Created

1. **`SchedulingModal.jsx`** - Reusable modal component for scheduling
2. **`ScheduledTasksManager.jsx`** - Component to view and manage all scheduled tasks
3. **`services/scheduling.js`** - Service for scheduling API calls

## Integration Steps

### 1. Add Scheduling to Command Deployment (DeploymentManager.jsx)

Add these imports at the top:
```jsx
import SchedulingModal from './SchedulingModal';
import schedulingService from '../services/scheduling';
```

Add state for scheduling modal:
```jsx
const [showSchedulingModal, setShowSchedulingModal] = useState(false);
const [schedulingData, setSchedulingData] = useState(null);
```

Add a "Schedule" button next to the execute button:
```jsx
<div className="flex gap-3">
  <button
    onClick={() => openSchedulingModal()}
    disabled={!canExecute}
    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
  >
    <Calendar className="w-5 h-5" />
    Schedule Command
  </button>
  
  <button
    onClick={executeCommand}
    disabled={!canExecute || isLoading}
    className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
  >
    <Play className="w-5 h-5" />
    {isLoading ? 'Executing...' : 'Execute Now'}
  </button>
</div>
```

Add functions to open modal and handle scheduling:
```jsx
const openSchedulingModal = () => {
  // Prepare the task data based on batch mode
  const taskData = {
    device_ids: [], // Will be populated based on selection
    group_ids: selectedGroups,
    command_payload: batchMode 
      ? {
          commands: batchCommands.filter(cmd => cmd.trim()),
          shell: currentShell || 'cmd',
          stop_on_failure: true
        }
      : {
          command: newCommand,
          shell: currentShell || 'cmd',
          strategy: selectedStrategy
        }
  };

  // Get target info for display
  const targetInfo = `${selectedGroups.length} groups selected`;

  setSchedulingData({ taskData, targetInfo });
  setShowSchedulingModal(true);
};

const handleSchedule = async (schedulePayload) => {
  try {
    await schedulingService.createScheduledTask(schedulePayload);
    alert('Task scheduled successfully!');
    setShowSchedulingModal(false);
  } catch (error) {
    throw error; // Modal will handle the error display
  }
};

const handleExecuteNow = async () => {
  setShowSchedulingModal(false);
  await executeCommand(); // Your existing execute function
};
```

Add the modal at the end of your component JSX:
```jsx
{showSchedulingModal && (
  <SchedulingModal
    isOpen={showSchedulingModal}
    onClose={() => setShowSchedulingModal(false)}
    onSchedule={handleSchedule}
    onExecuteNow={handleExecuteNow}
    taskType="command"
    taskData={schedulingData?.taskData}
    targetInfo={schedulingData?.targetInfo}
  />
)}
```

### 2. Add Scheduling to Software Deployment (DeploymentsManager.jsx)

Add the same imports:
```jsx
import SchedulingModal from './SchedulingModal';
import schedulingService from '../services/scheduling';
```

Add state:
```jsx
const [showSchedulingModal, setShowSchedulingModal] = useState(false);
const [schedulingData, setSchedulingData] = useState(null);
```

Update the deployment form to include a Schedule button:
```jsx
<div className="flex gap-3">
  <button
    onClick={() => openSchedulingModal()}
    disabled={!canDeploy()}
    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
  >
    <Calendar className="w-5 h-5" />
    Schedule Deployment
  </button>
  
  <button
    onClick={handleStartDeployment}
    disabled={!canDeploy() || deploying}
    className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
  >
    <Rocket className="w-5 h-5" />
    {deploying ? 'Deploying...' : 'Deploy Now'}
  </button>
</div>
```

Add helper functions:
```jsx
const openSchedulingModal = () => {
  const taskData = {
    device_ids: selectedDevices,
    group_ids: selectedGroups,
    software_payload: {
      software_ids: selectedSoftware,
      custom_software: useCustomSoftware ? customSoftware : null,
      deployment_name: `Software Deployment - ${new Date().toLocaleString()}`
    }
  };

  const targetDevices = getTargetDevices();
  const targetInfo = `${targetDevices.length} devices (${selectedGroups.length} groups, ${selectedDevices.length} individual devices)`;

  setSchedulingData({ taskData, targetInfo });
  setShowSchedulingModal(true);
};

const handleSchedule = async (schedulePayload) => {
  try {
    await schedulingService.createScheduledTask(schedulePayload);
    alert('Deployment scheduled successfully!');
    setShowSchedulingModal(false);
  } catch (error) {
    throw error;
  }
};

const handleExecuteNow = async () => {
  setShowSchedulingModal(false);
  await handleStartDeployment(); // Your existing deployment function
};
```

Add modal at the end:
```jsx
{showSchedulingModal && (
  <SchedulingModal
    isOpen={showSchedulingModal}
    onClose={() => setShowSchedulingModal(false)}
    onSchedule={handleSchedule}
    onExecuteNow={handleExecuteNow}
    taskType="software_deployment"
    taskData={schedulingData?.taskData}
    targetInfo={schedulingData?.targetInfo}
  />
)}
```

### 3. Add Scheduling to File Deployment (FileSystemManager.jsx)

Add imports:
```jsx
import SchedulingModal from './SchedulingModal';
import schedulingService from '../services/scheduling';
import { Calendar } from 'lucide-react'; // If not already imported
```

Add state:
```jsx
const [showSchedulingModal, setShowSchedulingModal] = useState(false);
const [schedulingData, setSchedulingData] = useState(null);
```

Update the deployment step to include Schedule button:
```jsx
<div className="flex gap-3">
  <button
    onClick={() => openSchedulingModal()}
    disabled={!canDeploy()}
    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
  >
    <Calendar className="w-5 h-5" />
    Schedule Deployment
  </button>
  
  <button
    onClick={handleDeploy}
    disabled={!canDeploy() || isDeploying}
    className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
  >
    <Upload className="w-5 h-5" />
    {isDeploying ? 'Deploying...' : 'Deploy Now'}
  </button>
</div>
```

Add functions:
```jsx
const canDeploy = () => {
  return uploadedFiles.length > 0 && 
         (selectedGroups.length > 0 || selectedDevices.length > 0) &&
         customPath.trim();
};

const openSchedulingModal = () => {
  const taskData = {
    device_ids: selectedDevices,
    group_ids: selectedGroups,
    file_payload: {
      file_ids: uploadedFiles.filter(f => f.uploaded).map(f => f.id),
      target_path: customPath,
      create_path_if_not_exists: true,
      deployment_name: `File Deployment - ${new Date().toLocaleString()}`
    }
  };

  const targetDevices = getTargetDevices();
  const targetInfo = `${uploadedFiles.length} files to ${targetDevices.length} devices`;

  setSchedulingData({ taskData, targetInfo });
  setShowSchedulingModal(true);
};

const handleSchedule = async (schedulePayload) => {
  try {
    await schedulingService.createScheduledTask(schedulePayload);
    alert('File deployment scheduled successfully!');
    setShowSchedulingModal(false);
  } catch (error) {
    throw error;
  }
};

const handleExecuteNow = async () => {
  setShowSchedulingModal(false);
  await handleDeploy(); // Your existing deploy function
};

const getTargetDevices = () => {
  const groupDevices = groups
    .filter(g => selectedGroups.includes(g.id))
    .flatMap(g => g.device_ids || []);
  
  const allDevices = [...new Set([...selectedDevices, ...groupDevices])];
  return devices.filter(d => allDevices.includes(d.id));
};
```

Add modal:
```jsx
{showSchedulingModal && (
  <SchedulingModal
    isOpen={showSchedulingModal}
    onClose={() => setShowSchedulingModal(false)}
    onSchedule={handleSchedule}
    onExecuteNow={handleExecuteNow}
    taskType="file_deployment"
    taskData={schedulingData?.taskData}
    targetInfo={schedulingData?.targetInfo}
  />
)}
```

### 4. Add Scheduled Tasks Tab to Dashboard

In your `Dashboard.jsx` or main navigation, add a new tab/section for viewing scheduled tasks:

```jsx
import ScheduledTasksManager from '../components/ScheduledTasksManager';

// In your tab/section navigation
const tabs = [
  { id: 'commands', label: 'Commands', icon: Terminal },
  { id: 'software', label: 'Software', icon: Package },
  { id: 'files', label: 'Files', icon: Files },
  { id: 'scheduled', label: 'Scheduled Tasks', icon: Calendar },  // NEW
  { id: 'devices', label: 'Devices', icon: Monitor }
];

// In your content rendering
{activeTab === 'scheduled' && <ScheduledTasksManager />}
```

## Testing the Integration

1. **Test Command Scheduling:**
   - Go to Command Deployment page
   - Enter a command
   - Select target devices/groups
   - Click "Schedule Command"
   - Configure schedule (one-time, daily, weekly, etc.)
   - Click "Schedule Task"
   - Verify task appears in Scheduled Tasks

2. **Test Software Scheduling:**
   - Go to Software Deployment page
   - Select software to install
   - Select target devices/groups
   - Click "Schedule Deployment"
   - Configure schedule
   - Click "Schedule Task"

3. **Test File Scheduling:**
   - Go to File Deployment page
   - Upload files
   - Select target devices/groups
   - Enter target path
   - Click "Schedule Deployment"
   - Configure schedule
   - Click "Schedule Task"

4. **Test Task Management:**
   - Go to Scheduled Tasks tab
   - View all scheduled tasks
   - Test pause/resume functionality
   - Test execute now
   - Test delete
   - Filter by status and type

## UI/UX Features

### Scheduling Modal Features:
- ✅ Task name input
- ✅ Recurrence type selection (once, daily, weekly, monthly, custom)
- ✅ Date/time pickers
- ✅ Weekly day selector
- ✅ Monthly day selector
- ✅ Custom cron expression input
- ✅ Schedule preview
- ✅ Target info display
- ✅ Execute now option
- ✅ Form validation
- ✅ Error handling

### Scheduled Tasks Manager Features:
- ✅ Statistics dashboard
- ✅ Search and filter
- ✅ Task status badges
- ✅ Pause/resume controls
- ✅ Execute now button
- ✅ Delete task
- ✅ Expandable task details
- ✅ Real-time updates
- ✅ Execution history (coming from API)

## Styling Notes

The components use:
- Tailwind CSS classes
- Dark theme (gray-900, gray-800 backgrounds)
- Color-coded status badges
- Lucide React icons
- Consistent spacing and typography
- Responsive design (mobile-friendly)

## Common Issues & Solutions

**Issue:** Modal doesn't open
- Check that SchedulingModal is imported correctly
- Verify state is set properly before opening
- Check console for errors

**Issue:** API calls fail
- Verify backend is running on port 8000
- Check authentication token is valid
- Verify scheduling routes are registered in backend

**Issue:** Scheduled time validation fails
- Ensure date/time is in the future for one-time tasks
- Check timezone handling (all times are UTC)
- Verify date format is correct

**Issue:** Task doesn't execute
- Check backend logs for errors
- Verify devices are online
- Check task status in database
- Ensure APScheduler is running

## Next Steps

1. **Add the components to your routing**
2. **Test all three integration points**
3. **Customize styling to match your theme**
4. **Add notifications for task completion**
5. **Consider adding a calendar view**
6. **Add execution history modal**

## Example Screenshots Locations

Users will see:
1. **Schedule buttons** in command, software, and file deployment pages
2. **Scheduling modal** when clicking schedule buttons
3. **Scheduled tasks list** in a dedicated tab/page
4. **Task controls** (pause, resume, execute, delete) for each task
5. **Statistics dashboard** showing task counts

The integration is designed to be minimal and non-intrusive while providing powerful scheduling capabilities!
