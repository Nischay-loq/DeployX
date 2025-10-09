# 📸 How to Rollback Using Snapshots

## Quick Guide: Where to Click

### Step 1: Navigate to Deployment Manager
1. Open your DeployX application
2. Go to the **Deployment Manager** page (or wherever DeploymentManager.jsx is displayed)

### Step 2: Execute Commands with Snapshots
1. Select an **Agent** from the dropdown
2. Select a **Shell** (cmd, powershell, bash, etc.)
3. Strategy is already set to **📸 Snapshot Rollback** (default)
4. Enter your command and click **Execute** (or use Batch Mode for multiple commands)

### Step 3: Find the Snapshot Panel
After executing commands, look at the **bottom-right corner** of the screen:

```
┌────────────────────────────────────────┐
│ 📸 Snapshots [3]                    ▲ │  ← Click HERE to expand!
└────────────────────────────────────────┘
```

### Step 4: Expand the Panel
Click anywhere on the header bar (`📸 Snapshots [3]`) to expand the panel.

### Step 5: View Your Snapshots
Once expanded, you'll see:

```
┌────────────────────────────────────────────────┐
│ 📸 Snapshots [3]                            ▼ │
├────────────────────────────────────────────────┤
│ [All (3)] [Single (2)] [Batches (1)]          │
│                              [Clear All]       │
├────────────────────────────────────────────────┤
│                                                │
│  📦 Batch: batch_001   2 commands             │
│                      [↶ Rollback Batch] ← CLICK HERE to rollback entire batch
│  ┌──────────────────────────────────────────┐ │
│  │ #1  cd backend/                      ✓   │ │
│  │     abc123... • 5m ago               ↶ ← CLICK for single command rollback
│  ├──────────────────────────────────────────┤ │
│  │ #2  mkdir test/                      ✓   │ │
│  │     def456... • 5m ago               ↶   │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  mkdir new_folder                         ✓   │
│  ghi789... • 2m ago         [↶ Rollback] ← CLICK to rollback this command
│                                                │
└────────────────────────────────────────────────┘
```

## 🎯 Rollback Options

### Option 1: Rollback a Single Command
1. Find the command snapshot you want to rollback
2. Click the **[↶ Rollback]** button on the right side
3. Confirm the action in the popup dialog
4. Wait for the rollback to complete
5. ✅ Done! Changes are undone

### Option 2: Rollback an Entire Batch
1. Find the batch group (marked with 📦)
2. Click the **[↶ Rollback Batch]** button at the top of the batch
3. Confirm the action (shows number of commands that will be rolled back)
4. Wait for the rollback to complete
5. ✅ Done! All commands in the batch are undone in reverse order

### Option 3: Rollback Individual Command in a Batch
1. Find the batch group
2. Click the small **↶** icon next to any individual command
3. Confirm the action
4. ✅ Only that specific command is rolled back

## 🔍 Visual Indicators

### Status Badges
- **✓** (Green) = Command succeeded
- **✗** (Red) = Command failed

### Snapshot Colors
- **Blue left border** = Standard snapshot
- **Green left border** = Successful command
- **Red left border** = Failed command

### Button States
- **Normal** (purple/pink gradient) = Ready to rollback
- **⟳ Rolling back...** = Rollback in progress
- **Grayed out** = Not available (disconnected or in progress)

## 💡 Tips

1. **Check Connection**: Make sure you're connected to the backend (green dot in Deployment Manager)
2. **Select Agent**: Ensure the correct agent is selected
3. **Read Confirmations**: Always read the confirmation dialog before clicking OK
4. **Watch Notifications**: Notifications appear in the top-right corner showing rollback status
5. **Batch Rollback**: Use with caution - it undoes ALL commands in the batch!

## 🎬 Complete Workflow Example

1. **Execute Commands**:
   ```
   cd backend/
   mkdir test_folder
   echo "test" > test.txt
   ```

2. **Snapshots Created**: 3 snapshots automatically created

3. **Realize Mistake**: You notice you created the folder in the wrong location

4. **Click Snapshot Panel**: Expand the panel at bottom-right

5. **Find the Batch**: See "📦 Batch: batch_001 3 commands"

6. **Click Rollback Batch**: Click the [↶ Rollback Batch] button

7. **Confirm**: Popup shows "Are you sure you want to rollback this entire batch? Batch ID: batch_001, Commands: 3"

8. **Wait**: All 3 commands show "⟳ Rolling back..."

9. **Success**: ✅ Notification appears: "Batch rollback successful"

10. **Verify**: All changes are undone - back to the original state!

## 🆘 Troubleshooting

**Q: I don't see the Snapshot Panel**
- A: Make sure you've executed at least one command with the Snapshot strategy

**Q: The Rollback button is disabled**
- A: Check your connection status (green dot) and ensure the backend is running

**Q: Rollback failed**
- A: Check the error notification, verify files haven't been manually modified, check agent logs

**Q: Snapshot disappeared after rollback**
- A: This is normal! Successful rollbacks remove the snapshot from the list

---

## 🎯 Quick Reference Card

| What to Click | Where | What it Does |
|--------------|-------|--------------|
| **📸 Snapshots [X]** | Bottom-right corner | Expand/collapse snapshot panel |
| **[↶ Rollback]** | Next to single command | Undo that specific command |
| **[↶ Rollback Batch]** | Top of batch group | Undo all commands in batch |
| **↶** (small icon) | Next to batch command | Undo one command from batch |
| **[Clear All]** | Top-right of panel | Remove all snapshots from list |
| **[All] [Single] [Batches]** | Filter buttons | Show different types of snapshots |

---

**Remember**: Snapshots are your safety net! Use them confidently to experiment and easily undo changes. 🚀
