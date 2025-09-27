import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import authService from '../services/auth.js'
import GoogleAuthButton from '../components/GoogleAuthButton'

export default function Signup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    // Validation
    const newErrors = {};
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsLoading(false);
      return;
    }

    try {
      // Call the backend API
      await authService.signup({
        username: formData.username,
        email: formData.email,
        password: formData.password
      });
      
      setShowSuccess(true);
      
      // Redirect to login with username pre-filled after 2 seconds
      setTimeout(() => {
        navigate('/login', { state: { email: formData.username } });
      }, 2000);
    } catch (error) {
      // Handle API errors
      const errorMessage = error.message || 'Signup failed. Please try again.';
      if (errorMessage.includes('Email already registered')) {
        setErrors({ email: 'Email already registered' });
      } else if (errorMessage.includes('Username already taken')) {
        setErrors({ username: 'Username already taken' });
      } else {
        setErrors({ general: errorMessage });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear error when user starts typing
    if (errors[e.target.name]) {
      setErrors({
        ...errors,
        [e.target.name]: ''
      });
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setIsLoading(true);
      // In a real implementation, send the credential to your backend
      console.log('Google Sign-Up Success:', credentialResponse);
      
      // For now, simulate success and redirect
      // You would typically:
      // 1. Send the credential to your backend
      // 2. Backend verifies the token with Google
      // 3. Create user account if new, or sign in if existing
      // 4. Return JWT token and user data
      
      localStorage.setItem('token', 'temp-google-token');
      localStorage.setItem('user', JSON.stringify({
        id: 'google-user-id',
        email: 'user@gmail.com',
        name: 'Google User'
      }));
      
      navigate('/dashboard');
    } catch (error) {
      console.error('Google sign-up error:', error);
      setErrors({ general: 'Google sign-up failed. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = (error) => {
    console.error('Google Sign-Up Error:', error);
    setErrors({ general: 'Google sign-up failed. Please try again.' });
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[radial-gradient(circle_at_20%_20%,rgba(0,255,247,0.12),transparent_35%),radial-gradient(circle_at_80%_80%,rgba(0,168,255,0.12),transparent_35%)]">
      {/* motion particles via CSS circles */}
      <div className="particles-background">
        {Array.from({length: 20}).map((_,i)=>(
          <div key={i} className="absolute w-2 h-2 rounded-full bg-neonAqua blur-[1px] opacity-70"
            style={{ top: `${Math.random()*100}%`, left: `${Math.random()*100}%`, animation: `float ${6+Math.random()*6}s infinite alternate`}}/>
        ))}
      </div>
      <style>{`@keyframes float{from{transform:translateY(0)}to{transform:translateY(-20px)}}`}</style>

      {/* Navigation back to home */}
      <div className="absolute top-6 left-6 z-10">
        <Link to="/" className="px-4 py-2 border border-electricBlue rounded-lg text-electricBlue hover:bg-electricBlue hover:text-cyberBlue transition-all cursor-pointer">
          ← Back to Home
        </Link>
      </div>

      <div className="absolute inset-0 flex items-center justify-center p-6 form-container">
        <div className="glass-light border-trace rounded-3xl w-full max-w-md p-8">
          {showSuccess ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl">✓</span>
              </div>
              <h2 className="text-2xl font-bold text-softWhite mb-2">Account Created!</h2>
              <p className="text-gray-300 mb-4">Redirecting to login page...</p>
              <div className="animate-pulse text-electricBlue">Please wait...</div>
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-bold mb-6 text-center text-softWhite">Create your DeployX account</h1>
              
              {/* General error message */}
              {errors.general && (
                <div className="mb-4 p-4 rounded-lg border bg-red-100/20 border-red-300/30 text-red-300">
                  <p className="text-sm">{errors.general}</p>
                </div>
              )}
              
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-sm mb-1 text-softWhite cursor-pointer">Username</label>
                  <input 
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 rounded-xl bg-cyberBlue/60 border transition-all text-softWhite cursor-text focus:outline-none focus:ring-2 focus:ring-neonAqua/70 ${
                      errors.username ? 'border-red-400' : 'border-neonAqua/40'
                    }`}
                    placeholder="johndoe" 
                    required 
                  />
                  {errors.username && <p className="text-red-400 text-xs mt-1">{errors.username}</p>}
                </div>
                <div>
                  <label className="block text-sm mb-1 text-softWhite cursor-pointer">Email</label>
                  <input 
                    type="email" 
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 rounded-xl bg-cyberBlue/60 border transition-all text-softWhite cursor-text focus:outline-none focus:ring-2 focus:ring-neonAqua/70 ${
                      errors.email ? 'border-red-400' : 'border-neonAqua/40'
                    }`}
                    placeholder="you@company.com" 
                    required 
                  />
                  {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
                </div>
                <div>
                  <label className="block text-sm mb-1 text-softWhite cursor-pointer">Password</label>
                  <input 
                    type="password" 
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 rounded-xl bg-cyberBlue/60 border transition-all text-softWhite cursor-text focus:outline-none focus:ring-2 focus:ring-neonAqua/70 ${
                      errors.password ? 'border-red-400' : 'border-neonAqua/40'
                    }`}
                    placeholder="••••••••" 
                    required 
                  />
                  {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
                </div>
                <div>
                  <label className="block text-sm mb-1 text-softWhite cursor-pointer">Confirm Password</label>
                  <input 
                    type="password" 
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 rounded-xl bg-cyberBlue/60 border transition-all text-softWhite cursor-text focus:outline-none focus:ring-2 focus:ring-neonAqua/70 ${
                      errors.confirmPassword ? 'border-red-400' : 'border-neonAqua/40'
                    }`}
                    placeholder="••••••••" 
                    required 
                  />
                  {errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{errors.confirmPassword}</p>}
                </div>

                <div className="flex items-center justify-center gap-2">
                  <Link to="/login" className="text-electricBlue hover:underline cursor-pointer">
                    Already have an account? Login
                  </Link>
                </div>


                <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 relative overflow-hidden px-6 py-3 rounded-xl bg-electricBlue text-cyberBlue font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <span className="relative z-10">{isLoading ? "Creating Account..." : "Create Account"}</span>
                  <span className="absolute inset-0 rounded-xl blur-xl opacity-70 btn-pulse bg-neonAqua"></span>
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center my-6">
                <hr className="flex-grow border-gray-600" />
                <span className="px-4 text-gray-400 text-sm">Or continue with Google</span>
                <hr className="flex-grow border-gray-600" />
              </div>

              {/* Google Sign-Up Button */}
              <div className="mb-6">
                <GoogleAuthButton
                  text="Sign up with Google"
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  disabled={isLoading}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
