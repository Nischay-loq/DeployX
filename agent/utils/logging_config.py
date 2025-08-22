"""Logging configuration for DeployX agent."""
import logging
import sys

def setup_logging(level=logging.INFO):
    """Configure logging for the agent.
    
    Args:
        level: Logging level to use (default: INFO)
    """
    logging.basicConfig(
        level=level,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler('agent.log')
        ]
    )
    
    # Suppress verbose logging from libraries
    logging.getLogger('engineio').setLevel(logging.WARNING)
    logging.getLogger('socketio').setLevel(logging.WARNING)
    
    return logging.getLogger(__name__)
