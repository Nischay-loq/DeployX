import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/login.css';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailExists, setEmailExists] = useState(null);
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL.replace(/\/$/, "");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setIsSubmitted(true);
        setEmailExists(true);
      } else {
        if (res.status === 404) {
          setEmailExists(false);
          setIsSubmitted(true);
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

  const handleBackToLogin = () => {
    navigate('/login');
  };

  if (isSubmitted) {
    return (
      <div className="login-container">
        <div className="login-form" style={{ textAlign: 'center' }}>
          <h2>Check Your Email</h2>
          
          {emailExists ? (
            <div style={{ 
              background: '#e8f5e8', 
              border: '1px solid #4caf50', 
              borderRadius: '8px', 
              padding: '20px', 
              margin: '20px 0',
              color: '#2e7d32'
            }}>
              <p style={{ margin: '0 0 10px 0', fontSize: '16px' }}>
                We sent instructions to change your password to <strong>{email}</strong>.
              </p>
              <p style={{ margin: '0', fontSize: '14px' }}>
                Please check both your inbox and spam folder.
              </p>
            </div>
          ) : (
            <div style={{ 
              background: '#ffebee', 
              border: '1px solid #f44336', 
              borderRadius: '8px', 
              padding: '20px', 
              margin: '20px 0',
              color: '#c62828'
            }}>
              <p style={{ margin: '0', fontSize: '16px' }}>
                Email not registered.
              </p>
            </div>
          )}

          <button 
            type="button" 
            onClick={handleBackToLogin}
            style={{ 
              width: '100%', 
              marginTop: '20px',
              background: '#007bff',
              color: 'white',
              border: 'none',
              padding: '12px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <h2>Forgot Password</h2>
        
        <p style={{ 
          color: '#666', 
          marginBottom: '20px', 
          fontSize: '14px',
          textAlign: 'center'
        }}>
          Enter your email address and we'll send you a link to reset your password.
        </p>

        <input
          type="email"
          value={email}
          placeholder="Enter your email"
          onChange={(e) => setEmail(e.target.value)}
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
          {isLoading ? 'Sending...' : 'Send Reset Link'}
        </button>

        <button
          type="button"
          onClick={handleBackToLogin}
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

export default ForgotPassword;
