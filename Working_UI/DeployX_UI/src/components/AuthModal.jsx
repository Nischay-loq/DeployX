import { useState, useEffect } from 'react';
import { X, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/auth.js';

export default function AuthModal({ isOpen, onClose, initialMode = 'signin' }) {
  const [mode, setMode] = useState(initialMode);
  const [signupStep, setSignupStep] = useState('form'); // 'form' or 'otp'
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    rememberMe: false,
    otp: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  // Reset form when modal opens/closes or mode changes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        rememberMe: false,
        otp: ''
      });
      setError('');
      setSuccess('');
      setMode(initialMode);
      setSignupStep('form');
    }
  }, [isOpen, initialMode]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setError('');
  };

  const validateForm = () => {
    if (mode === 'forgot') {
      if (!formData.email.trim()) {
        setError('Email is required');
        return false;
      }
      if (!/\S+@\S+\.\S+/.test(formData.email)) {
        setError('Please enter a valid email address');
        return false;
      }
    } else if (mode === 'signup') {
      if (signupStep === 'form') {
        if (!formData.username.trim()) {
          setError('Username is required');
          return false;
        }
        if (!formData.email.trim()) {
          setError('Email is required');
          return false;
        }
        if (!/\S+@\S+\.\S+/.test(formData.email)) {
          setError('Please enter a valid email address');
          return false;
        }
        if (formData.password.length < 6) {
          setError('Password must be at least 6 characters');
          return false;
        }
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          return false;
        }
      } else if (signupStep === 'otp') {
        if (!formData.otp.trim()) {
          setError('OTP is required');
          return false;
        }
        if (formData.otp.length !== 6) {
          setError('Please enter the complete 6-digit OTP');
          return false;
        }
      }
    } else {
      if (!formData.username.trim()) {
        setError('Username or email is required');
        return false;
      }
      if (!formData.password) {
        setError('Password is required');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setError('');

    try {
      if (mode === 'forgot') {
        await authService.sendOTP(formData.email);
        setSuccess('Password reset link sent to your email address.');
      } else if (mode === 'signup') {
        if (signupStep === 'form') {
          // Step 1: Send OTP (don't create user yet)
          await authService.signupRequest({
            username: formData.username,
            email: formData.email,
            password: formData.password
          });
          setSignupStep('otp');
          setSuccess('OTP sent to your email. Please verify to complete signup.');
        } else if (signupStep === 'otp') {
          // Step 2: Verify OTP and create user
          await authService.signupComplete(formData.email, formData.otp);
          setSuccess('Account created successfully! Please sign in.');
          setMode('signin');
          setSignupStep('form');
        }
      } else {
        await authService.login(
          {
            username: formData.username,
            password: formData.password
          },
          formData.rememberMe
        );
        onClose();
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-2xl shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">
            {mode === 'signin' ? 'Welcome Back' : 
             mode === 'signup' ? (signupStep === 'otp' ? 'Verify Email' : 'Create Account') : 'Reset Password'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {success && (
            <div className="mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 text-sm">
              {success}
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Forgot Password Mode */}
            {mode === 'forgot' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all"
                    placeholder="Enter your email address"
                    required
                  />
                </div>
                <p className="text-sm text-gray-400">
                  We'll send you a password reset link to your email address.
                </p>
              </>
            )}

            {/* Sign In/Up Modes */}
            {mode !== 'forgot' && (
              <>
                {(mode === 'signin' || (mode === 'signup' && signupStep === 'form')) && (
                  <>
                    {/* Username/Email */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        {mode === 'signin' ? 'Username or Email' : 'Username'}
                      </label>
                      <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all"
                        placeholder={mode === 'signin' ? 'Enter username or email' : 'Choose a username'}
                        required
                      />
                    </div>

                    {/* Email (signup only) */}
                    {mode === 'signup' && signupStep === 'form' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Email Address
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all"
                          placeholder="Enter your email"
                          required
                        />
                      </div>
                    )}

                    {/* Password */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 pr-12 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all"
                          placeholder="Enter your password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password (signup only) */}
                    {mode === 'signup' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Confirm Password
                        </label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 pr-12 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all"
                            placeholder="Confirm your password"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                          >
                            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* OTP Input (signup OTP step only) */}
                {mode === 'signup' && signupStep === 'otp' && (
                  <>
                    <div className="text-center mb-4">
                      <p className="text-gray-300 text-sm">
                        We've sent a 6-digit verification code to
                      </p>
                      <p className="text-primary-400 font-medium">{formData.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Verification Code
                      </label>
                      <input
                        type="text"
                        name="otp"
                        value={formData.otp}
                        onChange={handleInputChange}
                        maxLength="6"
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all text-center text-lg tracking-widest"
                        placeholder="000000"
                        required
                      />
                      <p className="text-xs text-gray-400 mt-2 text-center">
                        Enter the 6-digit code sent to your email
                      </p>
                    </div>
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            setIsLoading(true);
                            await authService.signupRequest({
                              username: formData.username,
                              email: formData.email,
                              password: formData.password
                            });
                            setSuccess('New OTP sent to your email.');
                          } catch (err) {
                            setError('Failed to resend OTP. Please try again.');
                          } finally {
                            setIsLoading(false);
                          }
                        }}
                        className="text-sm text-primary-400 hover:text-primary-300 transition-colors"
                      >
                        Didn't receive code? Resend
                      </button>
                    </div>
                  </>
                )}

                {/* Remember Me (signin only) */}
                {mode === 'signin' && (
                  <div className="flex items-center justify-between">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="rememberMe"
                        checked={formData.rememberMe}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-primary-500 bg-gray-800 border-gray-600 rounded focus:ring-primary-500 focus:ring-2"
                      />
                      <span className="ml-2 text-sm text-gray-300">Remember me</span>
                    </label>
                    <button
                      type="button"
                      className="text-sm text-primary-400 hover:text-primary-300 transition-colors"
                      onClick={() => setMode('forgot')}
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Back Button (OTP step only) */}
            {mode === 'signup' && signupStep === 'otp' && (
              <button
                type="button"
                onClick={() => {
                  setSignupStep('form');
                  setFormData(prev => ({ ...prev, otp: '' }));
                  setError('');
                  setSuccess('');
                }}
                className="w-full mb-3 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all flex items-center justify-center"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Form
              </button>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  {mode === 'signin' ? 'Signing In...' : 
                   mode === 'signup' ? (signupStep === 'otp' ? 'Verifying...' : 'Send OTP') : 'Sending Reset Link...'}
                </div>
              ) : (
                mode === 'signin' ? 'Sign In' : 
                mode === 'signup' ? (signupStep === 'otp' ? 'Verify & Create Account' : 'Send OTP') : 'Send Reset Link'
              )}
            </button>
          </form>

          {/* Mode Switch */}
          <div className="mt-6 text-center">
            {mode === 'forgot' ? (
              <p className="text-gray-400">
                Remember your password?
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="ml-2 text-primary-400 hover:text-primary-300 font-medium transition-colors"
                >
                  Sign in
                </button>
              </p>
            ) : (
              <p className="text-gray-400">
                {mode === 'signin' ? "Don't have an account?" : "Already have an account?"}
                <button
                  type="button"
                  onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                  className="ml-2 text-primary-400 hover:text-primary-300 font-medium transition-colors"
                >
                  {mode === 'signin' ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}