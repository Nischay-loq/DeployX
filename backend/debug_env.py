#!/usr/bin/env python3
"""
Debug script to check .env file loading
"""

import os
from dotenv import load_dotenv

# Method 1: Try from current working directory
print("Current working directory:", os.getcwd())
print("Method 1: load_dotenv() from current directory")
load_dotenv()
db_url_1 = os.getenv('DB_URL')
print(f"DB_URL (method 1): {db_url_1}")

# Method 2: Try explicit path like in database.py
current_file = os.path.abspath(__file__)
backend_dir = os.path.dirname(os.path.dirname(current_file))
env_path = os.path.join(backend_dir, '.env')
print(f"\nMethod 2: Using explicit path: {env_path}")
print(f"File exists: {os.path.exists(env_path)}")

# Clear environment and reload
if 'DB_URL' in os.environ:
    del os.environ['DB_URL']
    
load_dotenv(env_path)
db_url_2 = os.getenv('DB_URL')
print(f"DB_URL (method 2): {db_url_2}")

# Method 3: Try relative path
print("\nMethod 3: Using relative path '.env'")
if 'DB_URL' in os.environ:
    del os.environ['DB_URL']
    
load_dotenv('.env')
db_url_3 = os.getenv('DB_URL')
print(f"DB_URL (method 3): {db_url_3}")

# Check if .env file contents are readable
print(f"\nReading .env file directly:")
try:
    with open(env_path, 'r') as f:
        content = f.read()
        print(f"File content:\n{content}")
except Exception as e:
    print(f"Error reading file: {e}")