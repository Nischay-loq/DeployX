"""Shell detection utilities for DeployX agent."""
import platform
import shutil
import logging
from typing import Dict

logger = logging.getLogger(__name__)

def detect_shells() -> Dict[str, str]:
    """Detect available shells and their paths.
    
    Returns:
        Dictionary mapping shell names to their executable paths
    """
    shells = {}
    system = platform.system().lower()

    if system == "windows":
        possible_shells = ["cmd", "powershell", "pwsh", "bash"]
    elif system == "darwin":  # macOS
        possible_shells = ["bash", "zsh", "sh", "ksh", "tcsh", "fish"]
    else:  # Linux / Unix
        possible_shells = ["bash", "zsh", "sh", "fish", "ksh", "tcsh"]

    for shell in possible_shells:
        path = shutil.which(shell)
        if path:
            shells[shell] = path

    # Fallback: ensure at least one shell is available
    if not shells:
        default_shell = "cmd" if system == "windows" else "sh"
        default_path = shutil.which(default_shell)
        if default_path:
            shells[default_shell] = default_path
            logger.warning(f"No preferred shells found, falling back to {default_shell}")
        else:
            logger.error("No shells available on the system")

    return shells
