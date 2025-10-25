# Scheduling Integration - Code Examples

This document provides concrete before/after examples for integrating scheduling into your deployment pages.

## Example 1: Command Deployment Integration

### Before (DeploymentManager.jsx)

```jsx
import React, { useState, useEffect } from 'react';
import { Play, Terminal, Upload } from 'lucide-react';

const DeploymentManager = () => {
  const [newCommand, setNewCommand] = useState('');
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const executeCommand = async () => {
    setIsLoading(true);
    try {
      // Your existing execute logic
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6">
      {/* Command input */}
      <input
        value={newCommand}
        onChange={(e) => setNewCommand(e.target.value)}
        placeholder="Enter command..."
      />

      {/* Execute button */}
      <button
        onClick={executeCommand}
        disabled={!newCommand || isLoading}
        className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg"
      >
        <Play className="w-5 h-5" />
        Execute Now
      </button>
    </div>
  );
};
```

### After (With Scheduling)

```jsx
import React, { useState, useEffect } from 'react';
import { Play, Terminal, Upload, Calendar } from 'lucide-react';
import SchedulingModal from './SchedulingModal';  // ✨ NEW
import schedulingService from '../services/scheduling';  // ✨ NEW

const DeploymentManager = () => {
  const [newCommand, setNewCommand] = useState('');
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // ✨ NEW - Scheduling state
  const [showSchedulingModal, setShowSchedulingModal] = useState(false);
  const [schedulingData, setSchedulingData] = useState(null);

  const executeCommand = async () => {
    setIsLoading(true);
    try {
      // Your existing execute logic
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ✨ NEW - Open scheduling modal
  const openSchedulingModal = () => {
    const taskData = {
      device_ids: [],
      group_ids: selectedGroups,
      command_payload: {
        command: newCommand,
        shell: 'cmd',
        strategy: 'parallel'
      }
    };

    const targetInfo = `${selectedGroups.length} groups selected`;
    setSchedulingData({ taskData, targetInfo });
    setShowSchedulingModal(true);
  };

  // ✨ NEW - Handle scheduling
  const handleSchedule = async (schedulePayload) => {
    try {
      await schedulingService.createScheduledTask(schedulePayload);
      alert('Command scheduled successfully!');
      setShowSchedulingModal(false);
    } catch (error) {
      throw error;
    }
  };

  // ✨ NEW - Handle execute now from modal
  const handleExecuteNow = async () => {
    setShowSchedulingModal(false);
    await executeCommand();
  };

  return (
    <div className="p-6">
      {/* Command input */}
      <input
        value={newCommand}
        onChange={(e) => setNewCommand(e.target.value)}
        placeholder="Enter command..."
      />

      {/* ✨ MODIFIED - Button group with Schedule button */}
      <div className="flex gap-3">
        <button
          onClick={openSchedulingModal}
          disabled={!newCommand}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          <Calendar className="w-5 h-5" />
          Schedule Command
        </button>

        <button
          onClick={executeCommand}
          disabled={!newCommand || isLoading}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg"
        >
          <Play className="w-5 h-5" />
          Execute Now
        </button>
      </div>

      {/* ✨ NEW - Scheduling modal */}
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
    </div>
  );
};
```

### Summary of Changes:
1. Added imports for `Calendar`, `SchedulingModal`, and `schedulingService`
2. Added state for `showSchedulingModal` and `schedulingData`
3. Added `openSchedulingModal()` function
4. Added `handleSchedule()` function
5. Added `handleExecuteNow()` function
6. Changed single button to button group with Schedule + Execute
7. Added `<SchedulingModal>` component at the end

---

## Example 2: Software Deployment Integration

### Before (DeploymentsManager.jsx)

```jsx
const DeploymentsManager = () => {
  const [selectedSoftware, setSelectedSoftware] = useState([]);
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [deploying, setDeploying] = useState(false);

  const handleStartDeployment = async () => {
    setDeploying(true);
    try {
      // Your deployment logic
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div>
      {/* Software selection UI */}
      
      <button
        onClick={handleStartDeployment}
        disabled={!canDeploy() || deploying}
        className="px-6 py-3 bg-green-600 text-white rounded-lg"
      >
        Deploy Now
      </button>
    </div>
  );
};
```

### After (With Scheduling)

```jsx
import SchedulingModal from './SchedulingModal';  // ✨ ADD
import schedulingService from '../services/scheduling';  // ✨ ADD
import { Calendar } from 'lucide-react';  // ✨ ADD

const DeploymentsManager = () => {
  const [selectedSoftware, setSelectedSoftware] = useState([]);
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [deploying, setDeploying] = useState(false);
  
  // ✨ ADD
  const [showSchedulingModal, setShowSchedulingModal] = useState(false);
  const [schedulingData, setSchedulingData] = useState(null);

  const handleStartDeployment = async () => {
    setDeploying(true);
    try {
      // Your deployment logic
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setDeploying(false);
    }
  };

  // ✨ ADD
  const openSchedulingModal = () => {
    const taskData = {
      device_ids: selectedDevices,
      group_ids: selectedGroups,
      software_payload: {
        software_ids: selectedSoftware,
        deployment_name: `Software Deployment - ${new Date().toLocaleString()}`
      }
    };

    const targetInfo = `${selectedDevices.length} devices`;
    setSchedulingData({ taskData, targetInfo });
    setShowSchedulingModal(true);
  };

  // ✨ ADD
  const handleSchedule = async (schedulePayload) => {
    try {
      await schedulingService.createScheduledTask(schedulePayload);
      alert('Deployment scheduled successfully!');
      setShowSchedulingModal(false);
    } catch (error) {
      throw error;
    }
  };

  // ✨ ADD
  const handleExecuteNow = async () => {
    setShowSchedulingModal(false);
    await handleStartDeployment();
  };

  return (
    <div>
      {/* Software selection UI */}
      
      {/* ✨ MODIFY - Add button group */}
      <div className="flex gap-3">
        <button
          onClick={openSchedulingModal}
          disabled={!canDeploy()}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg"
        >
          <Calendar className="w-5 h-5" />
          Schedule Deployment
        </button>

        <button
          onClick={handleStartDeployment}
          disabled={!canDeploy() || deploying}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg"
        >
          Deploy Now
        </button>
      </div>

      {/* ✨ ADD */}
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
    </div>
  );
};
```

---

## Example 3: File Deployment Integration

### Minimal Integration (If short on time)

```jsx
// 1. Add imports at top
import SchedulingModal from './SchedulingModal';
import schedulingService from '../services/scheduling';
import { Calendar } from 'lucide-react';

// 2. Add state after other useState declarations
const [showSchedulingModal, setShowSchedulingModal] = useState(false);
const [schedulingData, setSchedulingData] = useState(null);

// 3. Add these three functions anywhere in component
const openSchedulingModal = () => {
  setSchedulingData({
    taskData: {
      device_ids: selectedDevices,
      group_ids: selectedGroups,
      file_payload: {
        file_ids: uploadedFiles.map(f => f.id),
        target_path: customPath
      }
    },
    targetInfo: `${uploadedFiles.length} files`
  });
  setShowSchedulingModal(true);
};

const handleSchedule = async (schedulePayload) => {
  await schedulingService.createScheduledTask(schedulePayload);
  alert('File deployment scheduled!');
  setShowSchedulingModal(false);
};

const handleExecuteNow = async () => {
  setShowSchedulingModal(false);
  await handleDeploy();
};

// 4. Add Schedule button next to your Deploy button
<button onClick={openSchedulingModal}>
  <Calendar /> Schedule
</button>

// 5. Add modal before closing </div> of component
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

---

## Example 4: Adding Scheduled Tasks Tab

### In your Dashboard/App.jsx

```jsx
import { Calendar } from 'lucide-react';
import ScheduledTasksManager from './components/ScheduledTasksManager';

function Dashboard() {
  const [activeTab, setActiveTab] = useState('commands');

  const tabs = [
    { id: 'commands', label: 'Commands', icon: Terminal },
    { id: 'software', label: 'Software', icon: Package },
    { id: 'files', label: 'Files', icon: Files },
    { id: 'scheduled', label: 'Scheduled Tasks', icon: Calendar },  // ✨ ADD THIS
    { id: 'devices', label: 'Devices', icon: Monitor }
  ];

  return (
    <div>
      {/* Tab navigation */}
      <div className="flex gap-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={activeTab === tab.id ? 'active' : ''}
          >
            <tab.icon />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="tab-content">
        {activeTab === 'commands' && <CommandDeployment />}
        {activeTab === 'software' && <SoftwareDeployment />}
        {activeTab === 'files' && <FileDeployment />}
        {activeTab === 'scheduled' && <ScheduledTasksManager />}  {/* ✨ ADD THIS */}
        {activeTab === 'devices' && <DeviceManager />}
      </div>
    </div>
  );
}
```

---

## Copy-Paste Snippets

### Snippet 1: Complete State Setup
```jsx
// Add after your other useState declarations
const [showSchedulingModal, setShowSchedulingModal] = useState(false);
const [schedulingData, setSchedulingData] = useState(null);
```

### Snippet 2: Complete Function Set
```jsx
// Add these three functions to your component

const openSchedulingModal = () => {
  const taskData = {
    device_ids: selectedDevices,
    group_ids: selectedGroups,
    // Add your specific payload here (command_payload, software_payload, or file_payload)
  };
  
  const targetInfo = `Your target description`;
  setSchedulingData({ taskData, targetInfo });
  setShowSchedulingModal(true);
};

const handleSchedule = async (schedulePayload) => {
  try {
    await schedulingService.createScheduledTask(schedulePayload);
    alert('Task scheduled successfully!');
    setShowSchedulingModal(false);
  } catch (error) {
    console.error('Scheduling error:', error);
    throw error;
  }
};

const handleExecuteNow = async () => {
  setShowSchedulingModal(false);
  // Call your existing execute function here
};
```

### Snippet 3: Button Group
```jsx
<div className="flex gap-3">
  <button
    onClick={openSchedulingModal}
    disabled={!canProceed}
    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
  >
    <Calendar className="w-5 h-5" />
    Schedule
  </button>

  <button
    onClick={handleExecuteNow}
    disabled={!canProceed || isLoading}
    className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
  >
    <Play className="w-5 h-5" />
    {isLoading ? 'Processing...' : 'Execute Now'}
  </button>
</div>
```

### Snippet 4: Modal Component
```jsx
{showSchedulingModal && (
  <SchedulingModal
    isOpen={showSchedulingModal}
    onClose={() => setShowSchedulingModal(false)}
    onSchedule={handleSchedule}
    onExecuteNow={handleExecuteNow}
    taskType="command"  // or "software_deployment" or "file_deployment"
    taskData={schedulingData?.taskData}
    targetInfo={schedulingData?.targetInfo}
  />
)}
```

---

## Task Type Reference

When opening the modal, use the correct `taskType`:

```jsx
// For command execution
taskType="command"
taskData={{
  device_ids: [],
  group_ids: [],
  command_payload: { command: '', shell: 'cmd' }
}}

// For software deployment
taskType="software_deployment"
taskData={{
  device_ids: [],
  group_ids: [],
  software_payload: { software_ids: [], deployment_name: '' }
}}

// For file deployment
taskType="file_deployment"
taskData={{
  device_ids: [],
  group_ids: [],
  file_payload: { file_ids: [], target_path: '' }
}}
```

---

## Visual Flow

```
User clicks "Schedule" button
         ↓
openSchedulingModal() called
         ↓
State updated: showSchedulingModal = true
         ↓
<SchedulingModal> renders
         ↓
User configures schedule
         ↓
User clicks "Schedule Task"
         ↓
handleSchedule() called
         ↓
schedulingService.createScheduledTask() API call
         ↓
Task saved to database
         ↓
Modal closes
         ↓
User sees success message
```

---

## Quick Integration Checklist

For each deployment page:

1. [ ] Import `SchedulingModal`, `schedulingService`, `Calendar`
2. [ ] Add state: `showSchedulingModal`, `schedulingData`
3. [ ] Add function: `openSchedulingModal()`
4. [ ] Add function: `handleSchedule()`
5. [ ] Add function: `handleExecuteNow()`
6. [ ] Update button from single to button group
7. [ ] Add `<SchedulingModal>` component
8. [ ] Test: Click schedule button
9. [ ] Test: Submit schedule form
10. [ ] Test: View task in Scheduled Tasks tab

**That's it! Your scheduling integration is complete! 🎉**
