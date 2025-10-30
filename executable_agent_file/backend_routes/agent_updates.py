"""
Backend routes for agent update distribution
Add these routes to your FastAPI backend
"""

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse
from pathlib import Path
import json

router = APIRouter(prefix="/api/agent/updates", tags=["agent-updates"])

# Directory where update files are stored
UPDATES_DIR = Path("agent_updates")
UPDATES_CONFIG = UPDATES_DIR / "versions.json"

# Ensure directory exists
UPDATES_DIR.mkdir(exist_ok=True)

@router.get("/check")
async def check_for_updates(current_version: str, platform: str, request: Request):
    """
    Check if an update is available for the agent
    
    Args:
        current_version: Current version of the agent (e.g., "1.0.0")
        platform: Platform identifier (win32, linux, darwin)
    
    Returns:
        JSON with update information
    """
    try:
        if not UPDATES_CONFIG.exists():
            return {"update_available": False}
        
        with open(UPDATES_CONFIG) as f:
            versions = json.load(f)
        
        latest = versions.get(platform, {})
        latest_version = latest.get("version", "0.0.0")
        
        # Simple version comparison (assumes semantic versioning)
        def version_tuple(v):
            return tuple(map(int, v.split('.')))
        
        try:
            current = version_tuple(current_version)
            latest_v = version_tuple(latest_version)
            
            if latest_v > current:
                base_url = str(request.base_url).rstrip('/')
                return {
                    "update_available": True,
                    "latest_version": latest_version,
                    "download_url": f"{base_url}/api/agent/updates/download/{platform}/{latest_version}",
                    "checksum": latest.get("checksum"),
                    "release_notes": latest.get("release_notes", "Bug fixes and improvements")
                }
        except ValueError:
            # Invalid version format
            pass
        
        return {"update_available": False}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking for updates: {str(e)}")


@router.get("/download/{platform}/{version}")
async def download_update(platform: str, version: str):
    """
    Download update file for specific platform and version
    
    Args:
        platform: Platform identifier (win32, linux, darwin)
        version: Version to download (e.g., "1.0.1")
    
    Returns:
        File download response
    """
    # Map platform to file extension
    file_map = {
        "win32": f"DeployXAgent-Setup-{version}.exe",
        "linux": f"deployx-agent_{version}_amd64.deb",
        "darwin": f"DeployX-Agent-{version}.dmg"
    }
    
    filename = file_map.get(platform)
    if not filename:
        raise HTTPException(status_code=400, detail="Invalid platform")
    
    file_path = UPDATES_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Update file not found: {filename}")
    
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="application/octet-stream"
    )


@router.get("/versions")
async def get_all_versions():
    """Get all available versions for all platforms"""
    try:
        if not UPDATES_CONFIG.exists():
            return {}
        
        with open(UPDATES_CONFIG) as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
