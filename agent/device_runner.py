# agent/device_runner.py
import requests
import socket
import platform
import psutil
from datetime import datetime
import pytz

API_URL = "https://deployx-server.onrender.com/devices/"

def get_device_info(status="online", connection_type=None):
    """Get device information"""
    hostname = platform.node()
    os_name = platform.system()
    os_release = platform.release()
    os_version = platform.version()
    os_info = f"{os_name} {os_release} ({os_version})"

    # Get IP address
    ip_address = "Unknown"
    for iface, addrs in psutil.net_if_addrs().items():
        for addr in addrs:
            if addr.family == socket.AF_INET and not addr.address.startswith("127."):
                ip_address = addr.address
                break
        if ip_address != "Unknown":
            break

    # Get MAC address
    mac_address = "Unknown"
    for iface, addrs in psutil.net_if_addrs().items():
        for addr in addrs:
            if addr.family == psutil.AF_LINK and addr.address != "00:00:00:00:00:00":
                mac_address = addr.address
                break
        if mac_address != "Unknown":
            break

    # Detect connection type only when online
    if connection_type is None and status == "online":
        connection_type = "Unknown"
        for iface in psutil.net_if_stats():
            if psutil.net_if_stats()[iface].isup:
                if "wi" in iface.lower() or "wlan" in iface.lower():
                    connection_type = "WiFi"
                    break
                elif "eth" in iface.lower() or "lan" in iface.lower():
                    connection_type = "LAN"
                    break
    
    # If connection_type is still None (offline case), set to "None" string
    if connection_type is None:
        connection_type = "None"

    # Get IST time
    ist = pytz.timezone('Asia/Kolkata')
    ist_time = datetime.now(ist)
    last_seen = ist_time.isoformat()

    return {
        "device_name": hostname,
        "ip_address": ip_address,
        "mac_address": mac_address,
        "os": os_info,
        "status": status,
        "connection_type": connection_type,
        "last_seen": last_seen
    }

# Send online status
def send_online_status():
    info = get_device_info(status="online")
    try:
        resp = requests.post(API_URL, json=info, timeout=10)
        print(f"Online status sent: {resp.status_code} {resp.text}")
        return resp.status_code == 200
    except Exception as e:
        print("Error sending online status:", e)
        return False

# Send offline status
def send_offline_status():
    info = get_device_info(status="offline")
    try:
        resp = requests.post(API_URL, json=info, timeout=10)
        print(f"Offline status sent: {resp.status_code} {resp.text}")
        return resp.status_code == 200
    except Exception as e:
        print("Error sending offline status:", e)
        return False

def main():
    info = get_device_info()
    print("Sending device info:", info)
    api_url = "https://deployx-server.onrender.com/devices/"
    try:
        resp = requests.post(API_URL, json=info, timeout=10)
        print(f"Response: {resp.status_code} {resp.text}")
        return resp.status_code == 200
    except Exception as e:
        print("Error:", e)

main()