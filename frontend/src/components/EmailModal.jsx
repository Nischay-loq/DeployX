import React, { useState } from 'react';
import authService from '../services/auth.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const EmailModal = ({ onClose }) => {
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const user = authService.getCurrentUser();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!newEmail.trim() || !password.trim()) {
      setMessage('Please fill in all fields');
      setMessageType('error');
      return;
    }
    
    if (newEmail === user?.email) {
      onClose();
      return;
    }

    setLoading(true);
    setMessage('');
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/request-email-change`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authService.getToken()}`
        },
        body: JSON.stringify({ new_email: newEmail, password: password })
      });

      if (!response.ok) {
        let errorMessage = 'Failed to send email verification';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      setMessage('Email verification link sent to your new email address!');
      setMessageType('success');
      
      setTimeout(() => {
        onClose();
      }, 3000);
      
    } catch (error) {
      console.error('Email change request error:', error);
      setMessage(error.message || 'Failed to send email verification');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-cyberBlue border border-electricBlue/30 rounded-lg p-6 w-full max-w-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-electricBlue">Change Email</h2>
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

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Current Email
          </label>
          <input
            type="email"
            value={user?.email || ''}
            disabled
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            New Email Address
          </label>
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="w-full px-3 py-2 bg-cyberBlue border border-electricBlue/30 rounded text-white placeholder-gray-400 focus:outline-none focus:border-electricBlue"
            placeholder="Enter new email address"
            required
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Current Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 bg-cyberBlue border border-electricBlue/30 rounded text-white placeholder-gray-400 focus:outline-none focus:border-electricBlue"
            placeholder="Enter your current password"
            required
            disabled={loading}
          />
        </div>

        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-300 text-xs">
              We'll send a verification link to your new email address to confirm the change.
            </p>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading || !newEmail.trim() || !password.trim()}
            className="flex-1 py-2 bg-electricBlue text-darkBlue rounded font-medium hover:bg-electricBlue/80 transition-colors disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Verification'}
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
    </div>
  );
};

export default EmailModal;