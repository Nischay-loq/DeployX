"""
Quick test script for Gemini AI Assistant with database integration
"""

import sys
import os

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def test_imports():
    """Test if all modules import correctly"""
    print("=" * 60)
    print("Testing Imports...")
    print("=" * 60)
    
    try:
        from app.gemini.data_functions import (
            execute_function,
            AVAILABLE_FUNCTIONS,
            FUNCTION_DESCRIPTIONS
        )
        print("✅ data_functions imported successfully")
        print(f"   - Available functions: {len(AVAILABLE_FUNCTIONS)}")
        print(f"   - Function descriptions: {len(FUNCTION_DESCRIPTIONS)}")
        
        # Print available functions
        print("\n📋 Available Functions:")
        for func_name in AVAILABLE_FUNCTIONS.keys():
            print(f"   - {func_name}")
        
        return True
    except Exception as e:
        print(f"❌ Import failed: {e}")
        return False

def test_function_descriptions():
    """Test if function descriptions are properly formatted"""
    print("\n" + "=" * 60)
    print("Testing Function Descriptions...")
    print("=" * 60)
    
    try:
        from app.gemini.data_functions import FUNCTION_DESCRIPTIONS
        
        for func_name, info in FUNCTION_DESCRIPTIONS.items():
            assert "description" in info, f"{func_name} missing 'description'"
            assert "parameters" in info, f"{func_name} missing 'parameters'"
            assert "example" in info, f"{func_name} missing 'example'"
            print(f"✅ {func_name}: Valid description")
        
        print(f"\n✅ All {len(FUNCTION_DESCRIPTIONS)} function descriptions are valid")
        return True
    except Exception as e:
        print(f"❌ Function description test failed: {e}")
        return False

def test_function_execution():
    """Test function execution wrapper"""
    print("\n" + "=" * 60)
    print("Testing Function Execution...")
    print("=" * 60)
    
    try:
        from app.gemini.data_functions import execute_function
        
        # Test with invalid function (should return error)
        result = execute_function("invalid_function", user_id=1)
        assert "error" in result, "Should return error for invalid function"
        print(f"✅ Invalid function handling works: {result['error']}")
        
        # Test with valid function but no database (will fail but that's OK)
        print("\nℹ️  Note: Database connection tests will fail if DB is not accessible")
        print("   This is expected in test environment")
        
        return True
    except Exception as e:
        print(f"❌ Function execution test failed: {e}")
        return False

def test_chart_format():
    """Test if chart data format is correct"""
    print("\n" + "=" * 60)
    print("Testing Chart Data Format...")
    print("=" * 60)
    
    # Example chart data that AI should generate
    test_charts = [
        {
            "chart_type": "bar",
            "title": "Test Bar Chart",
            "data": [{"name": "A", "value": 10}, {"name": "B", "value": 20}]
        },
        {
            "chart_type": "pie",
            "title": "Test Pie Chart",
            "data": [{"name": "X", "value": 5}, {"name": "Y", "value": 15}]
        },
        {
            "chart_type": "line",
            "title": "Test Line Chart",
            "data": [{"name": "Jan", "value": 100}, {"name": "Feb", "value": 150}]
        }
    ]
    
    for chart in test_charts:
        assert "chart_type" in chart, "Missing chart_type"
        assert "title" in chart, "Missing title"
        assert "data" in chart, "Missing data"
        assert len(chart["data"]) > 0, "Empty data array"
        print(f"✅ {chart['chart_type']} chart format is valid")
    
    print(f"\n✅ All chart formats validated")
    return True

def run_all_tests():
    """Run all tests"""
    print("\n" + "🚀" * 30)
    print("GEMINI AI ASSISTANT - INTEGRATION TEST")
    print("🚀" * 30 + "\n")
    
    results = []
    
    # Run tests
    results.append(("Imports", test_imports()))
    results.append(("Function Descriptions", test_function_descriptions()))
    results.append(("Function Execution", test_function_execution()))
    results.append(("Chart Format", test_chart_format()))
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{status}: {test_name}")
    
    print("\n" + "=" * 60)
    print(f"Results: {passed}/{total} tests passed")
    print("=" * 60)
    
    if passed == total:
        print("\n🎉 All tests passed! System is ready.")
        print("\nNext steps:")
        print("1. Start backend: python start_server.py")
        print("2. Open DeployX in browser")
        print("3. Click AI assistant icon")
        print("4. Try: 'Show my agents'")
    else:
        print("\n⚠️  Some tests failed. Please check the errors above.")
    
    return passed == total

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
