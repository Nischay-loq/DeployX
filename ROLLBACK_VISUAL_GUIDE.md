# 📸 Snapshot Rollback - Visual Guide

## Where to Click: Visual Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DEPLOYMENT MANAGER PAGE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [Agent: agent_123 ▼] [Shell: cmd ▼] [Strategy: 📸 Snapshot Rollback ▼]   │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────┐            │
│  │ Enter command...                              [▶ Execute]  │            │
│  └────────────────────────────────────────────────────────────┘            │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Command Queue                                                        │   │
│  │                                                                       │   │
│  │  ⟳ mkdir test_folder                                            ✓   │   │
│  │  abc123... • Started: 10:30 AM                                      │   │
│  │  Output: Directory created successfully                             │   │
│  │                                                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│                                                                              │
│                                                                              │
│                                                                              │
│                                                    ┌──────────────────────┐ │
│                                                    │ 📸 Snapshots [2]  ▲ │ │
│                                                    │                      │ │
│                                                    │  👆 CLICK HERE TO    │ │
│                                                    │     EXPAND PANEL     │ │
│                                                    │                      │ │
│                                                    └──────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘

After clicking, the panel expands:

┌──────────────────────────────────────────────────────────────────┐
│ 📸 Snapshots [2]                                              ▼ │ ← Click to collapse
├──────────────────────────────────────────────────────────────────┤
│ [All (2)] [Single (2)] [Batches (0)]              [Clear All]   │
│  👆 Filter buttons                                  👆 Remove all│
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  mkdir test_folder                                          ✓   │
│  abc123def456... • 2m ago                    [↶ Rollback] ← CLICK!
│                                                                  │
│  echo "test" > test.txt                                     ✓   │
│  ghi789jkl012... • 5m ago                    [↶ Rollback] ← CLICK!
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Rollback Flow Diagram

```
START
  │
  ├─ 1. Execute command with Snapshot strategy
  │    └─> Snapshot automatically created ✓
  │
  ├─ 2. Click "📸 Snapshots [X]" panel
  │    └─> Panel expands ✓
  │
  ├─ 3. Find your command in the list
  │    └─> See command, timestamp, status ✓
  │
  ├─ 4. Click [↶ Rollback] button
  │    └─> Confirmation dialog appears ⚠️
  │
  ├─ 5. Read confirmation
  │    ├─> Click "OK" to rollback
  │    │    └─> Rollback starts (shows "⟳ Rolling back...")
  │    │         └─> Rollback completes ✅
  │    │              └─> Snapshot removed from list
  │    │                   └─> Notification: "Rollback successful" 🎉
  │    │
  │    └─> Click "Cancel" to abort
  │         └─> No changes made
  │
END
```

## Batch Rollback Flow

```
Batch Execution:
  Command 1: cd backend/      → Snapshot #1 created
  Command 2: mkdir test/      → Snapshot #2 created
  Command 3: echo "hi" > f.txt → Snapshot #3 created

Batch Rollback (Reverse Order):
  Step 1: Rollback Snapshot #3 (remove file)
  Step 2: Rollback Snapshot #2 (remove directory)
  Step 3: Rollback Snapshot #1 (change directory back)
  
Result: All changes undone! ✅
```

## Panel States

### Collapsed State (Default)
```
┌──────────────────────┐
│ 📸 Snapshots [2]  ▲ │  ← Shows count, click to expand
└──────────────────────┘
```

### Expanded State (After Click)
```
┌─────────────────────────────────────────────┐
│ 📸 Snapshots [2]                         ▼ │  ← Click to collapse
├─────────────────────────────────────────────┤
│ [All] [Single] [Batches]     [Clear All]   │  ← Filters & Actions
├─────────────────────────────────────────────┤
│                                             │
│  📦 Batch: batch_001   2 commands          │
│              [↶ Rollback Batch] ← Rollback all
│  ┌───────────────────────────────────────┐ │
│  │ #1  cd backend/                   ✓   │ │
│  │     abc... • 5m         ↶ ← Single    │ │
│  ├───────────────────────────────────────┤ │
│  │ #2  mkdir test/                   ✓   │ │
│  │     def... • 5m         ↶             │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  Single command                         ✓   │
│  ghi... • 2m ago         [↶ Rollback]      │
│                                             │
└─────────────────────────────────────────────┘
```

### Empty State
```
┌─────────────────────────────────────────────┐
│ 📸 Snapshots [0]                         ▼ │
├─────────────────────────────────────────────┤
│ [All (0)] [Single (0)] [Batches (0)]       │
├─────────────────────────────────────────────┤
│                                             │
│         No snapshots yet                    │
│   Execute commands with snapshots           │
│       enabled to see them here              │
│                                             │
└─────────────────────────────────────────────┘
```

## Color Guide

```
Status Colors:
  ✓ Green  = Success
  ✗ Red    = Failed
  ⟳ Blue   = Rolling back...

Border Colors:
  ┃ Blue   = Standard snapshot
  ┃ Green  = Successful command
  ┃ Red    = Failed command

Button Colors:
  [↶ Rollback]           = Purple/Pink gradient (Ready)
  [⟳ Rolling back...]    = Gray with spinner (In progress)
  [↶ Rollback] (grayed)  = Disabled (Not available)
```

## Interactive Elements

```
Clickable Elements:
  
  📸 Snapshots [X] ▲/▼     → Expand/Collapse panel
  [All] [Single] [Batches] → Filter snapshots
  [Clear All]              → Remove all snapshots
  [↶ Rollback]             → Rollback single command
  [↶ Rollback Batch]       → Rollback entire batch
  ↶ (small icon)           → Rollback command in batch
```

## Notifications

```
Notification Positions:
  
  ┌─────────────────────────────────┐
  │                          ┌─────┐│  ← Success/Error notifications
  │                          │ ✅  ││    appear here (top-right)
  │                          └─────┘│
  │                                 │
  │                                 │
  │                        ┌───────┐│  ← Snapshot panel
  │                        │📸 [X] ││    appears here (bottom-right)
  │                        └───────┘│
  └─────────────────────────────────┘

Notification Types:
  🔵 Blue   = Info (Snapshot created)
  ✅ Green  = Success (Rollback completed)
  ❌ Red    = Error (Rollback failed)
```

## Mobile View

```
On mobile devices, the panel becomes full-width:

┌────────────────────────────────────┐
│                                    │
│  Command Queue                     │
│  (scrollable content)              │
│                                    │
├────────────────────────────────────┤
│ 📸 Snapshots [2]                ▲ │ ← Panel at bottom
├────────────────────────────────────┤
│ Expanded view:                     │
│ [All] [Single] [Batches]          │
│ [Clear All]                        │
│                                    │
│ Command list (scrollable)          │
│                                    │
└────────────────────────────────────┘
```

## Quick Action Map

```
Task                    → Action
─────────────────────────────────────────────────
View snapshots          → Click "📸 Snapshots [X]"
Rollback one command    → Click [↶ Rollback]
Rollback all commands   → Click [↶ Rollback Batch]
Filter snapshots        → Click [All]/[Single]/[Batches]
Remove all snapshots    → Click [Clear All]
Close panel             → Click header (▼)
```

---

**TIP**: The snapshot panel is context-aware - it only shows snapshots for the currently selected agent!
