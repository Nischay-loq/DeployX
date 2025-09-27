#!/usr/bin/env python3

import os
import sys

# Add the current directory to Python path
sys.path.insert(0, os.getcwd())

try:
    # Simple test of the FastAPI app
    from app.main import app
    print("✅ App imported successfully")
    
    # Start server
    import uvicorn
    print("🚀 Starting server on http://localhost:8000")
    uvicorn.run("app.main:app", host="localhost", port=8000, reload=True)
    
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure you're in the backend directory and dependencies are installed")
    sys.exit(1)
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)