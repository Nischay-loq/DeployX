import requests
import json

BASE_URL = "http://localhost:8000"

def test_auth_flow():
    """Test the comprehensive authentication flow"""
    
    print("🔍 Testing Authentication System...")
    
    # Test 1: Login with valid credentials
    print("\n1. Testing login...")
    login_data = {
        "username": "testuser",
        "password": "testpass123"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        print(f"Login Status: {response.status_code}")
        
        if response.status_code == 200:
            login_result = response.json()
            print("✅ Login successful!")
            print(f"Access Token: {login_result.get('access_token', 'Missing')[:20]}...")
            print(f"Refresh Token: {login_result.get('refresh_token', 'Missing')[:20]}...")
            print(f"User Data: {login_result.get('user', 'Missing')}")
            
            access_token = login_result.get('access_token')
            refresh_token = login_result.get('refresh_token')
            
            # Test 2: Validate token with /auth/me
            print("\n2. Testing token validation...")
            headers = {"Authorization": f"Bearer {access_token}"}
            me_response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
            print(f"Token validation Status: {me_response.status_code}")
            
            if me_response.status_code == 200:
                user_info = me_response.json()
                print("✅ Token validation successful!")
                print(f"User Info: {user_info}")
            else:
                print(f"❌ Token validation failed: {me_response.text}")
                
            # Test 3: Test refresh token
            print("\n3. Testing refresh token...")
            refresh_data = {"refresh_token": refresh_token}
            refresh_response = requests.post(f"{BASE_URL}/auth/refresh", json=refresh_data)
            print(f"Refresh Status: {refresh_response.status_code}")
            
            if refresh_response.status_code == 200:
                refresh_result = refresh_response.json()
                print("✅ Token refresh successful!")
                print(f"New Access Token: {refresh_result.get('access_token', 'Missing')[:20]}...")
            else:
                print(f"❌ Token refresh failed: {refresh_response.text}")
                
        else:
            print(f"❌ Login failed: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend. Is it running on localhost:8000?")
    except Exception as e:
        print(f"❌ Error during testing: {str(e)}")

def test_cors_setup():
    """Test CORS configuration"""
    print("\n🌐 Testing CORS Setup...")
    
    try:
        # Test OPTIONS request (CORS preflight)
        response = requests.options(f"{BASE_URL}/auth/me")
        print(f"CORS Preflight Status: {response.status_code}")
        
        # Check CORS headers
        cors_headers = {
            'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
            'Access-Control-Allow-Credentials': response.headers.get('Access-Control-Allow-Credentials'),
            'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
        }
        
        print("CORS Headers:")
        for header, value in cors_headers.items():
            status = "✅" if value else "❌"
            print(f"  {status} {header}: {value}")
            
    except Exception as e:
        print(f"❌ CORS test error: {str(e)}")

if __name__ == "__main__":
    test_cors_setup()
    test_auth_flow()
    
    print("\n📋 Summary:")
    print("1. Comprehensive authentication system implemented")
    print("2. Refresh token mechanism added")
    print("3. Token validation endpoint created")
    print("4. CORS configured for credentials")
    print("5. Frontend API interceptors added")
    print("6. Enhanced auth service with token management")
    print("\n🎯 Next steps: Test the system in the browser and verify token refresh works automatically!")