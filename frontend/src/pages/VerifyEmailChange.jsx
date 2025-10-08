import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import ParticlesBackground from '../components/ParticlesBackground.jsx';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const VerifyEmailChange = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('');
  
  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link - missing token.');
      return;
    }
    
    verifyEmailChange(token);
  }, [searchParams]);
  
  const verifyEmailChange = async (token) => {
    try {
      setStatus('verifying');
      
      const response = await fetch(`${API_BASE_URL}/auth/verify-email-change`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token })
      });
      
      const data = await response.json();
      console.log('Email verification response:', response.status, data);
      
      if (response.ok) {
        setStatus('success');
        setMessage(data.message || 'Email address changed successfully! You can now close this tab.');
      } else {
        setStatus('error');
        let errorMessage = 'Email verification failed. The link may be expired or invalid.';
        
        if (data.detail) {
          if (typeof data.detail === 'string') {
            errorMessage = data.detail;
          } else if (Array.isArray(data.detail)) {
            errorMessage = data.detail.map(err => err.msg || err).join(', ');
          }
        }
        
        setMessage(errorMessage);
      }
    } catch (error) {
      console.error('Email verification error:', error);
      setStatus('error');
      setMessage('An error occurred while verifying your email. Please try again.');
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden">
      <ParticlesBackground />
      
      <div className="relative z-10 flex items-center justify-center min-h-screen px-6">
        <div className="w-full max-w-md">
          <div className="bg-cyberBlue border border-white/20 rounded-2xl shadow-2xl backdrop-blur-sm p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-primary-500 to-accent-cyan rounded-2xl flex items-center justify-center mb-6">
                {status === 'verifying' && (
                  <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                )}
                {status === 'success' && (
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {status === 'error' && (
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              
              <h1 className="text-2xl font-bold text-white mb-2">
                {status === 'verifying' && 'Verifying Email Change'}
                {status === 'success' && 'Email Changed Successfully'}
                {status === 'error' && 'Verification Failed'}
              </h1>
            </div>
            
            {/* Content */}
            <div className="text-center">
              {status === 'verifying' && (
                <div>
                  <p className="text-gray-300 mb-4">
                    Please wait while we verify your email change request...
                  </p>
                  <div className="animate-pulse text-sm text-gray-400">
                    This may take a few seconds
                  </div>
                </div>
              )}
              
              {status === 'success' && (
                <div>
                  <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-4 mb-6">
                    <p className="text-green-400 text-sm">
                      {message}
                    </p>
                  </div>
                  <p className="text-gray-300 mb-6">
                    Your email address has been successfully updated. You can now use your new email to log in.
                  </p>
                  <div className="space-y-3">
                    <Link 
                      to="/" 
                      className="btn-primary w-full inline-flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      Go to Login
                    </Link>
                    <button 
                      onClick={() => window.close()}
                      className="w-full py-2 px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
                    >
                      Close Tab
                    </button>
                  </div>
                </div>
              )}
              
              {status === 'error' && (
                <div>
                  <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 mb-6">
                    <p className="text-red-400 text-sm">
                      {message}
                    </p>
                  </div>
                  <p className="text-gray-300 mb-6">
                    If you continue to have issues, please try requesting a new email change from your profile settings.
                  </p>
                  <div className="space-y-3">
                    <Link 
                      to="/" 
                      className="btn-primary w-full inline-flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      Go to Login
                    </Link>
                    <button 
                      onClick={() => window.close()}
                      className="w-full py-2 px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
                    >
                      Close Tab
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Footer */}
          <div className="text-center mt-8">
            <p className="text-gray-400 text-sm">
              DeployX - Secure Email Verification
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailChange;