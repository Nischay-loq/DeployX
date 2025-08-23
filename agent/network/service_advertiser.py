"""Service advertising for DeployX agent."""
from zeroconf import ServiceInfo, Zeroconf
import socket
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

class ServiceAdvertiser:
    def __init__(self):
        self.zeroconf = Zeroconf()
        self.service_info = None

    def get_local_ip(self) -> str:
        """Get the local IP address of the machine.
        
        Returns:
            Local IP address as string
        """
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            # Doesn't need to actually connect
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
        except Exception:
            ip = "127.0.0.1"
        finally:
            s.close()
        return ip

    def start_advertising(self, service_type: str = "_http._tcp.local.", 
                         service_name: str = "DeployX Node",
                         port: int = 8000,
                         properties: Dict[str, Any] = None):
        """Start advertising the service.
        
        Args:
            service_type: The type of service to advertise
            service_name: Name of the service
            port: Port number the service runs on
            properties: Additional service properties
        """
        try:
            ip = self.get_local_ip()
            
            self.service_info = ServiceInfo(
                service_type,
                f"{service_name}.{service_type}",
                addresses=[socket.inet_aton(ip)],
                port=port,
                properties=properties or {"role": "client"},
                server=f"{service_name.lower()}.local."
            )

            self.zeroconf.register_service(self.service_info)
            logger.info(f"✅ {service_name} advertised at {ip}:{port}")
            return True
        except Exception as e:
            logger.error(f"Failed to start advertising: {e}")
            return False

    def stop_advertising(self):
        """Stop advertising the service."""
        try:
            if self.service_info:
                self.zeroconf.unregister_service(self.service_info)
            self.zeroconf.close()
            logger.info("Service advertising stopped")
            return True
        except Exception as e:
            logger.error(f"Failed to stop advertising: {e}")
            return False
