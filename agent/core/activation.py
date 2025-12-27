"""Activation key management for DeployX agent."""
import os
import json
import logging
import aiohttp
from pathlib import Path
from typing import Optional, Tuple

logger = logging.getLogger(__name__)

# Config file path for storing activation status
CONFIG_DIR = Path.home() / ".deployx"
ACTIVATION_FILE = CONFIG_DIR / "activation.json"


def get_activation_config_path() -> Path:
    """Get the path to the activation config file."""
    return ACTIVATION_FILE


def ensure_config_dir():
    """Ensure the config directory exists."""
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)


def load_activation_data() -> dict:
    """Load activation data from config file."""
    try:
        if ACTIVATION_FILE.exists():
            with open(ACTIVATION_FILE, 'r') as f:
                return json.load(f)
    except Exception as e:
        logger.error(f"Failed to load activation data: {e}")
    return {}


def save_activation_data(data: dict):
    """Save activation data to config file."""
    try:
        ensure_config_dir()
        with open(ACTIVATION_FILE, 'w') as f:
            json.dump(data, f, indent=2)
        logger.info("Activation data saved successfully")
    except Exception as e:
        logger.error(f"Failed to save activation data: {e}")


def is_locally_activated(machine_id: str) -> Tuple[bool, Optional[str]]:
    """Check if the agent is activated based on local config.
    
    Returns:
        Tuple of (is_activated, expiry_date_string)
    """
    data = load_activation_data()
    
    if data.get('machine_id') == machine_id and data.get('activated'):
        return True, data.get('expires_at')
    
    return False, None


def save_local_activation(machine_id: str, agent_id: str, expires_at: str, key: str):
    """Save activation status locally."""
    save_activation_data({
        'machine_id': machine_id,
        'agent_id': agent_id,
        'activated': True,
        'expires_at': expires_at,
        'activation_key': key[:4] + '****' + key[-4:] if key else None  # Store masked key for reference
    })


def clear_local_activation():
    """Clear local activation data."""
    try:
        if ACTIVATION_FILE.exists():
            ACTIVATION_FILE.unlink()
            logger.info("Local activation data cleared")
    except Exception as e:
        logger.error(f"Failed to clear activation data: {e}")


async def check_server_activation(server_url: str, machine_id: str) -> Tuple[bool, Optional[str], str]:
    """Check activation status with the server.
    
    Returns:
        Tuple of (is_activated, expires_at, message)
    """
    try:
        async with aiohttp.ClientSession() as session:
            url = f"{server_url}/activation/check/{machine_id}"
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as response:
                if response.status == 200:
                    data = await response.json()
                    return data.get('valid', False), data.get('expires_at'), data.get('message', '')
                else:
                    logger.error(f"Server activation check failed: {response.status}")
                    return False, None, f"Server error: {response.status}"
    except aiohttp.ClientError as e:
        logger.error(f"Failed to connect to server for activation check: {e}")
        return False, None, f"Connection error: {e}"
    except Exception as e:
        logger.error(f"Unexpected error during activation check: {e}")
        return False, None, f"Error: {e}"


async def validate_activation_key(
    server_url: str,
    key: str,
    agent_id: str,
    machine_id: str
) -> Tuple[bool, str, Optional[str]]:
    """Validate an activation key with the server.
    
    Returns:
        Tuple of (is_valid, message, expires_at)
    """
    try:
        async with aiohttp.ClientSession() as session:
            url = f"{server_url}/activation/validate"
            payload = {
                'key': key.strip().upper(),
                'agent_id': agent_id,
                'machine_id': machine_id
            }
            
            async with session.post(
                url,
                json=payload,
                timeout=aiohttp.ClientTimeout(total=10)
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    is_valid = data.get('valid', False)
                    message = data.get('message', 'Unknown response')
                    expires_at = data.get('expires_at')
                    
                    if is_valid:
                        # Save activation locally
                        save_local_activation(machine_id, agent_id, expires_at, key)
                    
                    return is_valid, message, expires_at
                else:
                    error_data = await response.json() if response.content_type == 'application/json' else {}
                    return False, error_data.get('detail', f"Server error: {response.status}"), None
    except aiohttp.ClientError as e:
        logger.error(f"Failed to validate activation key: {e}")
        return False, f"Connection error: {e}", None
    except Exception as e:
        logger.error(f"Unexpected error during key validation: {e}")
        return False, f"Error: {e}", None


def prompt_for_activation_key() -> Optional[str]:
    """Prompt user for activation key via stdin (for CLI/service setup).
    
    This is used during initial setup or when activation is required.
    For a background service, this should be handled differently (via config file or env var).
    """
    key = os.environ.get('DEPLOYX_ACTIVATION_KEY')
    if key:
        logger.info("Using activation key from environment variable")
        return key.strip()
    
    # Try to read from config file
    config_path = CONFIG_DIR / "pending_activation.txt"
    if config_path.exists():
        try:
            with open(config_path, 'r') as f:
                key = f.read().strip()
            if key:
                logger.info("Using activation key from pending activation file")
                # Remove the file after reading
                config_path.unlink()
                return key
        except Exception as e:
            logger.error(f"Failed to read pending activation file: {e}")
    
    return None


def set_pending_activation_key(key: str):
    """Set a pending activation key (for service mode).
    
    This allows setting the key via an external tool before starting the service.
    """
    try:
        ensure_config_dir()
        config_path = CONFIG_DIR / "pending_activation.txt"
        with open(config_path, 'w') as f:
            f.write(key.strip())
        logger.info("Pending activation key saved")
        return True
    except Exception as e:
        logger.error(f"Failed to save pending activation key: {e}")
        return False


async def ensure_activated(
    server_url: str,
    agent_id: str,
    machine_id: str,
    activation_key: Optional[str] = None
) -> Tuple[bool, str]:
    """Ensure the agent is activated before proceeding.
    
    Args:
        server_url: Backend server URL
        agent_id: Agent's unique ID
        machine_id: Machine's unique ID
        activation_key: Optional activation key (can also come from env/file)
    
    Returns:
        Tuple of (is_activated, message)
    """
    # First, check local activation
    local_activated, local_expiry = is_locally_activated(machine_id)
    if local_activated:
        logger.info(f"Agent is locally activated (expires: {local_expiry})")
        
        # Verify with server
        server_activated, server_expiry, server_msg = await check_server_activation(server_url, machine_id)
        if server_activated:
            logger.info("Server confirmed activation status")
            return True, "Agent is activated"
        else:
            logger.warning(f"Server activation check failed: {server_msg}")
            # Local activation exists but server doesn't confirm - could be network issue
            # Allow operation based on local activation for resilience
            logger.info("Proceeding with local activation (offline mode)")
            return True, "Agent is activated (offline verification)"
    
    # Check server activation status
    server_activated, server_expiry, server_msg = await check_server_activation(server_url, machine_id)
    if server_activated:
        # Server says we're activated - save locally
        save_local_activation(machine_id, agent_id, server_expiry, "")
        return True, "Agent is activated"
    
    # Not activated - try to use provided key or get from env/file
    key_to_use = activation_key or prompt_for_activation_key()
    
    if not key_to_use:
        return False, "Activation required. Please provide an activation key."
    
    # Validate the key
    is_valid, message, expires_at = await validate_activation_key(
        server_url, key_to_use, agent_id, machine_id
    )
    
    if is_valid:
        logger.info(f"Activation successful! Expires: {expires_at}")
        return True, f"Activation successful. Expires: {expires_at}"
    else:
        logger.error(f"Activation failed: {message}")
        return False, f"Activation failed: {message}"
