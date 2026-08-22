"""One-command agent setup.

Lets an admin install the DeployX agent on any machine with a single
copy-paste command. The backend serves platform-specific bootstrap scripts
that download the right binary, register it in the startup folder
(Windows) / autostart + systemd-user (Linux), and launch the agent with the
admin-generated activation key:

    Windows (cmd/PowerShell):
        powershell -NoProfile -ExecutionPolicy Bypass -Command "irm '<srv>/api/agent/setup/bootstrap.ps1?key=<KEY>&server=<srv>' | iex"
    Linux (bash):
        curl -fsSL '<srv>/api/agent/setup/bootstrap.sh?key=<KEY>&server=<srv>' | bash

Binaries are served from AGENT_UPDATES_DIR (default ./agent_updates):
    windows: DeployXAgent.exe    (fallback: newest *.exe)
    linux:   deployx-agent-linux (fallback: newest deployx* executable)
"""
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session

from app.activation import crud as activation_crud
from app.auth.database import get_db, User
from app.auth.utils import get_current_user

router = APIRouter(prefix="/api/agent/setup", tags=["agent-setup"])

UPDATES_DIR = Path(os.getenv("AGENT_UPDATES_DIR", "agent_updates"))

WINDOWS_BINARY_NAMES = ["DeployXAgent.exe"]
LINUX_BINARY_NAMES = ["deployx-agent-linux", "deployx-agent"]

POWERSHELL_BOOTSTRAP = """# DeployX Agent bootstrap installer (Windows)
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Server = '__SERVER__'
$Key    = '__KEY__'
$Dir    = Join-Path $env:LOCALAPPDATA 'DeployX'
$Exe    = Join-Path $Dir 'DeployXAgent.exe'

New-Item -ItemType Directory -Force -Path $Dir | Out-Null

Write-Host '==> Downloading DeployX agent...'
Invoke-WebRequest -Uri "$Server/api/agent/setup/binary/windows" -OutFile $Exe -UseBasicParsing

Write-Host '==> Registering in startup folder...'
$Startup  = [Environment]::GetFolderPath('Startup')
$Launcher = Join-Path $Startup 'DeployXAgent.cmd'
Set-Content -Path $Launcher -Encoding ASCII -Value "@echo off`r`nstart `"`" `"$Exe`" --server $Server --activation-key $Key"

# Stop an older instance before starting the fresh copy
Get-Process DeployXAgent -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host '==> Starting agent...'
Start-Process -FilePath $Exe -ArgumentList '--server', $Server, '--activation-key', $Key -WindowStyle Hidden

Write-Host 'DeployX agent installed successfully.'
Write-Host "  Binary : $Exe"
Write-Host "  Startup: $Launcher"
"""

BASH_BOOTSTRAP = """#!/usr/bin/env bash
# DeployX Agent bootstrap installer (Linux)
set -e

SERVER='__SERVER__'
KEY='__KEY__'
BIN_DIR="$HOME/.local/bin"
BIN="$BIN_DIR/deployx-agent"

if ! command -v curl >/dev/null 2>&1; then
    echo "ERROR: curl is required but not installed." >&2
    exit 1
fi

mkdir -p "$BIN_DIR"

echo "==> Downloading DeployX agent..."
curl -fsSL "$SERVER/api/agent/setup/binary/linux" -o "$BIN"
chmod +x "$BIN"

# Stop an older instance before switching binaries
pkill -f "$BIN" 2>/dev/null || true
sleep 1

if command -v systemctl >/dev/null 2>&1 && systemctl --user status >/dev/null 2>&1; then
    echo "==> Installing systemd user service..."
    mkdir -p "$HOME/.config/systemd/user"
    cat > "$HOME/.config/systemd/user/deployx-agent.service" <<'UNIT'
[Unit]
Description=DeployX Agent
After=network-online.target

[Service]
ExecStart=__BIN__ --server __SERVER__ --activation-key __KEY__
Restart=always
RestartSec=5

[Install]
WantedBy=default.target
UNIT
    sed -i "s|__BIN__|$BIN|g; s|__SERVER__|$SERVER|g; s|__KEY__|$KEY|g" \
        "$HOME/.config/systemd/user/deployx-agent.service"
    systemctl --user daemon-reload
    systemctl --user enable --now deployx-agent.service >/dev/null 2>&1 || true
    loginctl enable-linger "$USER" >/dev/null 2>&1 || true
else
    echo "==> Registering desktop autostart entry..."
    mkdir -p "$HOME/.config/autostart"
    cat > "$HOME/.config/autostart/deployx-agent.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=DeployX Agent
Exec=$BIN --server $SERVER --activation-key $KEY
Terminal=false
X-GNOME-Autostart-enabled=true
EOF
    echo "==> Starting agent..."
    nohup "$BIN" --server "$SERVER" --activation-key "$KEY" >/dev/null 2>&1 &
fi

echo 'DeployX agent installed successfully.'
echo "  Binary : $BIN"
"""


def _find_binary(platform: str) -> Optional[Path]:
    """Locate the newest agent binary for a platform in the updates dir."""
    UPDATES_DIR.mkdir(exist_ok=True)

    preferred = WINDOWS_BINARY_NAMES if platform == "windows" else LINUX_BINARY_NAMES
    for name in preferred:
        candidate = UPDATES_DIR / name
        if candidate.is_file():
            return candidate

    candidates = []
    for entry in UPDATES_DIR.iterdir():
        if not entry.is_file():
            continue
        if platform == "windows":
            matches = entry.suffix.lower() == ".exe"
        else:
            matches = (
                entry.name.lower().startswith("deployx")
                and not entry.name.lower().endswith((".exe", ".deb", ".dmg", ".zip", ".txt", ".json", ".md"))
            )
        if matches:
            candidates.append(entry)

    return max(candidates, key=lambda p: p.stat().st_mtime) if candidates else None


def _public_server_url(request: Request) -> str:
    """Best-known public URL of this backend (PUBLIC_SERVER_URL env wins)."""
    override = os.getenv("PUBLIC_SERVER_URL")
    if override:
        return override.rstrip("/")
    return str(request.base_url).rstrip("/")


def _validate_key(db, key_value: str):
    """Ensure an activation key exists and is not expired."""
    db_key = activation_crud.get_activation_key(db, key_value)
    if not db_key:
        raise HTTPException(status_code=403, detail="Invalid activation key")
    expires_at = db_key.expires_at
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at and expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=403, detail="This activation key has expired")
    return db_key


@router.get("/commands/{key_id}")
async def get_setup_commands(
    key_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Build copy-paste one-liner setup commands for an activation key."""
    db_key = activation_crud.get_activation_key_by_id(db, key_id)
    if not db_key:
        raise HTTPException(status_code=404, detail="Activation key not found")

    server = _public_server_url(request)
    ps_url = f"{server}/api/agent/setup/bootstrap.ps1?key={db_key.key}&server={server}"
    sh_url = f"{server}/api/agent/setup/bootstrap.sh?key={db_key.key}&server={server}"

    windows_command = (
        f"powershell -NoProfile -ExecutionPolicy Bypass "
        f'-Command "irm \'{ps_url}\' | iex"'
    )
    linux_command = f"curl -fsSL '{sh_url}' | bash"

    return {
        "key": db_key.key,
        "expires_at": db_key.expires_at,
        "is_used": db_key.is_used,
        "windows_command": windows_command,
        "linux_command": linux_command,
        "binary_windows_found": _find_binary("windows") is not None,
        "binary_linux_found": _find_binary("linux") is not None,
        "expected_binaries": {
            "windows": WINDOWS_BINARY_NAMES,
            "linux": LINUX_BINARY_NAMES,
        },
    }


@router.get("/binary/{platform}")
async def download_agent_binary(platform: str):
    """Serve the agent binary for the requested platform (windows|linux)."""
    if platform not in ("windows", "linux"):
        raise HTTPException(status_code=400, detail="Platform must be 'windows' or 'linux'")

    binary_path = _find_binary(platform)
    if not binary_path:
        raise HTTPException(
            status_code=404,
            detail=(
                f"No agent binary found for platform '{platform}'. Place a built binary "
                f"named {WINDOWS_BINARY_NAMES + LINUX_BINARY_NAMES} in the "
                f"'{UPDATES_DIR}' directory on the backend host."
            ),
        )

    media_type = (
        "application/vnd.microsoft.portable-executable"
        if platform == "windows"
        else "application/octet-stream"
    )
    return FileResponse(path=binary_path, filename=binary_path.name, media_type=media_type)


@router.get("/bootstrap.ps1")
async def get_windows_bootstrap(key: str, request: Request, server: Optional[str] = None, db=Depends(get_db)):
    """PowerShell bootstrap installer for Windows agents. Public: target machines have no accounts."""
    _validate_key(db, key)
    base = _public_server_url(request)
    resolved = (server or base).rstrip("/")
    script = POWERSHELL_BOOTSTRAP.replace("__SERVER__", resolved).replace("__KEY__", key.strip())
    return Response(content=script, media_type="text/plain; charset=utf-8")


@router.get("/bootstrap.sh")
async def get_linux_bootstrap(key: str, request: Request, server: Optional[str] = None, db=Depends(get_db)):
    """Bash bootstrap installer for Linux agents. Public: target machines have no accounts."""
    _validate_key(db, key)
    base = _public_server_url(request)
    resolved = (server or base).rstrip("/")
    script = BASH_BOOTSTRAP.replace("__SERVER__", resolved).replace("__KEY__", key.strip())
    return Response(
        content=script.replace("\r\n", "\n"),
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": "inline"},
    )
