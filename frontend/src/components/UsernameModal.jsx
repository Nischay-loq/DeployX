import React, { useState } from 'react';
import authService from '../services/auth.js';

const UsernameModal = ({ onClose }) => {
  const [newUsername, setNewUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const user = authService.getCurrentUser();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!newUsername.trim() || newUsername === user?.username) {
      onClose();
      return;
    }

    setLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('http://localhost:8000/auth/update-username', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authService.getToken()}`
        },
        body: JSON.stringify({ new_username: newUsername })
      });

      if (!response.ok) {
        let errorMessage = 'Failed to update username';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // Update local user data
      const updatedUser = { ...user, username: newUsername };
      authService.updateUserData(updatedUser);
      
      setMessage('Username updated successfully!');
      setMessageType('success');
      
      setTimeout(() => {
        onClose();
      }, 1500);
      
    } catch (error) {
      console.error('Username update error:', error);
      setMessage(error.message || 'Failed to update username');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-cyberBlue border border-electricBlue/30 rounded-lg p-6 w-full max-w-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-electricBlue">Change Username</h2>
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
            Current Username
          </label>
          <input
            type="text"
            value={user?.username || ''}
            disabled
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            New Username
          </label>
          <input
            type="text"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            className="w-full px-3 py-2 bg-cyberBlue border border-electricBlue/30 rounded text-white placeholder-gray-400 focus:outline-none focus:border-electricBlue"
            placeholder="Enter new username"
            required
            disabled={loading}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading || !newUsername.trim()}
            className="flex-1 py-2 bg-electricBlue text-darkBlue rounded font-medium hover:bg-electricBlue/80 transition-colors disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Update Username'}
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

export default UsernameModal;