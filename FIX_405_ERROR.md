# Fix for 405 Method Not Allowed Error

## Problem
Getting `405 Method Not Allowed` error when trying to create scheduled tasks.

## Root Cause
The backend server needs to be restarted after adding the schedule routes and models.

## Solution

### Step 1: Stop the Current Backend Server
In the terminal running the backend, press `Ctrl+C` to stop it.

### Step 2: Install APScheduler (if not already installed)
```powershell
cd D:\DeployX\backend
pip install apscheduler
```

### Step 3: Create Schedule Database Tables
```powershell
python create_schedule_tables.py
```

Expected output:
```
Connecting to database...
Creating schedule tables...
✓ Created scheduled_tasks table
✓ Created scheduled_task_executions table
Database tables created successfully!
```

### Step 4: Restart the Backend Server
```powershell
python start_server.py
```

Wait for the server to start and look for these log messages:
```
Task scheduler started
Loaded existing scheduled tasks
INFO:     Application startup complete.
```

### Step 5: Verify the API is Working

Open a new PowerShell terminal and test:

```powershell
# Test 1: Check if server is running
Invoke-WebRequest -Uri "http://localhost:8000/health" -Method GET

# Expected: {"status":"healthy","message":"Backend is running"}
```

### Step 6: Test from Frontend
1. Open your browser to the frontend (usually http://localhost:5173)
2. Go to Command Deployment page
3. Enter a command
4. Select an agent or group
5. Click the **"Schedule"** button
6. The scheduling modal should open without errors

## Verification Checklist

- [ ] Backend server restarted
- [ ] APScheduler installed
- [ ] Database tables created
- [ ] Server logs show "Task scheduler started"
- [ ] Health endpoint returns 200 OK
- [ ] Schedule button works in frontend
- [ ] Scheduling modal opens successfully

## Additional Fixes Applied

### File Deployment Fix
✅ **Schedule button now works without custom path**
- Default path `/tmp/deployed_files` will be used if no path is specified
- Button is enabled when files are uploaded and devices are selected
- Custom path is optional

## If Still Getting 405 Error

1. **Check if backend is actually running:**
   ```powershell
   # In PowerShell
   Get-Process | Where-Object {$_.ProcessName -like "*python*"}
   ```

2. **Check backend logs** for any error messages

3. **Clear browser cache:**
   - Press `Ctrl+Shift+Delete`
   - Clear cached images and files
   - Refresh page with `Ctrl+F5`

4. **Check browser console** (F12) for the exact error:
   - Look for the full URL being requested
   - Check the request method (should be POST)
   - Verify the request headers include Authorization

5. **Verify authentication:**
   - Make sure you're logged in
   - Check localStorage has a token: 
     - Open DevTools (F12)
     - Go to Application tab
     - Check Local Storage → token

## Common Issues

### "Module apscheduler not found"
```powershell
pip install apscheduler
```

### "Table scheduled_tasks does not exist"
```powershell
python create_schedule_tables.py
```

### "Not authenticated"
- Log out and log back in
- Token might have expired

### Backend not starting
- Check if port 8000 is already in use
- Look for error messages in terminal
- Try a different port in .env file

---

**After following these steps, the scheduling feature should work perfectly!** ✅
