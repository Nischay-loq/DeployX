# 🎯 Complete Implementation Guide

## Overview

This guide walks you through the complete process of implementing auto-updating executables for DeployX Agent across Windows, Linux, and macOS.

---

## Phase 1: Initial Setup (Do This First!)

### 1.1 Install Build Dependencies

**On Windows:**
```powershell
cd Exe
pip install -r requirements.txt

# Download and install Inno Setup
# https://jrsoftware.org/isdl.php
```

**On Linux (or WSL):**
```bash
sudo apt update
sudo apt install python3-pip dpkg-dev
cd Exe
pip3 install -r requirements.txt
```

**On macOS:**
```bash
xcode-select --install  # If not already installed
cd Exe
pip3 install -r requirements.txt
```

### 1.2 Prepare Assets (Optional but Recommended)

Create icons for your application:

```
Exe/assets/
├── icon.ico   (Windows - 256x256)
├── icon.icns  (macOS)
└── icon.png   (Linux - 256x256)
```

You can use online tools like:
- https://favicon.io/
- https://cloudconvert.com/

---

## Phase 2: Build First Version

### 2.1 Windows Build

```powershell
cd build\windows
python build_windows.py
```

**Output:** `build\windows\output\DeployXAgent-Setup-1.0.0.exe`

**Save the SHA256 checksum** printed at the end!

### 2.2 Linux Build (on Linux/WSL)

```bash
cd build/linux
chmod +x build_linux.sh
./build_linux.sh
```

**Output:** `build/linux/deployx-agent_1.0.0_amd64.deb`

**Save the SHA256 checksum!**

### 2.3 macOS Build (on macOS)

```bash
cd build/macos
chmod +x build_macos.sh
./build_macos.sh
```

**Output:** `build/macos/DeployX-Agent-1.0.0.dmg`

**Save the SHA256 checksum!**

---

## Phase 3: Backend Integration

### 3.1 Add Update Routes to Backend

Edit `backend/app/main.py`:

```python
import sys
from pathlib import Path

# Add this after other imports
exe_backend_routes = Path(__file__).parent.parent.parent / "Exe" / "backend_routes"
sys.path.insert(0, str(exe_backend_routes))

# Import and register update routes
from agent_updates import router as updates_router
app.include_router(updates_router)
```

### 3.2 Create Update Storage Directory

```bash
cd backend
mkdir -p agent_updates
```

### 3.3 Upload Built Installers

```bash
# Copy from Exe build directories to backend
cp ../Exe/build/windows/output/DeployXAgent-Setup-1.0.0.exe agent_updates/
cp ../Exe/build/linux/deployx-agent_1.0.0_amd64.deb agent_updates/
cp ../Exe/build/macos/DeployX-Agent-1.0.0.dmg agent_updates/
```

### 3.4 Configure versions.json

Create `backend/agent_updates/versions.json`:

```json
{
  "win32": {
    "version": "1.0.0",
    "checksum": "PASTE-WINDOWS-SHA256-HERE",
    "release_notes": "Initial release with auto-update support",
    "release_date": "2025-10-26"
  },
  "linux": {
    "version": "1.0.0",
    "checksum": "PASTE-LINUX-SHA256-HERE",
    "release_notes": "Initial release with auto-update support",
    "release_date": "2025-10-26"
  },
  "darwin": {
    "version": "1.0.0",
    "checksum": "PASTE-MACOS-SHA256-HERE",
    "release_notes": "Initial release with auto-update support",
    "release_date": "2025-10-26"
  }
}
```

Replace the checksums with the actual SHA256 values from your builds!

### 3.5 Test Backend Routes

Start your backend and test:

```bash
# Test update check endpoint
curl "http://localhost:8000/api/agent/updates/check?current_version=0.9.0&platform=win32"

# Should return: {"update_available": true, ...}
```

---

## Phase 4: Testing

### 4.1 Test Windows Installation

1. Run `DeployXAgent-Setup-1.0.0.exe`
2. Check "Start agent automatically when Windows starts"
3. Complete installation
4. Verify agent is running:
   ```powershell
   sc query DeployXAgent
   # Should show: STATE: RUNNING
   ```
5. Check logs:
   ```powershell
   type "C:\Program Files\DeployX Agent\deployx-agent.log"
   ```

### 4.2 Test Linux Installation

```bash
sudo dpkg -i deployx-agent_1.0.0_amd64.deb
sudo systemctl status deployx-agent
sudo journalctl -u deployx-agent -f
```

### 4.3 Test macOS Installation

1. Open DMG file
2. Drag to Applications
3. Open from Applications
4. Check logs: `tail -f /tmp/deployx-agent.log`

### 4.4 Test Auto-Update

1. **Verify update checking:**
   - Wait 60 seconds after agent starts
   - Check logs for "Checking for updates..."
   - Should see "Agent is up to date"

2. **Test actual update:**
   - Edit `Exe/version.py` → Change to "1.0.1"
   - Rebuild for your platform
   - Copy new installer to `backend/agent_updates/`
   - Update `versions.json` with new version and checksum
   - Wait up to 1 hour (or restart agent)
   - Agent should detect, download, and install update automatically!

---

## Phase 5: Production Deployment

### 5.1 Deploy to Production Server

Upload to your Render/Vercel/AWS backend:

```bash
# Upload installers to production server
scp agent_updates/* user@server:/path/to/backend/agent_updates/

# Or use your deployment method
# Make sure versions.json is accessible at:
# https://deployx-server.onrender.com/api/agent/updates/check
```

### 5.2 Update Configuration

Edit `Exe/config/config.json` for production:

```json
{
  "update_check_interval": 3600,
  "auto_update_enabled": true,
  "server_url": "https://deployx-server.onrender.com"
}
```

Rebuild with production config.

### 5.3 Distribute to Users

**Option 1: Direct Download**
- Host installers on your server
- Provide download links on your website

**Option 2: GitHub Releases**
```bash
# Create release on GitHub
gh release create v1.0.0 \
  build/windows/output/DeployXAgent-Setup-1.0.0.exe \
  build/linux/deployx-agent_1.0.0_amd64.deb \
  build/macos/DeployX-Agent-1.0.0.dmg
```

**Option 3: Package Repositories**
- Upload .deb to PPA (Ubuntu)
- Submit to Homebrew (macOS)
- Upload to Chocolatey (Windows)

---

## Phase 6: Ongoing Maintenance

### 6.1 Releasing Updates

1. **Increment version:**
   ```python
   # Exe/version.py
   __version__ = "1.0.1"
   ```

2. **Build for all platforms:**
   ```bash
   # Windows
   cd build/windows && python build_windows.py
   
   # Linux
   cd build/linux && ./build_linux.sh
   
   # macOS
   cd build/macos && ./build_macos.sh
   ```

3. **Upload to backend:**
   ```bash
   cp build/*/output/* ../backend/agent_updates/
   ```

4. **Update versions.json:**
   - Update version numbers
   - Update checksums
   - Add release notes

5. **Deploy backend changes**

6. **Agents auto-update within 1 hour!**

### 6.2 Monitoring

Add monitoring to your backend:

```python
# Track update downloads
@router.get("/download/{platform}/{version}")
async def download_update(platform: str, version: str):
    # Log download
    logger.info(f"Update downloaded: {platform} v{version}")
    
    # Track in database
    db.add(UpdateDownload(platform=platform, version=version))
    
    # Return file...
```

### 6.3 Rollback Strategy

If an update causes issues:

1. **Quick rollback:**
   ```json
   // Revert versions.json to previous version
   {
     "win32": {
       "version": "1.0.0",  // Back to working version
       ...
     }
   }
   ```

2. **Agents will see no update available**

3. **Fix issue and release 1.0.2**

---

## Troubleshooting

### Build Fails

**"Module not found"**
```bash
pip install -r requirements.txt
```

**"PyInstaller failed"**
- Check Python version (3.8+)
- Try: `pyinstaller --clean agent.spec`

### Agent Won't Start

**Windows:**
```powershell
# Run manually to see errors
"C:\Program Files\DeployX Agent\DeployXAgent.exe"
```

**Linux:**
```bash
sudo systemctl status deployx-agent
sudo journalctl -xe -u deployx-agent
```

**macOS:**
```bash
# Run from terminal to see errors
"/Applications/DeployX Agent.app/Contents/MacOS/DeployXAgent"
```

### Update Not Working

1. **Check backend routes:**
   ```bash
   curl "https://deployx-server.onrender.com/api/agent/updates/check?current_version=1.0.0&platform=win32"
   ```

2. **Verify versions.json is accessible**

3. **Check agent logs for update errors**

4. **Verify checksums match**

---

## Security Best Practices

### 1. Code Signing (Highly Recommended)

**Windows:**
```powershell
signtool sign /f certificate.pfx /p password /t http://timestamp.digicert.com DeployXAgent.exe
```

**macOS:**
```bash
codesign --deep --force --sign "Developer ID" "DeployX Agent.app"
```

### 2. HTTPS Only

Ensure update server uses HTTPS:
```python
UPDATE_SERVER_URL = "https://deployx-server.onrender.com/api/agent/updates"
```

### 3. Checksum Verification

Never skip checksum verification - it's built into the updater!

### 4. Staged Rollouts

Release to 10% of users first:
```python
# In backend
if random.random() < 0.1:  # 10% of users
    return new_version
else:
    return old_version
```

---

## Performance Tips

1. **Use CDN for downloads**
   - Store installers on S3/CloudFront
   - Faster downloads worldwide

2. **Compress installers**
   - Already done by Inno Setup/dpkg/DMG

3. **Differential updates**
   - Future enhancement: only download changed files

---

## Congratulations! 🎉

You now have a complete auto-updating agent system!

### What You've Accomplished:

✅ Built executable installers for Windows, Linux, and macOS
✅ Implemented auto-update functionality
✅ Set up backend distribution system
✅ Configured automatic startup on all platforms
✅ Created a production-ready deployment system

### Next Steps:

1. Test thoroughly on each platform
2. Deploy to production
3. Monitor update success rates
4. Gather user feedback
5. Iterate and improve!

---

**Need Help?** Check README.md for detailed documentation or open an issue on GitHub.

**Happy Deploying! 🚀**
