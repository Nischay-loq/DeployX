#!/usr/bin/env python3
"""Simple test script to check backend connectivity"""

import requests
import sys

def test_backend():
    try:
        # Test health endpoint
        print("Testing backend health endpoint...")
        response = requests.get("http://localhost:8000/health", timeout=5)
        
        if response.status_code == 200:
            print("✅ Backend is running!")
            print(f"Response: {response.json()}")
            return True
        else:
            print(f"❌ Backend returned status code: {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend. Make sure it's running on http://localhost:8000")
        return False
    except requests.exceptions.Timeout:
        print("❌ Backend request timed out")
        return False
    except Exception as e:
        print(f"❌ Error testing backend: {e}")
        return False

def test_auth_endpoints():
    try:
        print("\nTesting auth endpoints...")
        
        # Test signup endpoint with invalid data (just to see if endpoint exists)
        signup_response = requests.post(
            "http://localhost:8000/auth/signup",
            json={"username": "", "email": "", "password": ""},
            timeout=5
        )
        
        if signup_response.status_code in [400, 422]:  # Expected validation errors
            print("✅ Signup endpoint is accessible")
        else:
            print(f"⚠️  Signup endpoint returned unexpected status: {signup_response.status_code}")
        
        # Test login endpoint with invalid data
        login_response = requests.post(
            "http://localhost:8000/auth/login",
            json={"username": "", "password": ""},
            timeout=5
        )
        
        if login_response.status_code in [400, 401, 422]:  # Expected validation/auth errors
            print("✅ Login endpoint is accessible")
        else:
            print(f"⚠️  Login endpoint returned unexpected status: {login_response.status_code}")
            
        return True
        
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to auth endpoints")
        return False
    except Exception as e:
        print(f"❌ Error testing auth endpoints: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Testing DeployX Backend Connectivity\n")
    
    backend_ok = test_backend()
    if backend_ok:
        auth_ok = test_auth_endpoints()
        if auth_ok:
            print("\n🎉 All tests passed! Backend is ready for frontend connection.")
            sys.exit(0)
    
    print("\n💡 To start the backend server, run:")
    print("cd backend")
    print("uvicorn app.main:socket_app --reload --host 127.0.0.1 --port 8000")
    sys.exit(1)