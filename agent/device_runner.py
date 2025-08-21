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
        "connection_type": connection_type,  # Now always a string
        "last_seen": last_seen
    }
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
        "connection_type": connection_type,  # None when offline
        "last_seen": last_seen
    }

def send_device_info(info):
    """Send device info to backend"""
    print(f"Sending device info: {info}")
    try:
        resp = requests.post(API_URL, json=info, timeout=10)
        print(f"Response: {resp.status_code} {resp.text}")
        return resp.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False

def send_online_status():
    """Send online status"""
    info = get_device_info(status="online")
    return send_device_info(info)

def send_offline_status():
    """Send offline status"""
    info = get_device_info(status="offline", connection_type=None)
    return send_device_info(info)