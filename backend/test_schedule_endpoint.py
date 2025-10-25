import sys
sys.path.insert(0, 'D:\\DeployX\\backend')

from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)

# Test without auth
print("Testing GET /api/schedule/stats without auth:")
response = client.get("/api/schedule/stats")
print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")
print()

# Test POST without auth
print("Testing POST /api/schedule/tasks without auth:")
response = client.post("/api/schedule/tasks", json={
    "name": "Test Task",
    "task_type": "command",
    "recurrence_type": "once",
    "scheduled_time": "2024-12-31T14:00:00"
})
print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")
