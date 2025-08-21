import requests
import socket
import platform
import uuid

def get_device_info():
    hostname = socket.gethostname()
    try:
        ip_address = socket.gethostbyname(hostname)
    except Exception:
        ip_address = "Unknown"
    mac_address = ':'.join(['{:02x}'.format((uuid.getnode() >> ele) & 0xff)
                            for ele in range(0,8*6,8)][::-1])
    os_name = platform.system()
    os_version = platform.version()
    connection_type = "WiFi"  # or "LAN"
    return {
        "device_name": hostname,
        "ip_address": ip_address,
        "mac_address": mac_address,
        "os": f"{os_name} {os_version}",
        "status": "online",
        "connection_type": connection_type
    }

def Device_Registration():
    info = get_device_info()
    print("Sending device info:", info)
    api_url = "https://deployx-server.onrender.com/devices/"
    try:
        resp = requests.post(api_url, json=info)
        print("Response:", resp.status_code, resp.text)
    except Exception as e:
        print("Error:", e)

Device_Registration()