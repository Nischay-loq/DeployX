import React, { useState, useEffect } from 'react';
import authService from '../services/auth.js';

const UserProfile = ({ onClose }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Username editing state
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  
  // Password change state
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  
  // Email change state
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMessage, setEmailMessage] = useState('');
  
  // General message state
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setNewUsername(currentUser.username || '');
      setNewEmail(currentUser.email || '');
    }
  }, []);

  const handleUpdateUsername = async () => {
    if (!newUsername.trim() || newUsername === user.username) {
      setEditingUsername(false);
      setNewUsername(user.username || '');
      return;
    }

    setLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/auth/update-username', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authService.getToken()}`
        },
        body: JSON.stringify({ new_username: newUsername })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update username');
      }

      const data = await response.json();
      
      // Update local user data
      const updatedUser = { ...user, username: newUsername };
      setUser(updatedUser);
      authService.updateUserData(updatedUser);
      
      setMessage('Username updated successfully!');
      setMessageType('success');
      setEditingUsername(false);
      
    } catch (error) {
      console.error('Username update error:', error);
      setMessage(error.message || 'Failed to update username');
      setMessageType('error');
      setNewUsername(user.username || '');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPasswordChange = async () => {
    setPasswordLoading(true);
    setPasswordMessage('');
    
    try {
      const response = await fetch('/api/auth/request-password-change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authService.getToken()}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to send password reset email');
      }

      setPasswordMessage('Password reset link sent to your email!');
      
    } catch (error) {
      console.error('Password reset request error:', error);
      setPasswordMessage(error.message || 'Failed to send password reset email');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleRequestEmailChange = async () => {
    if (!newEmail.trim() || newEmail === user.email) {
      setEditingEmail(false);
      setNewEmail(user.email || '');
      return;
    }

    setEmailLoading(true);
    setEmailMessage('');
    
    try {
      const response = await fetch('/api/auth/request-email-change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authService.getToken()}`
        },
        body: JSON.stringify({ new_email: newEmail })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to send email verification');
      }

      setEmailMessage('Email verification link sent to your new email address!');
      setEditingEmail(false);
      
    } catch (error) {
      console.error('Email change request error:', error);
      setEmailMessage(error.message || 'Failed to send email verification');
      setNewEmail(user.email || '');
    } finally {
      setEmailLoading(false);
    }
  };

  const clearMessages = () => {
    setMessage('');
    setPasswordMessage('');
    setEmailMessage('');
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electricBlue"></div>
      </div>
    );
  }

  return (
    <div className="bg-cyberBlue border border-electricBlue/30 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-electricBlue">User Profile</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* General Messages */}
      {message && (
        <div className={`mb-4 p-4 rounded-lg ${
          messageType === 'success' ? 'bg-green-900/30 border border-green-500/50 text-green-400'
          : 'bg-red-900/30 border border-red-500/50 text-red-400'
        }`}>
          <div className="flex justify-between items-center">
            <span>{message}</span>
            <button onClick={clearMessages} className="text-gray-400 hover:text-white">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Username Section */}
        <div className="bg-darkBlue border border-electricBlue/20 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-3">Username</h3>
          
          {!editingUsername ? (
            <div className="flex items-center justify-between">
              <span className="text-gray-300">{user.username}</span>
              <button
                onClick={() => setEditingUsername(true)}
                className="px-4 py-2 bg-electricBlue text-darkBlue rounded-lg hover:bg-electricBlue/80 transition-colors"
              >
                Edit
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="w-full px-3 py-2 bg-cyberBlue border border-electricBlue/30 rounded text-white placeholder-gray-400 focus:outline-none focus:border-electricBlue"
                placeholder="Enter new username"
                disabled={loading}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleUpdateUsername}
                  disabled={loading}
                  className="px-4 py-2 bg-electricBlue text-darkBlue rounded hover:bg-electricBlue/80 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Updating...' : 'Update'}
                </button>
                <button
                  onClick={() => {
                    setEditingUsername(false);
                    setNewUsername(user.username || '');
                  }}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Password Section */}
        <div className="bg-darkBlue border border-electricBlue/20 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-3">Password</h3>
          
          <div className="space-y-3">
            <p className="text-gray-400 text-sm">
              To change your password, we'll send you a secure reset link via email.
            </p>
            
            {passwordMessage && (
              <div className="p-3 bg-blue-900/30 border border-blue-500/50 text-blue-400 rounded">
                {passwordMessage}
              </div>
            )}
            
            <button
              onClick={handleRequestPasswordChange}
              disabled={passwordLoading}
              className="px-4 py-2 bg-electricBlue text-darkBlue rounded hover:bg-electricBlue/80 transition-colors disabled:opacity-50"
            >
              {passwordLoading ? 'Sending...' : 'Send Password Reset Email'}
            </button>
          </div>
        </div>

        {/* Email Section */}
        <div className="bg-darkBlue border border-electricBlue/20 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-3">Email Address</h3>
          
          {!editingEmail ? (
            <div className="flex items-center justify-between">
              <span className="text-gray-300">{user.email}</span>
              <button
                onClick={() => setEditingEmail(true)}
                className="px-4 py-2 bg-electricBlue text-darkBlue rounded-lg hover:bg-electricBlue/80 transition-colors"
              >
                Change Email
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full px-3 py-2 bg-cyberBlue border border-electricBlue/30 rounded text-white placeholder-gray-400 focus:outline-none focus:border-electricBlue"
                placeholder="Enter new email address"
                disabled={emailLoading}
              />
              <p className="text-gray-400 text-sm">
                We'll send a verification link to your new email address to confirm the change.
              </p>
              
              {emailMessage && (
                <div className="p-3 bg-blue-900/30 border border-blue-500/50 text-blue-400 rounded">
                  {emailMessage}
                </div>
              )}
              
              <div className="flex gap-2">
                <button
                  onClick={handleRequestEmailChange}
                  disabled={emailLoading}
                  className="px-4 py-2 bg-electricBlue text-darkBlue rounded hover:bg-electricBlue/80 transition-colors disabled:opacity-50"
                >
                  {emailLoading ? 'Sending...' : 'Send Verification Email'}
                </button>
                <button
                  onClick={() => {
                    setEditingEmail(false);
                    setNewEmail(user.email || '');
                    setEmailMessage('');
                  }}
                  disabled={emailLoading}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Account Info Section */}
        <div className="bg-darkBlue border border-electricBlue/20 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-3">Account Information</h3>
          <div className="space-y-2 text-gray-300">
            <div className="flex justify-between">
              <span>User ID:</span>
              <span className="font-mono text-sm">{user.id}</span>
            </div>
            <div className="flex justify-between">
              <span>Account Created:</span>
              <span>{user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span>Email Verified:</span>
              <span className={user.is_verified ? 'text-green-400' : 'text-yellow-400'}>
                {user.is_verified ? 'Yes' : 'Pending'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;