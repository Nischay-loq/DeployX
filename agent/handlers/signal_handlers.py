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
        cleanup_callback: Async function to call for cleanup before exit
        running_flag: Event to control the main loop
    """
    def signal_handler(signum, frame):
        """Handle interrupt signals."""
        signal_name = signal.Signals(signum).name
        logger.info(f"Received {signal_name} signal")
        
        # Clear the running flag to stop the main loop
        running_flag.clear()
        
        # Run cleanup synchronously to ensure it happens
        try:
            sync_cleanup()
        except Exception as e:
            logger.error(f"Error during signal cleanup: {e}")

    def sync_cleanup():
        """Synchronous cleanup wrapper."""
        try:
            loop = asyncio.get_running_loop()
            if not loop.is_closed():
                loop.run_until_complete(cleanup_callback())
        except RuntimeError:
            # No event loop running, create a new one
            try:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                loop.run_until_complete(cleanup_callback())
                loop.close()
            except Exception as e:
                logger.error(f"Failed to run cleanup in new event loop: {e}")
        except Exception as e:
            logger.error(f"Cleanup error: {e}")
        
    # Register the signal handler
    try:
        if platform.system().lower() == "windows":
            # On Windows, only SIGINT is reliably supported
            signal.signal(signal.SIGINT, signal_handler)
        else:
            # On Unix systems, we can handle both SIGINT and SIGTERM
            signal.signal(signal.SIGINT, signal_handler)
            signal.signal(signal.SIGTERM, signal_handler)
            
        logger.info("Signal handlers registered successfully")
    except Exception as e:
        logger.warning(f"Signal handler setup failed: {e}")
    
    # Register cleanup on exit - this works on all platforms
    atexit.register(sync_cleanup)
