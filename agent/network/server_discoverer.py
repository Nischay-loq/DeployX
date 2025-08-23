"""Service discovery for DeployX agent."""
from zeroconf import Zeroconf, ServiceBrowser, ServiceListener
import logging
import time
from typing import Optional, List, Dict

logger = logging.getLogger(__name__)

class DeployXServiceListener(ServiceListener):
    def __init__(self):
        self.discovered_services: List[Dict] = []
        
    def add_service(self, zeroconf: Zeroconf, type_: str, name: str):
        """Handle discovered service."""
        info = zeroconf.get_service_info(type_, name)
        if info:
            service = {
                'name': info.name,
                'ip': info.parsed_addresses()[0],
                'port': info.port,
                'properties': {
                    k.decode(): v.decode() 
                    for k, v in info.properties.items()
                }
            }
            self.discovered_services.append(service)
            logger.info(f"[FOUND] {service['name']} @ {service['ip']}:{service['port']}")

    def remove_service(self, zeroconf: Zeroconf, type_: str, name: str):
        """Handle removed service."""
        logger.info(f"Service {name} removed")

    def update_service(self, zeroconf: Zeroconf, type_: str, name: str):
        """Handle updated service."""
        logger.info(f"Service {name} updated")


class ServiceDiscoverer:
    def __init__(self):
        self.zeroconf = Zeroconf()
        self.browser = None
        self.listener = DeployXServiceListener()

    def start_discovery(self, service_type: str = "_http._tcp.local."):
        """Start discovering services.
        
        Args:
            service_type: The type of service to discover
        """
        logger.info(f"Starting service discovery for {service_type}")
        self.browser = ServiceBrowser(self.zeroconf, service_type, self.listener)

    def stop_discovery(self):
        """Stop service discovery."""
        if self.zeroconf:
            self.zeroconf.close()
            logger.info("Service discovery stopped")

    def get_discovered_services(self) -> List[Dict]:
        """Get list of discovered services.
        
        Returns:
            List of discovered services
        """
        return self.listener.discovered_services
