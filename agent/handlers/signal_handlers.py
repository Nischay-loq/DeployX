"""System signal handlers for DeployX agent."""
import signal
import logging
import atexit
import platform
import asyncio
from typing import Callable

logger = logging.getLogger(__name__)

def setup_signal_handlers(cleanup_callback: Callable, running_flag: asyncio.Event):
    """Setup signal handlers to prevent unwanted termination.
    
    Args:
        cleanup_callback: Function to call for cleanup before exit
        running_flag: Event to control the main loop
    """
    def signal_handler(signum, frame):
        """Handle interrupt signals."""
        signal_name = signal.Signals(signum).name
        logger.info(f"Received {signal_name} signal")
        running_flag.clear()  # Clear the running flag to stop the main loop
        
    # Register the signal handler
    try:
        if platform.system().lower() == "windows":
            # On Windows, only SIGINT is reliably supported
            signal.signal(signal.SIGINT, signal_handler)
        else:
            # On Unix systems, we can handle both SIGINT and SIGTERM
            signal.signal(signal.SIGINT, signal_handler)
            signal.signal(signal.SIGTERM, signal_handler)
    except Exception as e:
        logger.warning(f"Signal handler setup failed: {e}")
    
    # Register cleanup on exit - this works on all platforms
    atexit.register(cleanup_callback)
