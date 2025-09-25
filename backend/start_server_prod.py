#!/usr/bin/env python3

import os
import sys

# Add the current directory to Python path
sys.path.insert(0, os.getcwd())

if __name__ == '__main__':
    try:
        # Simple test of the FastAPI app
        from app.main import app
        print("✅ App imported successfully")
        
        # Start server in production mode (no reload)
        import uvicorn
        print("🚀 Starting server in production mode on http://127.0.0.1:8000")
        uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=False)
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Make sure you're in the backend directory and dependencies are installed")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()