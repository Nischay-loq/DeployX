# import winreg

# def get_installed_software(root, subkey):
#     software_list = []
#     try:
#         key = winreg.OpenKey(root, subkey)
#         for i in range(0, winreg.QueryInfoKey(key)[0]):
#             try:
#                 sk = winreg.EnumKey(key, i)
#                 sk_path = subkey + "\\" + sk
#                 sk_key = winreg.OpenKey(root, sk_path)
#                 name, _ = winreg.QueryValueEx(sk_key, "DisplayName")
#                 try:
#                     version, _ = winreg.QueryValueEx(sk_key, "DisplayVersion")
#                 except FileNotFoundError:
#                     version = "Unknown"
#                 software_list.append((name, version))
#             except FileNotFoundError:
#                 continue
#     except Exception as e:
#         print(f"Error: {e}")
#     return software_list

# # Collect from all relevant paths
# all_software = []

# paths = [
#     (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall"),
#     (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"),
#     (winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Uninstall")
# ]

# for root, path in paths:
#     all_software.extend(get_installed_software(root, path))

# # Display
# for name, version in sorted(all_software):
#     print(f"{name} - {version}")

import os
import winreg
import shutil
import subprocess
from pathlib import Path

def get_registry_apps():
    registry_paths = [
        (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall"),
        (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"),
        (winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Uninstall")
    ]

    apps = []
    for root, path in registry_paths:
        try:
            key = winreg.OpenKey(root, path)
            for i in range(winreg.QueryInfoKey(key)[0]):
                try:
                    subkey_name = winreg.EnumKey(key, i)
                    subkey = winreg.OpenKey(root, path + "\\" + subkey_name)
                    name, _ = winreg.QueryValueEx(subkey, "DisplayName")
                    version = winreg.QueryValueEx(subkey, "DisplayVersion")[0] if "DisplayVersion" in dict(winreg.QueryValueEx(subkey, v) for v in ["DisplayName", "DisplayVersion"] if v) else "Unknown"
                    apps.append({
                        "name": name,
                        "version": version,
                        "source": "Registry"
                    })
                except Exception:
                    continue
        except Exception:
            continue
    return apps

def get_appdata_apps():
    user_dirs = [
        os.path.expandvars(r"%LOCALAPPDATA%\Programs"),
        os.path.expandvars(r"%APPDATA%")
    ]
    found_apps = []
    for base_dir in user_dirs:
        base_path = Path(base_dir)
        if not base_path.exists():
            continue
        for item in base_path.iterdir():
            if item.is_dir() and any(f.suffix == '.exe' for f in item.rglob("*.exe")):
                found_apps.append({
                    "name": item.name,
                    "version": "Unknown",
                    "source": f"UserDir: {base_dir}"
                })
    return found_apps

def get_uwp_apps():
    try:
        output = subprocess.check_output(["powershell", "Get-AppxPackage | Select Name, Version"], shell=True)
        lines = output.decode().splitlines()
        apps = []
        for line in lines:
            parts = line.strip().split()
            if len(parts) >= 2:
                name = parts[0]
                version = parts[1]
                apps.append({
                    "name": name,
                    "version": version,
                    "source": "Microsoft Store"
                })
        return apps
    except Exception:
        return []

def get_cli_tools():
    tools = ["code", "python", "java", "git", "node", "docker"]
    found = []
    for tool in tools:
        path = shutil.which(tool)
        if path:
            found.append({
                "name": tool,
                "version": "CLI Tool",
                "source": f"PATH: {path}"
            })
    return found

def scan_all_apps():
    apps = []
    apps.extend(get_registry_apps())
    apps.extend(get_appdata_apps())
    apps.extend(get_uwp_apps())
    apps.extend(get_cli_tools())
    
    # Remove duplicates by app name
    unique = {}
    for app in apps:
        unique[app['name']] = app
    return list(unique.values())

# Run the scanner
if __name__ == "__main__":
    all_apps = scan_all_apps()
    for app in sorted(all_apps, key=lambda x: x['name'].lower()):
        print(f"{app['name']} - {app['version']} [{app['source']}]")

