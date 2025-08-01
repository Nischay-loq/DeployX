from zeroconf import ServiceInfo, Zeroconf
import socket
import time

def get_local_ip():
    """Get the local IP address of the machine."""
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

# Step 1: Get IP address
ip = get_local_ip()

# Step 2: Define service info
info = ServiceInfo(
    "_http._tcp.local.",                             # Zeroconf service type
    "DeployX Node._http._tcp.local.",                # Unique name
    addresses=[socket.inet_aton(ip)],                # IP in byte format
    port=8000,                                       # Example service port
    properties={"role": "client"},                   # Custom metadata
    server="deployx-node.local."                     # Hostname
)

# Step 3: Register the service on the network
zeroconf = Zeroconf()
zeroconf.register_service(info)
print(f"✅ DeployX Node advertised at {ip}:8000")

# Step 4: Keep service running
try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    print("\n🛑 Shutting down DeployX node...")
    zeroconf.unregister_service(info)
    zeroconf.close()