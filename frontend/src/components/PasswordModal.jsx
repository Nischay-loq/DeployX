import React, { useState } from 'react';
import authService from '../services/auth.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const PasswordModal = ({ onClose }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const handleRequestPasswordChange = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/request-password-change`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authService.getToken()}`
        }
      });

      if (!response.ok) {
        let errorMessage = 'Failed to send password reset email';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      setMessage('Password reset link sent to your email!');
      setMessageType('success');
      
      setTimeout(() => {
        onClose();
      }, 3000);
      
    } catch (error) {
      console.error('Password reset request error:', error);
      setMessage(error.message || 'Failed to send password reset email');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-cyberBlue border border-electricBlue/30 rounded-lg p-6 w-full max-w-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-electricBlue">Change Password</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg ${
          messageType === 'success' ? 'bg-green-900/30 border border-green-500/50 text-green-400'
          : 'bg-red-900/30 border border-red-500/50 text-red-400'
        }`}>
          {message}
        </div>
      )}

      <div className="space-y-4">
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-blue-400 font-medium mb-1">Secure Password Reset</h3>
              <p className="text-gray-300 text-sm">
                For security reasons, we'll send you a secure reset link via email. 
                Click the button below to receive the link.
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleRequestPasswordChange}
            disabled={loading}
            className="flex-1 py-2 bg-electricBlue text-darkBlue rounded font-medium hover:bg-electricBlue/80 transition-colors disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default PasswordModal;