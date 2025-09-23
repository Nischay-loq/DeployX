#!/usr/bin/env python3#!/usr/bin/env python3



import osimport os

import sysimport sys



# Add the current directory to Python path# Add the current directory to Python path

sys.path.insert(0, os.getcwd())sys.path.insert(0, os.getcwd())



try:try:

    # Simple test of the FastAPI app    # Simple test of the FastAPI app

    from app.main import app    from app.main import app

    print("✅ App imported successfully")    print("✅ App imported successfully")

        

    # Start server    # Start server

    import uvicorn    import uvicorn

    print("🚀 Starting server on http://localhost:8000")    print("🚀 Starting server on http://127.0.0.1:8000")

    uvicorn.run("app.main:app", host="localhost", port=8000, reload=True)    uvicorn.run(app, host="127.0.0.1", port=8000, reload=True)

        

except ImportError as e:except ImportError as e:

    print(f"❌ Import error: {e}")    print(f"❌ Import error: {e}")

    print("Make sure you're in the backend directory and dependencies are installed")    print("Make sure you're in the backend directory and dependencies are installed")

except Exception as e:except Exception as e:

    print(f"❌ Error: {e}")    print(f"❌ Error: {e}")

    import traceback    import traceback

    traceback.print_exc()    traceback.print_exc()