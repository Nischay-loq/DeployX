"""Software downloader for DeployX agent"""
import os
import asyncio
import aiohttp
import hashlib
import logging
from pathlib import Path
from typing import Optional, Callable

logger = logging.getLogger(__name__)

class SoftwareDownloader:
    """Handles downloading software packages"""
    
    def __init__(self, download_dir: str = None):
        """
        Initialize downloader
        
        Args:
            download_dir: Directory to download software to
        """
        if download_dir is None:
            # Use system temp directory
            if os.name == 'nt':  # Windows
                download_dir = os.path.join(os.environ.get('TEMP', 'C:\\Temp'), 'DeployX')
            else:  # Linux/Mac
                download_dir = '/tmp/deployx'
        
        self.download_dir = Path(download_dir)
        self.download_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"Download directory: {self.download_dir}")
    
    async def download(
        self,
        url: str,
        filename: Optional[str] = None,
        checksum: Optional[str] = None,
        progress_callback: Optional[Callable] = None
    ) -> Optional[str]:
        """
        Download a file from URL
        
        Args:
            url: Download URL
            filename: Optional filename (extracted from URL if not provided)
            checksum: Optional SHA-256 checksum for verification
            progress_callback: Optional callback for progress updates (percent)
            
        Returns:
            Path to downloaded file or None if failed
        """
        try:
            if not filename:
                filename = url.split('/')[-1]
                if not filename:
                    filename = f"software_{hashlib.md5(url.encode()).hexdigest()[:8]}"
            
            filepath = self.download_dir / filename
            
            logger.info(f"Starting download: {url}")
            logger.info(f"Destination: {filepath}")
            
            # Add timeout to prevent hanging
            timeout = aiohttp.ClientTimeout(total=300)  # 5 minutes timeout
            
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.get(url) as response:
                    if response.status != 200:
                        logger.error(f"Download failed with status {response.status}")
                        logger.error(f"Response: {await response.text()}")
                        return None
                    
                    total_size = int(response.headers.get('content-length', 0))
                    downloaded = 0
                    
                    with open(filepath, 'wb') as f:
                        async for chunk in response.content.iter_chunked(8192):
                            f.write(chunk)
                            downloaded += len(chunk)
                            
                            if total_size > 0 and progress_callback:
                                percent = int((downloaded / total_size) * 100)
                                await progress_callback(percent)
            
            logger.info(f"Download completed: {filepath}")
            
            # Verify checksum if provided
            if checksum:
                if not await self._verify_checksum(filepath, checksum):
                    logger.error("Checksum verification failed")
                    filepath.unlink()  # Delete corrupted file
                    return None
                logger.info("Checksum verified successfully")
            
            return str(filepath)
            
        except aiohttp.ClientError as e:
            logger.error(f"Network error downloading file: {e}")
            return None
        except asyncio.TimeoutError:
            logger.error(f"Download timed out for: {url}")
            return None
        except Exception as e:
            logger.error(f"Error downloading file: {e}")
            logger.exception(e)
            return None
    
    async def _verify_checksum(self, filepath: Path, expected_checksum: str) -> bool:
        """Verify file checksum"""
        try:
            sha256 = hashlib.sha256()
            with open(filepath, 'rb') as f:
                while chunk := f.read(8192):
                    sha256.update(chunk)
            
            actual_checksum = sha256.hexdigest()
            return actual_checksum.lower() == expected_checksum.lower()
            
        except Exception as e:
            logger.error(f"Error verifying checksum: {e}")
            return False
    
    def cleanup(self, keep_files: bool = False):
        """
        Clean up downloaded files
        
        Args:
            keep_files: If True, keep downloaded files for manual inspection
        """
        if keep_files:
            logger.info(f"Keeping downloaded files in: {self.download_dir}")
            return
            
        try:
            for file in self.download_dir.glob('*'):
                if file.is_file():
                    file.unlink()
            logger.info("Cleanup completed")
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")
