"""
Quick test script for the scheduling system
Tests basic functionality without requiring full server setup
"""
import sys
from datetime import datetime, timedelta

def test_models():
    """Test that models can be imported"""
    try:
        from app.schedule.models import (
            ScheduledTask, TaskType, TaskStatus, RecurrenceType,
            ScheduledTaskCreate, CommandPayload
        )
        print("✓ Models imported successfully")
        
        # Test enum values
        assert TaskType.COMMAND == "command"
        assert TaskType.SOFTWARE_DEPLOYMENT == "software_deployment"
        assert TaskType.FILE_DEPLOYMENT == "file_deployment"
        print("✓ Task types are correct")
        
        # Test creating a command payload
        payload = CommandPayload(
            command="echo test",
            shell="cmd"
        )
        print("✓ Command payload created successfully")
        
        return True
    except Exception as e:
        print(f"✗ Model test failed: {e}")
        return False


def test_scheduler():
    """Test that scheduler can be imported and initialized"""
    try:
        from app.schedule.scheduler import task_scheduler
        print("✓ Scheduler imported successfully")
        
        # Check scheduler is not started
        assert not task_scheduler.is_started
        print("✓ Scheduler is in correct initial state")
        
        return True
    except Exception as e:
        print(f"✗ Scheduler test failed: {e}")
        return False


def test_routes():
    """Test that routes can be imported"""
    try:
        from app.schedule.routes import router
        print("✓ Routes imported successfully")
        
        # Check router prefix
        assert router.prefix == "/api/schedule"
        print("✓ Router has correct prefix")
        
        # Count routes
        route_count = len([r for r in router.routes])
        print(f"✓ Router has {route_count} routes defined")
        
        return True
    except Exception as e:
        print(f"✗ Routes test failed: {e}")
        return False


def test_integration():
    """Test that scheduler integrates with main app"""
    try:
        from app.main import app
        
        # Check if schedule router is included
        route_prefixes = [route.path for route in app.routes]
        schedule_routes = [r for r in route_prefixes if '/api/schedule' in r]
        
        assert len(schedule_routes) > 0, "Schedule routes not found in app"
        print(f"✓ Found {len(schedule_routes)} schedule routes in main app")
        
        return True
    except Exception as e:
        print(f"✗ Integration test failed: {e}")
        return False


def run_tests():
    """Run all tests"""
    print("=" * 60)
    print("DeployX Scheduling System - Quick Tests")
    print("=" * 60)
    print()
    
    tests = [
        ("Models", test_models),
        ("Scheduler", test_scheduler),
        ("Routes", test_routes),
        ("Integration", test_integration),
    ]
    
    results = []
    for name, test_func in tests:
        print(f"\nTesting {name}...")
        print("-" * 40)
        result = test_func()
        results.append((name, result))
        print()
    
    print("=" * 60)
    print("Test Results Summary")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✓ PASSED" if result else "✗ FAILED"
        print(f"{name:20s} {status}")
    
    print()
    print(f"Total: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed! Scheduling system is working correctly.")
        return 0
    else:
        print("\n⚠️  Some tests failed. Please check the errors above.")
        return 1


if __name__ == "__main__":
    sys.exit(run_tests())
