"""Software installer for DeployX agent"""
import os
import platform
import subprocess
import asyncio
import logging
from typing import Optional, Dict, Callable
from pathlib import Path

logger = logging.getLogger(__name__)

class SoftwareInstaller:
    """Handles installation of downloaded software"""
    
    def __init__(self):
        """Initialize installer"""
        self.os_type = platform.system().lower()
        logger.info(f"Installer initialized for OS: {self.os_type}")
    
    async def install(
        self,
        filepath: str,
        install_command: Optional[str] = None,
        progress_callback: Optional[Callable] = None
    ) -> Dict[str, any]:
        """
        Install software from file
        
        Args:
            filepath: Path to downloaded software file
            install_command: Custom installation command
            progress_callback: Optional callback for progress updates
            
        Returns:
            Dictionary with installation result
        """
        try:
            logger.info(f"Starting installation: {filepath}")
            
            if progress_callback:
                await progress_callback(10)
            
            # Determine installation method
            if install_command:
                result = await self._execute_custom_command(filepath, install_command)
            else:
                result = await self._auto_install(filepath)
            
            if progress_callback:
                await progress_callback(100)
            
            return result
            
        except Exception as e:
            logger.error(f"Installation error: {e}")
            return {
                "success": False,
                "error": str(e),
                "output": ""
            }
    
    async def _auto_install(self, filepath: str) -> Dict[str, any]:
        """Auto-detect and install based on file extension"""
        filepath = Path(filepath)
        extension = filepath.suffix.lower()
        
        logger.info(f"Auto-installing {extension} file")
        
        if self.os_type == 'windows':
            if extension == '.exe':
                return await self._install_exe(filepath)
            elif extension == '.msi':
                return await self._install_msi(filepath)
            else:
                return {
                    "success": False,
                    "error": f"Unsupported file type: {extension}",
                    "output": ""
                }
        
        elif self.os_type == 'linux':
            if extension == '.deb':
                return await self._install_deb(filepath)
            elif extension == '.rpm':
                return await self._install_rpm(filepath)
            elif extension == '.sh':
                return await self._install_shell_script(filepath)
            else:
                return {
                    "success": False,
                    "error": f"Unsupported file type: {extension}",
                    "output": ""
                }
        
        elif self.os_type == 'darwin':  # macOS
            if extension == '.dmg':
                return await self._install_dmg(filepath)
            elif extension == '.pkg':
                return await self._install_pkg(filepath)
            else:
                return {
                    "success": False,
                    "error": f"Unsupported file type: {extension}",
                    "output": ""
                }
        
        return {
            "success": False,
            "error": f"Unsupported OS: {self.os_type}",
            "output": ""
        }
    
    async def _execute_custom_command(self, filepath: str, command: str) -> Dict[str, any]:
        """Execute custom installation command"""
        try:
            # Replace {file} placeholder with actual filepath
            command = command.replace('{file}', str(filepath))
            
            logger.info(f"Executing custom command: {command}")
            
            # Execute command
            process = await asyncio.create_subprocess_shell(
                command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            success = process.returncode == 0
            output = stdout.decode() + stderr.decode()
            
            logger.info(f"Command completed with return code: {process.returncode}")
            
            return {
                "success": success,
                "error": None if success else f"Exit code: {process.returncode}",
                "output": output
            }
            
        except Exception as e:
            logger.error(f"Error executing custom command: {e}")
            return {
                "success": False,
                "error": str(e),
                "output": ""
            }
    
    # Windows installers
    async def _install_exe(self, filepath: Path) -> Dict[str, any]:
        """Install .exe file (silent installation)"""
        command = f'"{filepath}" /S /silent /quiet /norestart'
        return await self._run_command(command)
    
    async def _install_msi(self, filepath: Path) -> Dict[str, any]:
        """Install .msi file (silent installation)"""
        command = f'msiexec /i "{filepath}" /quiet /norestart'
        return await self._run_command(command)
    
    # Linux installers
    async def _install_deb(self, filepath: Path) -> Dict[str, any]:
        """Install .deb package"""
        command = f'sudo dpkg -i "{filepath}"'
        return await self._run_command(command)
    
    async def _install_rpm(self, filepath: Path) -> Dict[str, any]:
        """Install .rpm package"""
        command = f'sudo rpm -i "{filepath}"'
        return await self._run_command(command)
    
    async def _install_shell_script(self, filepath: Path) -> Dict[str, any]:
        """Install via shell script"""
        # Make script executable
        os.chmod(filepath, 0o755)
        command = f'sudo bash "{filepath}"'
        return await self._run_command(command)
    
    # macOS installers
    async def _install_dmg(self, filepath: Path) -> Dict[str, any]:
        """Install .dmg file"""
        # This is a simplified version
        command = f'hdiutil attach "{filepath}"'
        return await self._run_command(command)
    
    async def _install_pkg(self, filepath: Path) -> Dict[str, any]:
        """Install .pkg file"""
        command = f'sudo installer -pkg "{filepath}" -target /'
        return await self._run_command(command)
    
    async def _run_command(self, command: str) -> Dict[str, any]:
        """Run installation command"""
        try:
            logger.info(f"Running: {command}")
            
            process = await asyncio.create_subprocess_shell(
                command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            success = process.returncode == 0
            output = stdout.decode() + stderr.decode()
            
            if success:
                logger.info("Installation completed successfully")
            else:
                logger.error(f"Installation failed with code {process.returncode}")
            
            return {
                "success": success,
                "error": None if success else f"Exit code: {process.returncode}",
                "output": output
            }
            
        except Exception as e:
            logger.error(f"Error running command: {e}")
            return {
                "success": False,
                "error": str(e),
                "output": ""
            }
