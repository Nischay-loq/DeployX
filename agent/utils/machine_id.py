"""Generate unique machine-based agent IDs using OS-provided identifiers."""
import uuid
import platform
import hashlib
import subprocess
import logging
from typing import Optional

logger = logging.getLogger(__name__)

def get_machine_id() -> str:
    """Generate a unique machine identifier based on hardware characteristics.
    
    This function attempts to use OS-specific unique identifiers:
    - Windows: Uses WMIC to get UUID from computer system
    - Linux: Uses /etc/machine-id or /var/lib/dbus/machine-id
    - macOS: Uses IOPlatformUUID
    - Fallback: Uses MAC address and hostname combination
    
    Returns:
        str: A unique identifier for this machine
    """
    system = platform.system().lower()
    
    try:
        if system == "windows":
            return _get_windows_machine_id()
        elif system == "linux":
            return _get_linux_machine_id()
        elif system == "darwin":  # macOS
            return _get_macos_machine_id()
        else:
            logger.warning(f"Unknown system {system}, using fallback method")
            return _get_fallback_machine_id()
    except Exception as e:
        logger.error(f"Error getting machine ID: {e}, using fallback")
        return _get_fallback_machine_id()

def _get_windows_machine_id() -> str:
    """Get Windows machine UUID using WMIC."""
    try:
        # Try to get the computer system UUID
        result = subprocess.run(
            ["wmic", "csproduct", "get", "UUID", "/value"],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0:
            for line in result.stdout.strip().split('\n'):
                if line.startswith('UUID='):
                    uuid_str = line.split('=', 1)[1].strip()
                    if uuid_str and uuid_str.lower() != 'ffffffff-ffff-ffff-ffff-ffffffffffff':
                        return uuid_str.lower()
        
        # Fallback: Try motherboard serial number
        result = subprocess.run(
            ["wmic", "baseboard", "get", "serialnumber", "/value"],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0:
            for line in result.stdout.strip().split('\n'):
                if line.startswith('SerialNumber='):
                    serial = line.split('=', 1)[1].strip()
                    if serial and serial != 'To be filled by O.E.M.':
                        # Create UUID from serial number
                        return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"windows-{serial}"))
                        
    except (subprocess.TimeoutExpired, subprocess.SubprocessError, FileNotFoundError) as e:
        logger.warning(f"Windows WMIC command failed: {e}")
    
    return _get_fallback_machine_id()

def _get_linux_machine_id() -> str:
    """Get Linux machine ID from system files."""
    machine_id_paths = [
        "/etc/machine-id",
        "/var/lib/dbus/machine-id"
    ]
    
    for path in machine_id_paths:
        try:
            with open(path, 'r') as f:
                machine_id = f.read().strip()
                if machine_id and len(machine_id) >= 32:
                    # Convert to UUID format
                    return str(uuid.UUID(machine_id))
        except (FileNotFoundError, ValueError, PermissionError):
            continue
    
    # Try DMI product UUID
    try:
        with open("/sys/class/dmi/id/product_uuid", 'r') as f:
            product_uuid = f.read().strip()
            if product_uuid:
                return product_uuid.lower()
    except (FileNotFoundError, PermissionError):
        pass
    
    return _get_fallback_machine_id()

def _get_macos_machine_id() -> str:
    """Get macOS machine UUID using system_profiler."""
    try:
        # Try to get hardware UUID
        result = subprocess.run(
            ["system_profiler", "SPHardwareDataType"],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0:
            for line in result.stdout.split('\n'):
                if 'Hardware UUID' in line:
                    uuid_str = line.split(':', 1)[1].strip()
                    if uuid_str:
                        return uuid_str.lower()
        
        # Fallback: Try IOPlatformUUID
        result = subprocess.run(
            ["ioreg", "-rd1", "-c", "IOPlatformExpertDevice"],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0:
            for line in result.stdout.split('\n'):
                if 'IOPlatformUUID' in line:
                    # Extract UUID from the line
                    parts = line.split('"')
                    if len(parts) >= 4:
                        return parts[3].lower()
                        
    except (subprocess.TimeoutExpired, subprocess.SubprocessError, FileNotFoundError) as e:
        logger.warning(f"macOS system command failed: {e}")
    
    return _get_fallback_machine_id()

def _get_fallback_machine_id() -> str:
    """Generate machine ID using available system information as fallback."""
    try:
        # Combine hostname and MAC address
        hostname = platform.node()
        
        # Get MAC address
        mac = hex(uuid.getnode())[2:].upper()
        mac_formatted = ':'.join([mac[i:i+2] for i in range(0, 12, 2)])
        
        # Combine with system info
        system_info = f"{hostname}-{mac_formatted}-{platform.system()}-{platform.machine()}"
        
        # Create deterministic UUID
        return str(uuid.uuid5(uuid.NAMESPACE_DNS, system_info))
        
    except Exception as e:
        logger.error(f"Fallback machine ID generation failed: {e}")
        # Last resort: random UUID (not deterministic but unique)
        return str(uuid.uuid4())

def generate_agent_id(prefix: str = "agent") -> str:
    """Generate a unique agent ID using machine identifier.
    
    Args:
        prefix: Prefix for the agent ID (default: "agent")
        
    Returns:
        str: Unique agent ID in format: prefix_<machine_id>
    """
    machine_id = get_machine_id()
    
    # Shorten the machine ID for readability while maintaining uniqueness
    # Take first 8 characters of the hash
    short_id = hashlib.sha256(machine_id.encode()).hexdigest()[:8]
    
    agent_id = f"{prefix}_{short_id}"
    logger.info(f"Generated agent ID: {agent_id} (from machine ID: {machine_id})")
    
    return agent_id

def get_system_info() -> dict:
    """Get comprehensive system information for agent registration.
    
    Returns:
        dict: System information including OS, hostname, architecture, etc.
    """
    try:
        import psutil
        import socket
        
        # Get memory info
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # Get IP address
        ip_address = "0.0.0.0"
        try:
            # Try to get the actual IP address by connecting to an external server
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip_address = s.getsockname()[0]
            s.close()
        except Exception:
            try:
                # Fallback: get hostname IP
                ip_address = socket.gethostbyname(socket.gethostname())
            except Exception:
                ip_address = "0.0.0.0"
        
        return {
            "hostname": platform.node(),
            "os": platform.system(),
            "os_version": platform.version(),
            "os_release": platform.release(),
            "architecture": platform.machine(),
            "processor": platform.processor(),
            "python_version": platform.python_version(),
            "cpu_count": psutil.cpu_count(),
            "memory_total": memory.total,
            "memory_available": memory.available,
            "disk_total": disk.total,
            "disk_free": disk.free,
            "machine_id": get_machine_id(),
            "ip_address": ip_address
        }
    except ImportError:
        # Fallback without psutil
        import socket
        
        # Get IP address
        ip_address = "0.0.0.0"
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip_address = s.getsockname()[0]
            s.close()
        except Exception:
            try:
                ip_address = socket.gethostbyname(socket.gethostname())
            except Exception:
                ip_address = "0.0.0.0"
        
        return {
            "hostname": platform.node(),
            "os": platform.system(),
            "os_version": platform.version(),
            "os_release": platform.release(),
            "architecture": platform.machine(),
            "processor": platform.processor(),
            "python_version": platform.python_version(),
            "machine_id": get_machine_id(),
            "ip_address": ip_address
        }
    except Exception as e:
        logger.error(f"Error getting system info: {e}")
        return {
            "hostname": platform.node(),
            "os": platform.system(),
            "machine_id": get_machine_id(),
            "ip_address": "0.0.0.0",
            "error": str(e)
        }

if __name__ == "__main__":
    # Test the functions
    import sys
    
    logging.basicConfig(level=logging.INFO)
    
    print("Machine ID:", get_machine_id())
    print("Agent ID:", generate_agent_id())
    print("System Info:", get_system_info())