# DeployX Agent - Auto-Updating Executable

This directory contains everything needed to build auto-updating executable installers for the DeployX Agent on Windows, Linux, and macOS.

## 📁 Directory Structure

```
Exe/
├── version.py                    # Version tracking
├── updater.py                    # Auto-update logic
├── agent_with_updater.py        # Agent wrapper with update support
├── config/
│   └── config.json              # Configuration
├── assets/
│   └── icon files               # Application icons
├── build/
│   ├── windows/
│   │   ├── agent.spec           # PyInstaller spec
│   │   ├── installer.iss        # Inno Setup script
│   │   └── build_windows.py     # Build script
│   ├── linux/
│   │   ├── deployx-agent.service
│   │   └── build_linux.sh       # Build script
│   └── macos/
│       ├── Info.plist
│       ├── com.deployx.agent.plist
│       └── build_macos.sh       # Build script
└── backend_routes/
    ├── agent_updates.py         # FastAPI routes
    └── versions.json            # Version manifest
```

## 🚀 Quick Start

### Prerequisites

**All Platforms:**
- Python 3.8+
- PyInstaller: `pip install pyinstaller`

**Windows Only:**
- Inno Setup: https://jrsoftware.org/isdl.php

**Linux Only:**
- dpkg tools: `sudo apt install dpkg-dev`

**macOS Only:**
- Xcode Command Line Tools: `xcode-select --install`

---

## 🪟 Building for Windows

### Step 1: Install Requirements

```powershell
pip install pyinstaller
```

Download and install Inno Setup from: https://jrsoftware.org/isdl.php

### Step 2: Build

```powershell
cd build\windows
python build_windows.py
```

### Output:
- `dist/DeployXAgent.exe` - Standalone executable
- `output/DeployXAgent-Setup-1.0.0.exe` - Installer

### Step 3: Install

Run the installer `DeployXAgent-Setup-1.0.0.exe`:
- Installs to `C:\Program Files\DeployX Agent\`
- Creates Windows service (optional)
- Auto-starts on Windows startup (optional)

### Manual Service Management:

```powershell
# Start service
sc start DeployXAgent

# Stop service
sc stop DeployXAgent

# Remove service
sc delete DeployXAgent
```

---

## 🐧 Building for Linux

### Step 1: Install Requirements

```bash
sudo apt update
sudo apt install python3-pip dpkg-dev
pip3 install pyinstaller
```

### Step 2: Build

```bash
cd build/linux
chmod +x build_linux.sh
./build_linux.sh
```

### Output:
- `deployx-agent_1.0.0_amd64.deb` - Debian package

### Step 3: Install

```bash
sudo dpkg -i deployx-agent_1.0.0_amd64.deb
```

The agent automatically:
- Installs to `/opt/deployx-agent/`
- Creates systemd service
- Starts automatically

### Service Management:

```bash
# Check status
sudo systemctl status deployx-agent

# Start
sudo systemctl start deployx-agent

# Stop
sudo systemctl stop deployx-agent

# View logs
sudo journalctl -u deployx-agent -f
```

---

## 🍎 Building for macOS

### Step 1: Install Requirements

```bash
pip3 install pyinstaller
```

### Step 2: Build

```bash
cd build/macos
chmod +x build_macos.sh
./build_macos.sh
```

### Output:
- `DeployX-Agent-1.0.0.dmg` - DMG installer

### Step 3: Install

1. Open the DMG file
2. Drag "DeployX Agent.app" to Applications
3. Launch from Applications

### Auto-Start on Login:

```bash
# Copy launch agent
sudo cp com.deployx.agent.plist /Library/LaunchDaemons/

# Load and start
sudo launchctl load /Library/LaunchDaemons/com.deployx.agent.plist
```

---

## 🔄 Auto-Update System

### How It Works

1. Agent checks for updates every hour (configurable)
2. Queries backend: `/api/agent/updates/check?current_version=1.0.0&platform=win32`
3. If update available, downloads new installer
4. Verifies SHA256 checksum
5. Silently installs update and restarts

### Backend Setup

1. **Add routes to your FastAPI app:**

```python
# In backend/app/main.py
from pathlib import Path
import sys

# Add Exe/backend_routes to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "Exe" / "backend_routes"))

from agent_updates import router as updates_router

app.include_router(updates_router)
```

2. **Create update directory:**

```bash
cd backend
mkdir agent_updates
```

3. **Copy versions.json:**

```bash
cp ../Exe/backend_routes/versions.json agent_updates/
```

4. **Upload built installers:**

```bash
# After building, copy installers to backend
cp Exe/build/windows/output/DeployXAgent-Setup-1.0.0.exe backend/agent_updates/
cp Exe/build/linux/deployx-agent_1.0.0_amd64.deb backend/agent_updates/
cp Exe/build/macos/DeployX-Agent-1.0.0.dmg backend/agent_updates/
```

5. **Update versions.json with checksums:**

```json
{
  "win32": {
    "version": "1.0.1",
    "checksum": "actual-sha256-hash-from-build",
    "release_notes": "Bug fixes and improvements"
  }
}
```

---

## 📝 Releasing a New Version

### 1. Update Version

Edit `Exe/version.py`:
```python
__version__ = "1.0.1"
__build__ = "20251026"
```

### 2. Build All Platforms

```bash
# Windows
cd build/windows && python build_windows.py

# Linux (on Linux machine or WSL)
cd build/linux && ./build_linux.sh

# macOS (on Mac)
cd build/macos && ./build_macos.sh
```

### 3. Upload to Backend

```bash
# Copy installers
cp build/windows/output/DeployXAgent-Setup-1.0.1.exe ../../backend/agent_updates/
cp build/linux/deployx-agent_1.0.1_amd64.deb ../../backend/agent_updates/
cp build/macos/DeployX-Agent-1.0.1.dmg ../../backend/agent_updates/
```

### 4. Update versions.json

Get checksums from build output and update `backend/agent_updates/versions.json`:

```json
{
  "win32": {
    "version": "1.0.1",
    "checksum": "new-checksum-here",
    "release_notes": "What's new in this version"
  }
}
```

### 5. Agents Auto-Update

Within 1 hour, all running agents will:
1. Detect the new version
2. Download and verify it
3. Install and restart automatically

---

## 🔧 Configuration

### Update Check Interval

Edit `Exe/config/config.json`:

```json
{
  "update_check_interval": 3600,  // seconds (3600 = 1 hour)
  "auto_update_enabled": true,
  "server_url": "https://deployx-server.onrender.com"
}
```

### Disable Auto-Update

Set `auto_update_enabled: false` in config.json

---

## 🐛 Troubleshooting

### Windows

**Issue: Service won't start**
```powershell
# Check service status
sc query DeployXAgent

# View logs
cd "C:\Program Files\DeployX Agent"
type deployx-agent.log
```

**Issue: Installer requires admin rights**
- Right-click installer → "Run as administrator"

### Linux

**Issue: Service failed to start**
```bash
# Check service status
sudo systemctl status deployx-agent

# View detailed logs
sudo journalctl -xe -u deployx-agent
```

**Issue: Permission denied**
```bash
# Fix permissions
sudo chmod +x /opt/deployx-agent/DeployXAgent
```

### macOS

**Issue: "App can't be opened because it is from an unidentified developer"**
```bash
# Allow app
sudo spctl --add "/Applications/DeployX Agent.app"
```

**Issue: Agent not starting on login**
```bash
# Check launch agent
launchctl list | grep deployx

# Reload
sudo launchctl unload /Library/LaunchDaemons/com.deployx.agent.plist
sudo launchctl load /Library/LaunchDaemons/com.deployx.agent.plist
```

---

## 📊 File Sizes

Approximate installer sizes:

- **Windows**: 45-55 MB
- **Linux**: 40-50 MB
- **macOS**: 45-55 MB

---

## 🔒 Security

### Code Signing (Recommended for Production)

**Windows:**
```powershell
# Sign executable
signtool sign /f certificate.pfx /p password /t http://timestamp.server.com DeployXAgent.exe
```

**macOS:**
```bash
# Sign app
codesign --sign "Developer ID Application: Your Name" "DeployX Agent.app"
```

### Checksum Verification

All updates are verified with SHA256 checksums before installation. Never skip checksum verification!

---

## 📚 Additional Resources

- [PyInstaller Documentation](https://pyinstaller.org/)
- [Inno Setup Documentation](https://jrsoftware.org/ishelp/)
- [Creating DMG Files](https://developer.apple.com/forums/thread/128166)
- [Systemd Service Files](https://www.freedesktop.org/software/systemd/man/systemd.service.html)

---

## 💡 Tips

1. **Test builds locally** before distributing
2. **Keep build machines clean** to avoid including unnecessary dependencies
3. **Version control** your spec files and build scripts
4. **Automate builds** with CI/CD (GitHub Actions, Jenkins)
5. **Monitor update success rate** through your backend
6. **Provide rollback mechanism** for failed updates

---

## 📞 Support

For issues or questions:
- Check logs first (location varies by platform)
- Review troubleshooting section above
- Open an issue on GitHub

---

Built with ❤️ for DeployX Platform
