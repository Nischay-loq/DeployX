from zeroconf import Zeroconf, ServiceBrowser, ServiceListener
import time

class DeployXListener(ServiceListener):
    def add_service(self, zeroconf, type, name):
        info = zeroconf.get_service_info(type, name)
        if info:
            ip = info.parsed_addresses()[0]
            port = info.port
            props = {k.decode(): v.decode() for k, v in info.properties.items()}
            print(f"[FOUND] {info.name} @ {ip}:{port} | Metadata: {props}")

print("🔍 Scanning for DeployX Nodes on Wi-Fi...")
zeroconf = Zeroconf()
browser = ServiceBrowser(zeroconf, "_http._tcp.local.", DeployXListener())

try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    print("Stopping scan...")
    zeroconf.close()
