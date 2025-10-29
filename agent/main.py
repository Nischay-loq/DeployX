"""Main entry point for DeployX agent."""
import asyncio
import argparse
import platform
import logging
import sys
import os
import signal
import atexit
import shutil
from typing import Callable, Dict

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agent.core.connection import ConnectionManager
from agent.core.shell_manager import ShellManager
from agent.core.command_executor import CommandExecutor
from agent.handlers.socket_handlers import SocketEventHandler
from agent.network.service_advertiser import ServiceAdvertiser
from agent.network.server_discoverer import ServiceDiscoverer
from agent.utils.machine_id import generate_agent_id

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logging.getLogger('engineio').setLevel(logging.WARNING)
logging.getLogger('socketio').setLevel(logging.WARNING)
logger = logging.getLogger(__name__)

def detect_shells() -> Dict[str, str]:
    """Detect available shells and their paths."""
    shells = {}
    system = platform.system().lower()
    possible_shells = ["cmd", "powershell", "pwsh", "bash"] if system == "windows" else \
                      ["bash", "zsh", "sh", "ksh", "tcsh", "fish"] if system == "darwin" else \
                      ["bash", "zsh", "sh", "fish", "ksh", "tcsh"]
    
    for shell in possible_shells:
        path = shutil.which(shell)
        if path:
            shells[shell] = path
    
    if not shells:
        default_shell = "cmd" if system == "windows" else "sh"
        default_path = shutil.which(default_shell)
        if default_path:
            shells[default_shell] = default_path
            logger.warning(f"No preferred shells found, falling back to {default_shell}")
        else:
            logger.error("No shells available on the system")
    return shells

def setup_signal_handlers(cleanup_callback: Callable, running_flag: asyncio.Event):
    """Setup signal handlers to prevent unwanted termination."""
    def signal_handler(signum, frame):
        signal_name = signal.Signals(signum).name
        logger.info(f"Received {signal_name} signal")
        running_flag.clear()
        try:
            sync_cleanup()
        except Exception as e:
            logger.error(f"Error during signal cleanup: {e}")
    
    def sync_cleanup():
        try:
            loop = asyncio.get_running_loop()
            if not loop.is_closed():
                loop.run_until_complete(cleanup_callback())
        except RuntimeError:
            try:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                loop.run_until_complete(cleanup_callback())
                loop.close()
            except Exception as e:
                logger.error(f"Failed to run cleanup in new event loop: {e}")
        except Exception as e:
            logger.error(f"Cleanup error: {e}")
    
    try:
        if platform.system().lower() == "windows":
            signal.signal(signal.SIGINT, signal_handler)
        else:
            signal.signal(signal.SIGINT, signal_handler)
            signal.signal(signal.SIGTERM, signal_handler)
        logger.info("Signal handlers registered successfully")
    except Exception as e:
        logger.warning(f"Signal handler setup failed: {e}")
    
    atexit.register(sync_cleanup)

async def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="DeployX Remote Command Execution Agent")
    parser.add_argument(
        "--server", 
        default="http://localhost:8000",
        help="Backend server URL"
    )
    parser.add_argument(
        "--agent-id",
        help="Custom agent ID (if not provided, will be generated from machine ID)"
    )
    parser.add_argument(
        "--advertise",
        action="store_true",
        help="Advertise agent on local network"
    )
    
    args = parser.parse_args()
    
    # Initialize core components
    shell_manager = ShellManager()
    connection = ConnectionManager(args.server, args.agent_id)
    command_executor = CommandExecutor(shell_manager, connection)
    socket_handler = SocketEventHandler(shell_manager, connection, command_executor)
    
    running = asyncio.Event()
    running.set()
    
    for event, handler in socket_handler.get_handlers().items():
        connection.register_handler(event, handler)
    
    setup_signal_handlers(connection.disconnect, running)
    
    advertiser = None
    if args.advertise:
        advertiser = ServiceAdvertiser()
        advertiser.start_advertising()
    
    try:
        retry_delay = 2
        retry_count = 0
        
        while running.is_set():
            logger.info(f"Attempting to connect to backend (attempt {retry_count + 1})...")
            
            if await connection.connect():
                logger.info("Successfully connected to backend")
                
                shells = detect_shells()
                logger.info(f"Detected shells: {shells}")
                
                if not shells:
                    logger.error("No shells detected")

                logger.info("Registering agent with backend")
                logger.info("Registering agent with backend...")
                registration_success = await connection.register_agent(shells)
                if registration_success:
                    logger.info("Agent registration successful")
                else:
                    logger.error("Agent registration failed")
                
                heartbeat_interval = 30  
                last_heartbeat = 0

                while running.is_set():
                    try:
                        await asyncio.sleep(1)

                        last_heartbeat += 1
                        if last_heartbeat >= heartbeat_interval:
                            await connection.send_heartbeat()
                            last_heartbeat = 0

                        if not connection.connected:
                            logger.warning("Connection lost, attempting to reconnect...")
                            break
                    except asyncio.CancelledError:
                        break
                
                if running.is_set() and not connection.connected:
                    logger.info("Connection lost, will retry...")
                    retry_count = 0
                    await asyncio.sleep(retry_delay)
                    continue
                else:
                    break
            else:
                retry_count += 1
                logger.warning(f"Failed to connect, retrying in {retry_delay} seconds... (attempt {retry_count})")
                await asyncio.sleep(retry_delay)
                retry_delay = min(retry_delay * 1.2, 10)
                
    except KeyboardInterrupt:
        logger.info("Received interrupt signal, shutting down...")
    except Exception as e:
        logger.error(f"Agent error: {e}")
    finally:
        logger.info("Cleaning up...")
        await connection.disconnect()
        if advertiser:
            advertiser.stop_advertising()
        logger.info("Shutdown complete")

if __name__ == "__main__":
    if platform.system().lower() == "windows":
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    
    try:
        import uvloop
        asyncio.set_event_loop_policy(uvloop.EventLoopPolicy())
    except ImportError:
        pass
    
    asyncio.run(main())
