"""Main entry point for DeployX agent."""
import asyncio
import argparse
import platform
import logging
from agent.core.connection import ConnectionManager
from agent.core.shell_manager import ShellManager
from agent.handlers.socket_handlers import SocketEventHandler
from agent.handlers.signal_handlers import setup_signal_handlers
from agent.utils.logging_config import setup_logging
from agent.utils.shell_detector import detect_shells
from agent.network.service_advertiser import ServiceAdvertiser
from agent.network.server_discoverer import ServiceDiscoverer
from agent.utils.machine_id import generate_agent_id

# Setup logging
logger = setup_logging()

async def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="DeployX Remote Command Execution Agent")
    parser.add_argument(
        "--server", 
        default="https://deployx-server.onrender.com",
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
    
    # Initialize components
    shell_manager = ShellManager()
    connection = ConnectionManager(args.server, args.agent_id)
    socket_handler = SocketEventHandler(shell_manager, connection)
    
    # Create a running flag for controlling the main loop
    running = asyncio.Event()
    running.set()  # Set it initially to True
    
    # Register socket event handlers
    for event, handler in socket_handler.get_handlers().items():
        connection.register_handler(event, handler)
    
    # Setup signal handlers for graceful shutdown
    setup_signal_handlers(connection.disconnect, running)
    
    # Start network services if requested
    advertiser = None
    if args.advertise:
        advertiser = ServiceAdvertiser()
        advertiser.start_advertising()
    
    try:
        # Connect to backend
        if await connection.connect():
            # Detect available shells
            shells = detect_shells()
            logger.info(f"Detected shells: {shells}")
            
            # Register agent with backend
            await connection.register_agent(shells)
            
            # Heartbeat interval (in seconds)
            heartbeat_interval = 30  # Send heartbeat every 30 seconds
            last_heartbeat = 0
            
            # Keep the agent running until running flag is cleared
            while running.is_set():
                try:
                    await asyncio.sleep(1)
                    
                    # Send periodic heartbeat
                    last_heartbeat += 1
                    if last_heartbeat >= heartbeat_interval:
                        await connection.send_heartbeat()
                        last_heartbeat = 0
                        
                except asyncio.CancelledError:
                    break
                
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
