"""System information gathering for DeployX agent."""
import socket
import platform
import psutil
from datetime import datetime
from typing import Dict, Any

def get_system_info() -> Dict[str, Any]:
    """Get comprehensive system information.
    
    Returns:
        Dictionary containing system information
    """
    try:
        return {
            "hostname": socket.gethostname(),
            "system": platform.system(),
            "version": platform.version(),
            "release": platform.release(),
            "machine": platform.machine(),
            "processor": platform.processor(),
            "architecture": platform.architecture()[0],

            "cpu_physical_cores": psutil.cpu_count(logical=False),
            "cpu_total_cores": psutil.cpu_count(logical=True),
            "cpu_max_freq": psutil.cpu_freq().max,
            "cpu_min_freq": psutil.cpu_freq().min,
            "cpu_current_freq": psutil.cpu_freq().current,
            "cpu_usage": psutil.cpu_percent(interval=1),

            "memory_total": round(psutil.virtual_memory().total / (1024 ** 3), 2),
            "memory_available": round(psutil.virtual_memory().available / (1024 ** 3), 2),
            "memory_used": round(psutil.virtual_memory().used / (1024 ** 3), 2),
            "memory_usage_percent": psutil.virtual_memory().percent,

            "disk_total": round(psutil.disk_usage('/').total / (1024 ** 3), 2),
            "disk_used": round(psutil.disk_usage('/').used / (1024 ** 3), 2),
            "disk_free": round(psutil.disk_usage('/').free / (1024 ** 3), 2),
            "disk_usage_percent": psutil.disk_usage('/').percent,

            "ip_address": socket.gethostbyname(socket.gethostname()),
            "bytes_sent": psutil.net_io_counters().bytes_sent,
            "bytes_received": psutil.net_io_counters().bytes_recv,

            "users_count": len(psutil.users()),
            "logged_in_users": ", ".join([user.name for user in psutil.users()]),

            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
    except Exception as e:
        return {
            "error": f"Failed to gather system information: {str(e)}",
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
