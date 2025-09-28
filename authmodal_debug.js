// 🔍 AUTHMODAL OTP DEBUG SCRIPT
// Copy and paste this into your browser console while on the frontend

console.log('🚀 Starting AuthModal OTP Debug...');

// Debug function to check AuthModal state
function debugAuthModal() {
    // Look for the AuthModal component
    const modal = document.querySelector('[class*="modal"]') || 
                  document.querySelector('[class*="fixed inset-0"]') ||
                  document.querySelector('div[role="dialog"]');
    
    if (!modal) {
        console.log('❌ No modal found - is AuthModal open?');
        console.log('💡 Try: Click "Get Started" in navbar, then "Sign up"');
        return;
    }
    
    console.log('✅ Modal found:', modal);
    
    // Check modal title
    const title = modal.querySelector('h2');
    if (title) {
        console.log('📝 Modal title:', title.textContent);
        if (title.textContent.includes('Verify Email')) {
            console.log('✅ OTP mode detected!');
        } else if (title.textContent.includes('Create Account')) {
            console.log('ℹ️ Form mode detected');
        }
    }
    
    // Look for OTP input field
    const otpInput = modal.querySelector('input[name="otp"]') ||
                     modal.querySelector('input[placeholder="000000"]') ||
                     modal.querySelector('input[maxlength="6"]');
    
    if (otpInput) {
        console.log('✅ OTP input field found!', otpInput);
        console.log('👀 OTP input visible:', !otpInput.hidden && otpInput.offsetHeight > 0);
        console.log('📄 OTP input value:', otpInput.value);
    } else {
        console.log('❌ OTP input field NOT found');
        
        // Look for all input fields
        const allInputs = modal.querySelectorAll('input');
        console.log('📋 All inputs in modal:');
        allInputs.forEach((input, index) => {
            console.log(`  ${index + 1}. ${input.type} - name: ${input.name} - placeholder: ${input.placeholder}`);
        });
    }
    
    // Look for Back button (only shows in OTP mode)
    const backButton = modal.querySelector('button[type="button"]') || 
                       Array.from(modal.querySelectorAll('button'))
                       .find(btn => btn.textContent.includes('Back'));
    
    if (backButton && backButton.textContent.includes('Back')) {
        console.log('✅ Back button found - confirms OTP mode');
    }
    
    // Check submit button text
    const submitButton = modal.querySelector('button[type="submit"]');
    if (submitButton) {
        console.log('🔘 Submit button text:', submitButton.textContent);
    }
    
    // Look for email confirmation text
    const emailText = Array.from(modal.querySelectorAll('p'))
        .find(p => p.textContent.includes('@'));
    if (emailText) {
        console.log('📧 Email confirmation found:', emailText.textContent);
    }
}

// Auto-run debug
debugAuthModal();

// Set up interval to monitor changes
let debugInterval = setInterval(() => {
    const modal = document.querySelector('[class*="fixed inset-0"]');
    if (modal) {
        console.log('🔄 Modal state changed - re-checking...');
        debugAuthModal();
    }
}, 2000);

// Instructions
console.log(`
📋 AUTHMODAL DEBUG INSTRUCTIONS:

1. ✅ Open AuthModal by clicking "Get Started" in navbar
2. ✅ Click "Sign up" to switch to signup mode  
3. ✅ Fill the form with:
   - Username: testuser
   - Email: test@example.com
   - Password: password123
   - Confirm Password: password123
4. ✅ Click "Send OTP"
5. 🔍 Check console output above - it will show if OTP field appears

If OTP field doesn't appear after step 4, there might be:
- ❌ JavaScript error preventing state change
- ❌ Backend connection issue
- ❌ CSS hiding the field

To stop monitoring, run: clearInterval(${debugInterval})
`);

// Also provide a manual check function
window.checkAuthModal = debugAuthModal;