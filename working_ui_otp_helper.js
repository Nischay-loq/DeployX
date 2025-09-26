// 🧪 Working UI - OTP Testing Helper
// Open browser console on http://localhost:5173/signup and paste this

console.log('🎯 Working UI - OTP Testing Helper Loaded!');
console.log('=========================================');

// Helper function to get OTP during testing
window.getOTP = async function(email) {
    try {
        console.log(`📧 Getting OTP for: ${email}`);
        const response = await fetch(`http://localhost:8000/auth/get-pending-signup/${email}`);
        
        if (response.ok) {
            const data = await response.json();
            console.log(`✅ OTP found: ${data.otp}`);
            console.log(`📋 Copy this OTP: ${data.otp}`);
            return data.otp;
        } else {
            console.log(`❌ No OTP found for ${email}`);
            console.log('💡 Make sure you clicked "Send OTP" first');
        }
    } catch (error) {
        console.error('❌ Error getting OTP:', error);
    }
};

// Helper function to test the complete flow
window.testSignupFlow = async function() {
    const testEmail = 'browser_test@example.com';
    const testData = {
        username: 'browser_test_user',
        email: testEmail,
        password: 'testPassword123'
    };
    
    console.log('🧪 Testing complete signup flow...');
    
    try {
        // Step 1: Request signup
        console.log('1. Requesting signup...');
        const signupResponse = await fetch('http://localhost:8000/auth/signup-request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testData)
        });
        
        if (signupResponse.ok) {
            const result = await signupResponse.json();
            console.log('✅ Signup requested:', result.msg);
            
            // Step 2: Get OTP
            const otp = await getOTP(testEmail);
            
            if (otp) {
                // Step 3: Complete signup
                console.log('2. Completing signup...');
                const completeResponse = await fetch('http://localhost:8000/auth/signup-complete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: testEmail, otp: otp })
                });
                
                if (completeResponse.ok) {
                    const userData = await completeResponse.json();
                    console.log('✅ Account created:', userData);
                    
                    // Step 4: Test login
                    console.log('3. Testing login...');
                    const loginResponse = await fetch('http://localhost:8000/auth/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            username: testData.username,
                            password: testData.password
                        })
                    });
                    
                    if (loginResponse.ok) {
                        const loginData = await loginResponse.json();
                        console.log('✅ Login successful!');
                        console.log('🎉 Complete flow working perfectly!');
                    }
                }
            }
        }
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
};

// Instructions
console.log('🔧 Available Commands:');
console.log('• getOTP("email@example.com") - Get OTP for email');
console.log('• testSignupFlow() - Test complete automated flow');
console.log('');
console.log('📋 Manual Testing Steps:');
console.log('1. Fill the signup form on the page');
console.log('2. Click "Send OTP"');
console.log('3. Run: getOTP("your-email@example.com")');
console.log('4. Copy the OTP and paste in the modal');
console.log('5. Complete signup!');
console.log('');
console.log('🎯 Ready to test! Go to: http://localhost:5173/signup');