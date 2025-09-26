import requests

base_url = 'http://localhost:8000'
email = 'test_pending@example.com'

# Step 1: Request signup
print('1. Requesting signup...')
r1 = requests.post(f'{base_url}/auth/signup-request', json={
    'username': 'test_pending_user',
    'email': email,
    'password': 'password123'
})
print(f'Status: {r1.status_code}')

if r1.status_code == 200:
    # Step 2: Get pending signup data
    print('2. Getting pending signup data...')
    r2 = requests.get(f'{base_url}/auth/get-pending-signup/{email}')
    if r2.status_code == 200:
        data = r2.json()
        otp = data['otp']
        print(f'Pending OTP: {otp}')
        
        # Step 3: Complete signup
        print('3. Completing signup...')
        r3 = requests.post(f'{base_url}/auth/signup-complete', json={
            'email': email,
            'otp': otp
        })
        print(f'Complete Status: {r3.status_code}')
        if r3.status_code == 200:
            user = r3.json()
            print(f'✅ User created: {user["username"]} (ID: {user["id"]})')
            
            # Step 4: Test login
            print('4. Testing login...')
            r4 = requests.post(f'{base_url}/auth/login', json={
                'username': user["username"],
                'password': 'password123'
            })
            if r4.status_code == 200:
                print('✅ Login successful!')
            else:
                print(f'❌ Login failed: {r4.text}')
        else:
            print(f'❌ Failed: {r3.text}')
    else:
        print(f'❌ No pending data: {r2.text}')
else:
    print(f'❌ Request failed: {r1.text}')