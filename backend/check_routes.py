from app.main import app

print("=== Deployment Routes ===")
for route in app.routes:
    if hasattr(route, 'path') and 'deploy' in route.path.lower():
        methods = list(route.methods) if hasattr(route, 'methods') else []
        print(f"{methods} - {route.path}")
