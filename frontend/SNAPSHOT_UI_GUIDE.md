# Snapshot Rollback UI - User Guide

## Overview

The Snapshot Rollback UI provides a clean, intuitive interface for managing command snapshots and performing rollbacks directly from the frontend. It's seamlessly integrated into the Terminal component and provides real-time feedback on command execution and rollback operations.

## Features

### 📸 Automatic Snapshot Tracking
- **Real-time Updates**: Snapshots appear automatically as commands are executed
- **Batch Grouping**: Commands from batch operations are grouped together
- **Status Indicators**: Visual feedback shows success/failure of each command
- **Timestamp Tracking**: See how long ago each snapshot was created

### 🎯 Smart Filtering
- **All Snapshots**: View all snapshots (default)
- **Single Commands**: Filter to show only individual command snapshots
- **Batch Commands**: Filter to show only batch operation snapshots

### ↶ Rollback Operations
- **Single Command Rollback**: Undo individual commands
- **Batch Rollback**: Undo entire batches in reverse order
- **Confirmation Dialogs**: Safety confirmations before rollback
- **Real-time Status**: Loading states and progress indicators

## UI Components

### 1. Collapsible Panel
Located at the bottom-right of the terminal window, the snapshot manager can be:
- **Collapsed**: Shows only the header with snapshot count
- **Expanded**: Shows full snapshot list and controls

**Toggle**: Click anywhere on the header to expand/collapse

### 2. Snapshot Header
```
📸 Snapshots [5]  ▼
```
- **Icon**: 📸 indicates snapshot functionality
- **Count**: Badge shows total number of active snapshots
- **Toggle**: Arrow indicates current state (▼ expanded, ▲ collapsed)

### 3. Filter Controls
```
[All (5)] [Single (3)] [Batches (1)]  [Clear All]
```
- **All**: Show all snapshots
- **Single**: Show only individual command snapshots
- **Batches**: Show only batch operation snapshots
- **Clear All**: Remove all snapshots from the list (with confirmation)

### 4. Snapshot Items

#### Single Command Snapshot
```
┌─────────────────────────────────────────────┐
│ mkdir new_folder                        ✓   │
│ abc123def... • 2m ago          [↶ Rollback] │
└─────────────────────────────────────────────┘
```

#### Batch Snapshot Group
```
┌─────────────────────────────────────────────┐
│ 📦 Batch: batch_001   3 commands            │
│                          [↶ Rollback Batch] │
├─────────────────────────────────────────────┤
│ #1  cd backend/                         ✓   │
│     abc123... • 5m ago                  ↶   │
├─────────────────────────────────────────────┤
│ #2  mkdir test_folder                   ✓   │
│     def456... • 5m ago                  ↶   │
├─────────────────────────────────────────────┤
│ #3  echo "test" > test.txt              ✓   │
│     ghi789... • 5m ago                  ↶   │
└─────────────────────────────────────────────┘
```

## How to Use

### Viewing Snapshots

1. **Open the Terminal**: Navigate to the terminal page
2. **Connect to Agent**: Select an agent and start a shell
3. **Execute Commands**: Run commands (snapshots created automatically if batch execution is enabled)
4. **View Snapshots**: Click the snapshot panel header to expand and see all snapshots

### Filtering Snapshots

1. **Expand Panel**: Click the header to expand
2. **Select Filter**: Click on one of the filter buttons:
   - `All`: Shows everything
   - `Single`: Shows only individual command snapshots
   - `Batches`: Shows only batch operations

### Rolling Back a Single Command

1. **Locate Snapshot**: Find the command snapshot you want to rollback
2. **Click Rollback**: Click the `↶ Rollback` button
3. **Confirm**: Confirm the operation in the dialog box
4. **Wait**: Watch for the rollback status (button shows "⟳ Rolling back...")
5. **Complete**: Snapshot disappears when rollback is successful

### Rolling Back a Batch

1. **Locate Batch**: Find the batch group you want to rollback
2. **Click Rollback Batch**: Click the `↶ Rollback Batch` button at the top of the batch
3. **Confirm**: Confirm the operation (shows number of commands)
4. **Wait**: All commands in the batch show rolling back status
5. **Complete**: Entire batch disappears when rollback is successful

### Clearing Snapshots

1. **Expand Panel**: Ensure the panel is expanded
2. **Click Clear All**: Click the "Clear All" button in the controls
3. **Confirm**: Confirm you want to remove all snapshots
4. **Result**: All snapshots are removed from the list

## Visual Indicators

### Status Badges
- **✓ (Green)**: Command executed successfully
- **✗ (Red)**: Command failed

### Snapshot Colors
- **Blue Border**: Standard single command
- **Green Border**: Successful command
- **Red Border**: Failed command

### Button States
- **Normal**: Blue/Purple gradient - Ready to rollback
- **Disabled**: Grayed out - Not available (disconnected or already rolling back)
- **Loading**: Shows "⟳" spinner - Rollback in progress

### Notifications
Appear in the top-right corner with color coding:
- **Blue**: Information (snapshot created)
- **Green**: Success (rollback completed)
- **Red**: Error (rollback failed)

## Integration with Backend

### Socket Events

#### Outgoing (Frontend → Backend)
```javascript
// Rollback single command
socket.emit('rollback_command', {
  agent_id: 'agent_123',
  snapshot_id: 'abc123def456'
});

// Rollback batch
socket.emit('rollback_batch', {
  agent_id: 'agent_123',
  batch_id: 'batch_001'
});
```

#### Incoming (Backend → Frontend)
```javascript
// New snapshot created
socket.on('batch_command_completed', (data) => {
  // data: { snapshot_id, command, batch_id, command_index, success, output, error }
});

// Rollback completed
socket.on('rollback_completed', (data) => {
  // data: { snapshot_id, success, error }
});

// Batch rollback completed
socket.on('batch_rollback_completed', (data) => {
  // data: { batch_id, success, error }
});
```

## Best Practices

### 1. Monitor Snapshot Creation
- Watch for notifications when snapshots are created
- Verify snapshots appear in the panel after command execution

### 2. Use Batch Rollback Wisely
- Batch rollback undoes ALL commands in reverse order
- Review the commands before confirming batch rollback
- Individual command rollback is available if you only need to undo one command

### 3. Clear Old Snapshots
- Snapshots auto-delete after 24 hours (agent-side)
- Manually clear snapshots you no longer need
- Keeps the UI clean and focused on recent operations

### 4. Check Status Before Rollback
- Ensure you're connected to the backend
- Verify the correct agent is selected
- Read the confirmation dialog carefully

### 5. Handle Failures Gracefully
- If rollback fails, check the error notification
- Verify agent connectivity
- Check terminal output for additional error details

## Troubleshooting

### Snapshots Not Appearing
**Cause**: Socket connection issue or snapshots not enabled
**Solution**:
1. Check connection status indicator
2. Verify agent is selected and shell is started
3. Ensure backend is running and agent is connected

### Rollback Button Disabled
**Cause**: Not connected or rollback in progress
**Solution**:
1. Check connection status (green dot)
2. Wait for any ongoing rollback to complete
3. Refresh if connection is lost

### Rollback Failed
**Cause**: Snapshot expired, file conflicts, or permissions
**Solution**:
1. Check error notification for details
2. Verify files haven't been manually modified
3. Check agent logs for detailed error information

### Notification Not Showing
**Cause**: Auto-dismissed or multiple notifications
**Solution**:
1. Notifications auto-dismiss after a few seconds
2. Check snapshot list for confirmation of state changes

## Keyboard Shortcuts

Currently, the snapshot manager is mouse/touch-driven. Future enhancements may include:
- `Ctrl+S`: Toggle snapshot panel
- `Ctrl+R`: Rollback selected snapshot
- `Escape`: Close confirmation dialogs

## Mobile/Responsive Design

The snapshot manager is fully responsive:
- **Desktop**: Fixed position bottom-right, 450px wide
- **Tablet**: Adapts to screen width
- **Mobile**: Full width minus margins, stacked controls

## Accessibility

- **Keyboard Navigation**: All buttons are keyboard accessible
- **Screen Readers**: Semantic HTML with proper labels
- **Color Contrast**: High contrast text and backgrounds
- **Focus Indicators**: Visible focus states on interactive elements

## Future Enhancements

Planned features:
- [ ] Snapshot search/filtering by command text
- [ ] Export snapshot history
- [ ] Snapshot comparison view
- [ ] Undo rollback (rollback to rollback)
- [ ] Scheduled auto-cleanup
- [ ] Snapshot tagging/favorites

---

## Quick Reference

| Action | Method |
|--------|--------|
| **View Snapshots** | Click header to expand panel |
| **Filter View** | Click All/Single/Batches buttons |
| **Rollback Command** | Click `↶ Rollback` on snapshot |
| **Rollback Batch** | Click `↶ Rollback Batch` on batch header |
| **Clear All** | Click `Clear All` button → Confirm |
| **Close Panel** | Click header to collapse |

---

**Version**: 1.0.0  
**Last Updated**: October 8, 2025  
**Compatibility**: All modern browsers (Chrome, Firefox, Safari, Edge)
