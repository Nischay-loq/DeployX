"""Auto-updater module for DeployX Agent"""

import os
import sys
import requests
import subprocess
import tempfile
import hashlib
import logging
from pathlib import Path
from version import __version__, UPDATE_SERVER_URL

logger = logging.getLogger(__name__)

class AgentUpdater:
    def __init__(self):
        self.current_version = __version__
        self.update_url = UPDATE_SERVER_URL
        self.platform = sys.platform
        
    def check_for_updates(self):
        """Check if a new version is available"""
        try:
            response = requests.get(
                f"{self.update_url}/check",
                params={
                    "current_version": self.current_version,
                    "platform": self.platform
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("update_available"):
                    return {
                        "available": True,
                        "version": data.get("latest_version"),
                        "download_url": data.get("download_url"),
                        "checksum": data.get("checksum"),
                        "release_notes": data.get("release_notes")
                    }
            return {"available": False}
        except Exception as e:
            logger.error(f"Error checking for updates: {e}")
            return {"available": False}
    
    def download_update(self, download_url, checksum):
        """Download the update file"""
        try:
            logger.info(f"Downloading update from {download_url}")
            
            # Create temp directory
            temp_dir = tempfile.mkdtemp()
            filename = os.path.basename(download_url)
            temp_file = os.path.join(temp_dir, filename)
            
            # Download with progress
            response = requests.get(download_url, stream=True)
            total_size = int(response.headers.get('content-length', 0))
            
            with open(temp_file, 'wb') as f:
                downloaded = 0
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
                        downloaded += len(chunk)
                        if total_size > 0:
                            progress = (downloaded / total_size) * 100
                            logger.info(f"Download progress: {progress:.1f}%")
            
            # Verify checksum
            if not self.verify_checksum(temp_file, checksum):
                logger.error("Checksum verification failed!")
                os.remove(temp_file)
                return None
            
            logger.info("Update downloaded and verified successfully")
            return temp_file
            
        except Exception as e:
            logger.error(f"Error downloading update: {e}")
            return None
    
    def verify_checksum(self, file_path, expected_checksum):
        """Verify file integrity using SHA256"""
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        
        calculated_checksum = sha256_hash.hexdigest()
        return calculated_checksum == expected_checksum
    
    def install_update(self, update_file):
        """Install the downloaded update"""
        try:
            if sys.platform == "win32":
                return self._install_windows(update_file)
            elif sys.platform == "darwin":
                return self._install_macos(update_file)
            else:  # Linux
                return self._install_linux(update_file)
        except Exception as e:
            logger.error(f"Error installing update: {e}")
            return False
    
    def _install_windows(self, update_file):
        """Install update on Windows"""
        # Run the installer silently and exit current process
        subprocess.Popen([update_file, '/VERYSILENT', '/RESTARTAPPLICATIONS'])
        logger.info("Starting Windows installer...")
        sys.exit(0)
    
    def _install_macos(self, update_file):
        """Install update on macOS"""
        # Mount DMG and copy app
        subprocess.run(['hdiutil', 'attach', update_file])
        # Copy to Applications and restart
        subprocess.Popen(['open', '/Volumes/DeployX Agent/DeployX Agent.app'])
        logger.info("Starting macOS installer...")
        sys.exit(0)
    
    def _install_linux(self, update_file):
        """Install update on Linux"""
        if update_file.endswith('.deb'):
            subprocess.run(['sudo', 'dpkg', '-i', update_file])
        elif update_file.endswith('.rpm'):
            subprocess.run(['sudo', 'rpm', '-U', update_file])
        
        # Restart service
        subprocess.run(['sudo', 'systemctl', 'restart', 'deployx-agent'])
        logger.info("Starting Linux package installer...")
        sys.exit(0)
    
    def auto_update(self):
        """Check and install updates automatically"""
        logger.info("Checking for updates...")
        update_info = self.check_for_updates()
        
        if update_info["available"]:
            logger.info(f"New version available: {update_info['version']}")
            logger.info(f"Release notes: {update_info['release_notes']}")
            
            update_file = self.download_update(
                update_info["download_url"],
                update_info["checksum"]
            )
            
            if update_file:
                logger.info("Installing update...")
                return self.install_update(update_file)
        else:
            logger.info("Agent is up to date")
        
        return False
