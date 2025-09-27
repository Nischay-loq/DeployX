#!/usr/bin/env python3

import os
import sys

# Add the current directory to Python path
sys.path.insert(0, os.getcwd())

if __name__ == '__main__':
    try:
        # Simple test of the FastAPI app
        from app.main import socket_app
        print("✅ App imported successfully")
            
        # Start server with Socket.IO support
        import uvicorn
        print("🚀 Starting server on https://deployx-server.onrender.com")
        uvicorn.run("app.main:socket_app", host="0.0.0.0", port=8000, reload=True)
            
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Make sure you're in the backend directory and dependencies are installed")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()