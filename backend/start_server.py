#!/usr/bin/env python3

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add the current directory to Python path
sys.path.insert(0, os.getcwd())

if __name__ == '__main__':
    try:
        # Simple test of the FastAPI app
        from app.main import socket_app
        print("✅ App imported successfully")
        
        # Get configuration from environment
        host = os.getenv('BACKEND_HOST', '0.0.0.0')
        port = int(os.getenv('BACKEND_PORT', 8000))
        backend_url = os.getenv('BACKEND_URL', f'http://{host}:{port}')
        
        # Start server with Socket.IO support
        import uvicorn
        print(f"🚀 Starting server on {backend_url}")
        
        # Disable reload for production to prevent disconnects during file uploads
        # The 'reload' feature causes the server to restart when files in the
        # watched directories change, which includes the 'uploads' directory.
        # This disconnects all active connections during file deployments.
        uvicorn.run(
            "app.main:socket_app", 
            host=host, 
            port=port, 
            reload=False,  # Disabled to prevent disconnects during file operations
            log_level="info"
        )
            
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Make sure you're in the backend directory and dependencies are installed")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
