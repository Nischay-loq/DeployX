import React, { useState, useEffect } from 'react';
import authService from '../services/auth.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const DeleteAccountModal = ({ onClose }) => {
  const [password, setPassword] = useState('');
  const [confirmationText, setConfirmationText] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const [checkingAccountType, setCheckingAccountType] = useState(true);

  useEffect(() => {
    checkAccountType();
  }, []);

  const testAPI = async () => {
    try {
      console.log('Testing API connection...');
      const response = await fetch(`${API_BASE_URL}/auth/test-auth`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authService.getToken()}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Test API response status:', response.status);
      const data = await response.json();
      console.log('Test API response data:', data);
    } catch (error) {
      console.error('Test API error:', error);
    }
  };

  const checkAccountType = async () => {
    try {
      setCheckingAccountType(true);
      
      // First test the API connection
      await testAPI();
      
      const response = await fetch(`${API_BASE_URL}/auth/check-account-type`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authService.getToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Account type check response:', data);
        setIsGoogleUser(data.is_google_user);
      } else {
        console.error('Failed to check account type:', response.status, response.statusText);
        // Default to false for Google user if check fails
        setIsGoogleUser(false);
      }
    } catch (error) {
      console.error('Error checking account type:', error);
      // Default to false for Google user if check fails
      setIsGoogleUser(false);
    } finally {
      setCheckingAccountType(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    if (confirmationText !== 'DELETE') {
      setMessage('Please type "DELETE" to confirm');
      setMessageType('error');
      return;
    }

    if (!isGoogleUser && !password.trim()) {
      setMessage('Password is required');
      setMessageType('error');
      return;
    }

    setLoading(true);

    try {
      const requestBody = {
        confirmation_text: confirmationText
      };
      
      // Only include password for non-Google users
      if (!isGoogleUser && password) {
        requestBody.password = password;
      }
      
      console.log('Sending delete request with body:', requestBody);
      
      const response = await fetch(`${API_BASE_URL}/auth/delete-account`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authService.getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        let errorMessage = 'Failed to delete account';
        try {
          const errorData = await response.json();
          console.log('Error response data:', errorData);
          
          if (typeof errorData === 'string') {
            errorMessage = errorData;
          } else if (errorData.detail) {
            // Handle FastAPI validation errors
            if (Array.isArray(errorData.detail)) {
              errorMessage = errorData.detail.map(err => err.msg).join(', ');
            } else {
              errorMessage = errorData.detail;
            }
          } else if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          } else {
            // Fallback for complex error objects
            errorMessage = JSON.stringify(errorData);
          }
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          errorMessage = `Request failed with status ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      // Parse successful response
      let responseData;
      try {
        responseData = await response.json();
        console.log('Success response data:', responseData);
      } catch (parseError) {
        console.error('Failed to parse success response:', parseError);
        // Assume success if we can't parse but got 200
      }

      // Account deleted successfully
      setMessage('Account deleted successfully. You will be logged out.');
      setMessageType('success');
      
      // Clear auth data and redirect after a short delay
      setTimeout(() => {
        authService.logout();
        window.location.href = '/';
      }, 2000);
      
    } catch (error) {
      console.error('Account deletion error:', error);
      let displayMessage = 'Failed to delete account';
      
      if (error instanceof Error) {
        displayMessage = error.message;
      } else if (typeof error === 'string') {
        displayMessage = error;
      } else if (error && typeof error === 'object') {
        displayMessage = error.message || error.detail || JSON.stringify(error);
      }
      
      setMessage(displayMessage);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-cyberBlue border border-red-500/50 rounded-lg p-6 w-full max-w-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-red-400">Delete Account</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
          disabled={loading}
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

      {checkingAccountType ? (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-400 mx-auto"></div>
          <p className="mt-2 text-gray-300">Checking account type...</p>
        </div>
      ) : (
        <>
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <h3 className="text-red-400 font-medium mb-1">Warning: This action cannot be undone!</h3>
                <p className="text-gray-300 text-sm">
                  Deleting your account will permanently remove all your data, including devices, deployments, and settings.
                  {isGoogleUser && ' (Google account detected - password not required)'}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isGoogleUser && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-cyberBlue border border-red-500/30 rounded text-white placeholder-gray-400 focus:outline-none focus:border-red-400"
                  placeholder="Enter your current password"
                  required={!isGoogleUser}
                  disabled={loading}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Type "DELETE" to confirm
              </label>
              <input
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                className="w-full px-3 py-2 bg-cyberBlue border border-red-500/30 rounded text-white placeholder-gray-400 focus:outline-none focus:border-red-400"
                placeholder="Type DELETE to confirm"
                required
                disabled={loading}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading || confirmationText !== 'DELETE' || (!isGoogleUser && !password.trim())}
                className="flex-1 py-2 bg-red-600 text-white rounded font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Deleting Account...' : 'Delete Account'}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
};

export default DeleteAccountModal;