import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import '../css/login.css';

function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { token } = useParams();

  const API_URL = import.meta.env.VITE_API_URL.replace(/\/$/, "");

  useEffect(() => {
    if (!token) {
      navigate('/login');
    }
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          token, 
          new_password: password 
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        if (res.status === 400) {
          setError(data.detail || 'Invalid or expired token');
        } else {
          setError(data.detail || 'An error occurred. Please try again.');
        }
      }
    } catch (error) {
      console.error("Network error:", error);
      setError("Unable to connect to the server. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="login-container">
        <div className="login-form" style={{ textAlign: 'center' }}>
          <h2>Password Reset Successful</h2>
          
          <div style={{ 
            background: '#e8f5e8', 
            border: '1px solid #4caf50', 
            borderRadius: '8px', 
            padding: '20px', 
            margin: '20px 0',
            color: '#2e7d32'
          }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '16px' }}>
              Your password has been successfully updated.
            </p>
            <p style={{ margin: '0', fontSize: '14px' }}>
              Redirecting to login page...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <h2>New Password</h2>
        
        <p style={{ 
          color: '#666', 
          marginBottom: '20px', 
          fontSize: '14px',
          textAlign: 'center'
        }}>
          Enter your new password below.
        </p>

        <input
          type="password"
          value={password}
          placeholder="New Password"
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ marginBottom: '10px' }}
        />

        <input
          type="password"
          value={confirmPassword}
          placeholder="Confirm New Password"
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          style={{ marginBottom: '10px' }}
        />

        {error && (
          <div style={{ 
            color: '#f44336', 
            fontSize: '14px', 
            marginBottom: '10px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <button 
          type="submit" 
          disabled={isLoading}
          style={{ 
            opacity: isLoading ? 0.7 : 1,
            cursor: isLoading ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoading ? 'Updating...' : 'Change Password'}
        </button>

        <button
          type="button"
          onClick={() => navigate('/login')}
          style={{ 
            background: 'none', 
            border: 'none', 
            color: '#007bff', 
            cursor: 'pointer', 
            padding: '10px 0',
            textDecoration: 'underline',
            fontSize: '14px',
            marginTop: '10px'
          }}
        >
          Back to Login
        </button>
      </form>
    </div>
  );
}

export default ResetPassword;
