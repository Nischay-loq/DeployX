# 🚀 Quick Start Guide - DeployX Agent Executable

## For Windows Users (Building on Windows)

### 1. Install Prerequisites

```powershell
# Install Python dependencies
pip install -r requirements.txt

# Download Inno Setup
# Visit: https://jrsoftware.org/isdl.php
# Install with default options
```

### 2. Build the Executable

```powershell
cd build\windows
python build_windows.py
```

### 3. Find Your Installer

The installer will be at: `build\windows\output\DeployXAgent-Setup-1.0.0.exe`

### 4. Test It

- Run the installer
- Check "Start agent automatically" during installation
- Agent will start in the background

---

## For Linux Users (Building on Linux/WSL)

### 1. Install Prerequisites

```bash
# Install system dependencies
sudo apt update
sudo apt install python3-pip dpkg-dev

# Install Python dependencies
pip3 install -r requirements.txt
```

### 2. Build the Package

```bash
cd build/linux
chmod +x build_linux.sh
./build_linux.sh
```

### 3. Find Your Package

The package will be at: `build/linux/deployx-agent_1.0.0_amd64.deb`

### 4. Test It

```bash
sudo dpkg -i deployx-agent_1.0.0_amd64.deb
sudo systemctl status deployx-agent
```

---

## For macOS Users (Building on macOS)

### 1. Install Prerequisites

```bash
# Install Xcode Command Line Tools (if not installed)
xcode-select --install

# Install Python dependencies
pip3 install -r requirements.txt
```

### 2. Build the DMG

```bash
cd build/macos
chmod +x build_macos.sh
./build_macos.sh
```

### 3. Find Your DMG

The DMG will be at: `build/macos/DeployX-Agent-1.0.0.dmg`

### 4. Test It

- Open the DMG file
- Drag app to Applications
- Launch from Applications

---

## Setting Up Auto-Updates

### 1. Add Backend Routes

In your `backend/app/main.py`, add:

```python
import sys
from pathlib import Path

# Add update routes
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "Exe" / "backend_routes"))
from agent_updates import router as updates_router

app.include_router(updates_router)
```

### 2. Create Update Directory

```bash
cd backend
mkdir agent_updates
```

### 3. Copy Initial Configuration

```bash
# Copy versions.json
cp ../Exe/backend_routes/versions.json agent_updates/
```

### 4. Upload Your Built Installers

After building, copy installers to backend:

```bash
# Windows
cp Exe/build/windows/output/DeployXAgent-Setup-1.0.0.exe backend/agent_updates/

# Linux
cp Exe/build/linux/deployx-agent_1.0.0_amd64.deb backend/agent_updates/

# macOS
cp Exe/build/macos/DeployX-Agent-1.0.0.dmg backend/agent_updates/
```

### 5. Update Checksums

Edit `backend/agent_updates/versions.json` with the SHA256 checksums from your builds (printed during build process).

---

## Testing Auto-Update

### 1. Start Backend

```bash
cd backend
python start_server.py
```

### 2. Install Agent

Use the installer you built for your platform.

### 3. Check Logs

The agent will check for updates within 60 seconds of starting, then every hour.

**Windows:** `C:\Program Files\DeployX Agent\deployx-agent.log`
**Linux:** `sudo journalctl -u deployx-agent -f`
**macOS:** `/tmp/deployx-agent.log`

### 4. Test Update

1. Increment version in `Exe/version.py` to "1.0.1"
2. Rebuild installer
3. Copy to `backend/agent_updates/`
4. Update `versions.json` with new version and checksum
5. Wait up to 1 hour (or restart agent for immediate check)
6. Agent will auto-update!

---

## Common Issues

### "PyInstaller not found"
```bash
pip install pyinstaller
```

### "Inno Setup not found" (Windows)
Download and install from: https://jrsoftware.org/isdl.php

### "Permission denied" (Linux/macOS)
```bash
chmod +x build_linux.sh
# or
chmod +x build_macos.sh
```

### Build fails with import errors
Make sure you're in the project root when running builds, or adjust paths in the spec files.

---

## Next Steps

1. ✅ Build your first executable
2. ✅ Test installation on your platform
3. ✅ Set up backend update routes
4. ✅ Test auto-update functionality
5. ✅ Build for other platforms (optional)
6. ✅ Distribute to users!

---

## Need Help?

Check the full README.md for detailed documentation, troubleshooting, and advanced configuration.

**Happy Building! 🎉**
