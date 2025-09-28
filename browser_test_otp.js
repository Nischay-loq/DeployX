// 🧪 BROWSER CONSOLE TEST SCRIPT
// Copy and paste this into browser console on http://localhost:5173/signup

console.log('🧪 OTP Signup Flow - Browser Test');
console.log('================================');

// Test the complete signup flow
window.testOTPSignup = async function() {
    const testData = {
        username: 'browser_test_user',
        email: 'browser_test@example.com',
        password: 'testPassword123'
    };
    
    console.log('1. Testing signup request...');
    
    try {
        // Step 1: Request signup
        const signupResponse = await fetch('http://localhost:8000/auth/signup-request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testData)
        });
        
        const signupResult = await signupResponse.json();
        console.log('✅ Signup request:', signupResult);
        
        // Step 2: Verify user NOT in database
        const loginAttempt = await fetch('http://localhost:8000/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: testData.username,
                password: testData.password
            })
        });
        
        if (loginAttempt.status === 401) {
            console.log('✅ User correctly NOT in database yet');
        } else {
            console.log('❌ User should not exist yet!');
            return;
        }
        
        // Step 3: Get OTP
        const otpResponse = await fetch(`http://localhost:8000/auth/get-pending-signup/${testData.email}`);
        const otpData = await otpResponse.json();
        const otp = otpData.otp;
        console.log(`📧 OTP retrieved: ${otp}`);
        
        // Step 4: Complete signup
        const completeResponse = await fetch('http://localhost:8000/auth/signup-complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: testData.email,
                otp: otp
            })
        });
        
        const userData = await completeResponse.json();
        console.log('✅ User created:', userData);
        
        // Step 5: Test login
        const finalLogin = await fetch('http://localhost:8000/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: testData.username,
                password: testData.password
            })
        });
        
        const loginData = await finalLogin.json();
        console.log('✅ Login successful:', loginData);
        
        console.log('🎉 OTP Signup Flow: COMPLETE SUCCESS!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
};

// Quick OTP getter function
window.getOTP = async function(email) {
    try {
        const response = await fetch(`http://localhost:8000/auth/get-pending-signup/${email}`);
        const data = await response.json();
        console.log(`📧 OTP for ${email}: ${data.otp}`);
        return data.otp;
    } catch (error) {
        console.error('❌ Could not get OTP:', error);
    }
};

console.log('🔧 Test functions loaded!');
console.log('• Run: testOTPSignup() - Full test');
console.log('• Run: getOTP("email@example.com") - Get OTP for email');
console.log('');
console.log('📋 Manual Test Steps:');
console.log('1. Fill signup form normally');
console.log('2. Click "Send OTP"');  
console.log('3. Run: getOTP("your-email") to get OTP');
console.log('4. Enter OTP in modal');
console.log('5. Complete signup!');