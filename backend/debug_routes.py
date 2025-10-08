import sys
import os
sys.path.insert(0, os.getcwd())

from app.main import app

print("=== FastAPI Routes ===")
for route in app.routes:
    if hasattr(route, 'methods') and hasattr(route, 'path'):
        methods = list(route.methods) if route.methods else []
        print(f"{methods} {route.path}")
print("=== End of Routes ===")
sys.exit(0)
