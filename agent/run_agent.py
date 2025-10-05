"""Run the agent with proper Python path setup"""
import sys
import os

# Add parent directory to path so 'agent' module can be imported
parent_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, parent_dir)

# Now import and run main
from main import main
import asyncio
import platform

if __name__ == "__main__":
    if platform.system().lower() == "windows":
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    
    try:
        import uvloop
        asyncio.set_event_loop_policy(uvloop.EventLoopPolicy())
    except ImportError:
        pass
    
    asyncio.run(main())
