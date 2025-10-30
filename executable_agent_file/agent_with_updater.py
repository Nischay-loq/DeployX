"""
DeployX Agent with Auto-Update Support
This is a wrapper that adds auto-update functionality to the existing agent
"""

import sys
import os
import threading
import time
import logging
import asyncio

# Add parent directory to path to import agent
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from updater import AgentUpdater
from version import __version__

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('deployx-agent.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

class AgentWithAutoUpdate:
    def __init__(self):
        self.updater = AgentUpdater()
        self.update_check_interval = 3600  # Check every hour (3600 seconds)
        self.update_thread = None
        
    def start_update_checker(self):
        """Start background thread to check for updates"""
        def check_updates():
            # Wait 60 seconds before first check (let agent start first)
            time.sleep(60)
            
            while True:
                try:
                    logger.info("Running scheduled update check...")
                    self.updater.auto_update()
                except Exception as e:
                    logger.error(f"Update check failed: {e}")
                
                # Wait for next check
                time.sleep(self.update_check_interval)
        
        self.update_thread = threading.Thread(target=check_updates, daemon=True)
        self.update_thread.start()
        logger.info(f"Auto-update checker started (checks every {self.update_check_interval/60} minutes)")

def main():
    """Main entry point for the agent"""
    logger.info(f"Starting DeployX Agent v{__version__}")
    
    # Initialize auto-updater
    agent_updater = AgentWithAutoUpdate()
    agent_updater.start_update_checker()
    
    try:
        # Import and run the actual agent
        from agent.main import main as agent_main
        asyncio.run(agent_main())
    except KeyboardInterrupt:
        logger.info("Agent stopped by user")
    except Exception as e:
        logger.error(f"Agent crashed: {e}", exc_info=True)
        sys.exit(1)

if __name__ == "__main__":
    main()
