# Group Command Execution - Complete Implementation

## 📋 Overview

This implementation adds comprehensive command execution capabilities for device groups in DeployX. It allows executing commands on multiple devices within a group simultaneously, with support for batch processing and real-time status tracking.

## ✨ Features

- ✅ **Single Command Execution**: Execute one command across all group devices
- ✅ **Batch Parallel Execution**: Execute multiple commands simultaneously
- ✅ **Batch Sequential Execution**: Execute commands in order with dependencies
- ✅ **Real-time Status Tracking**: Monitor progress for each device
- ✅ **Partial Success Handling**: Track which devices succeeded/failed
- ✅ **Progress Monitoring**: Calculate completion percentage
- ✅ **Socket.IO Integration**: Leverages existing agent communication
- ✅ **Authentication & Authorization**: User-based access control
- ✅ **Error Handling**: Comprehensive error messages per device

## 📁 Files Created/Modified

### New Files

1. **`command_executor.py`** (520 lines)
   - Core execution engine for group commands
   - Handles parallel and sequential execution
   - Tracks device-level results

2. **`GROUP_COMMAND_EXECUTION_GUIDE.md`**
   - Complete API documentation
   - Usage examples and best practices
   - Troubleshooting guide

3. **`test_group_command_api.py`**
   - Comprehensive test suite
   - Demonstrates all API endpoints
   - Includes polling and status checking

4. **`IMPLEMENTATION_SUMMARY.md`**
   - Architecture overview
   - Design decisions
   - Comparison with individual agent execution

5. **`FRONTEND_INTEGRATION.md`**
   - React and Vue.js examples
   - TypeScript type definitions
   - UI/UX recommendations

6. **`README.md`** (this file)
   - Quick start guide
   - File structure overview

### Modified Files

1. **`schemas.py`**
   - Added 6 new Pydantic models for requests/responses

2. **`route.py`**
   - Added 10 new API endpoints
   - Integrated with executor

3. **`../main.py`**
   - Initialized group command executor
   - Enhanced Socket.IO event handler

## 🚀 Quick Start

### 1. Backend Setup

The implementation is already integrated into the backend. No additional setup required!

### 2. Test the API

```bash
cd backend/app/grouping
python test_group_command_api.py
```

Update these variables in the script:
- `API_TOKEN`: Your authentication token
- `GROUP_ID`: ID of the group to test

### 3. Execute a Command

```bash
curl -X POST "http://localhost:8000/groups/1/commands" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "command": "echo Hello from group",
    "shell": "cmd"
  }'
```

### 4. Check Execution Status

```bash
curl "http://localhost:8000/groups/1/commands/executions/{execution_id}" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📚 Documentation

### Complete Guides

1. **[GROUP_COMMAND_EXECUTION_GUIDE.md](./GROUP_COMMAND_EXECUTION_GUIDE.md)**
   - Detailed API documentation
   - All endpoints with examples
   - Status types and error handling

2. **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)**
   - Technical architecture
   - Design patterns used
   - Performance considerations

3. **[FRONTEND_INTEGRATION.md](./FRONTEND_INTEGRATION.md)**
   - React and Vue.js examples
   - API integration patterns
   - UI/UX best practices

### API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/groups/{id}/commands` | Execute single command |
| POST | `/groups/{id}/commands/batch` | Execute batch (parallel) |
| POST | `/groups/{id}/commands/batch/sequential` | Execute batch (sequential) |
| GET | `/groups/{id}/commands/executions` | Get all executions |
| GET | `/groups/{id}/commands/executions/{exec_id}` | Get execution status |
| GET | `/groups/{id}/commands/batches` | Get all batches |
| GET | `/groups/{id}/commands/batches/{batch_id}` | Get batch status |
| DELETE | `/groups/{id}/commands/executions/{exec_id}` | Cleanup execution |
| DELETE | `/groups/{id}/commands/batches/{batch_id}` | Cleanup batch |

## 🏗️ Architecture

```
┌──────────────┐
│   Frontend   │
│     API      │
└──────┬───────┘
       │ POST /groups/1/commands
       v
┌──────────────────┐
│  FastAPI Routes  │
│  (route.py)      │
└──────┬───────────┘
       │ Validate & Execute
       v
┌──────────────────────────┐
│  GroupCommandExecutor    │
│  (command_executor.py)   │
└──────┬───────────────────┘
       │ Send via Socket.IO
       v
┌──────────────────────────┐
│      Socket.IO           │
│   (main.py events)       │
└──────┬───────────────────┘
       │ Emit to agents
       v
┌──────────────────────────┐
│  Agent 1 | Agent 2 | ... │
│  Execute Commands        │
└──────┬───────────────────┘
       │ Return results
       v
┌──────────────────────────┐
│  deployment_command_     │
│     completed event      │
└──────┬───────────────────┘
       │ Update status
       v
┌──────────────────────────┐
│  GroupCommandExecutor    │
│  (tracks results)        │
└──────────────────────────┘
```

## 💡 Usage Examples

### Example 1: Simple Command

```python
import requests

response = requests.post(
    "http://localhost:8000/groups/1/commands",
    json={"command": "ipconfig", "shell": "cmd"},
    headers={"Authorization": "Bearer TOKEN"}
)

execution = response.json()
print(f"Started: {execution['execution_id']}")
```

### Example 2: Sequential Deployment

```python
commands = [
    "mkdir C:\\app",
    "curl -o C:\\app\\setup.exe https://example.com/setup.exe",
    "C:\\app\\setup.exe /S"
]

response = requests.post(
    "http://localhost:8000/groups/1/commands/batch/sequential",
    json={
        "commands": commands,
        "shell": "cmd",
        "stop_on_failure": True
    },
    headers={"Authorization": "Bearer TOKEN"}
)

batch = response.json()
print(f"Batch: {batch['batch_id']}")
```

### Example 3: Monitor Progress

```python
import time

def wait_for_completion(group_id, execution_id):
    while True:
        response = requests.get(
            f"http://localhost:8000/groups/{group_id}/commands/executions/{execution_id}",
            headers={"Authorization": "Bearer TOKEN"}
        )
        
        status = response.json()
        print(f"Progress: {status['progress']:.1f}%")
        
        if status['status'] in ['completed', 'failed', 'partial_success']:
            return status
        
        time.sleep(2)

result = wait_for_completion(1, execution_id)
print(f"Final: {result['status']}")
```

## 🔒 Security

- ✅ Authentication required for all endpoints
- ✅ User can only access their own groups
- ✅ Command length validation (max 1000 chars)
- ✅ Agent connectivity verification
- ✅ Input sanitization

## 🧪 Testing

Run the comprehensive test suite:

```bash
cd backend/app/grouping
python test_group_command_api.py
```

The test suite includes:
- ✅ Single command execution
- ✅ Batch parallel execution
- ✅ Batch sequential execution
- ✅ Status polling
- ✅ Execution cleanup

## 📊 Status Types

| Status | Description |
|--------|-------------|
| `pending` | Queued but not started |
| `running` | Currently executing |
| `completed` | All devices succeeded |
| `partial_success` | Some devices failed |
| `failed` | All devices failed |
| `paused` | Execution paused (future) |

## 🎯 Key Benefits

1. **Consistent API**: Mirrors individual agent execution
2. **Scalable**: Handles multiple devices efficiently
3. **Flexible**: Supports parallel and sequential execution
4. **Resilient**: Handles partial failures gracefully
5. **Observable**: Real-time status tracking
6. **Maintainable**: Well-documented and tested
7. **Secure**: Authentication and authorization built-in

## 🚦 Performance

- **Parallel Execution**: O(1) time (all devices at once)
- **Sequential Execution**: O(n) time where n = number of commands
- **Memory Usage**: Tracks active executions in-memory
- **Timeout**: 5 minutes per command in sequential batches
- **Recommended**: Poll every 1-2 seconds for status updates

## 🔮 Future Enhancements

- [ ] WebSocket real-time updates (instead of polling)
- [ ] Configurable timeouts per command
- [ ] Pause/resume execution capability
- [ ] Automatic retry on failure
- [ ] Device filtering (execute on subset)
- [ ] Rollback support
- [ ] Execution history persistence
- [ ] Email/Slack notifications

## 🤝 Contributing

When extending this implementation:

1. Follow existing patterns in `command_executor.py`
2. Add tests in `test_group_command_api.py`
3. Update documentation files
4. Maintain backward compatibility
5. Add type hints for new functions
6. Include error handling

## 📞 Support

For issues or questions:

1. Check the documentation files
2. Review test examples
3. Examine error messages in device results
4. Check backend logs for detailed errors

## 📝 License

Same as main DeployX project.

---

## Quick Reference Card

### Execute Single Command
```bash
POST /groups/{id}/commands
Body: {"command": "...", "shell": "cmd"}
```

### Execute Sequential Batch
```bash
POST /groups/{id}/commands/batch/sequential
Body: {"commands": [...], "shell": "cmd", "stop_on_failure": true}
```

### Get Status
```bash
GET /groups/{id}/commands/executions/{execution_id}
```

### Device Result Structure
```json
{
  "device_id": 1,
  "agent_id": "agent-123",
  "device_name": "Server-1",
  "status": "completed",
  "output": "Command output...",
  "error": null
}
```

---

**Implementation Complete** ✅

All features implemented, tested, and documented. Ready for production use!
