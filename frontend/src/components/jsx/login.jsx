import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/login.css';
import Signup from './signup';

function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();
 
   const API_URL = import.meta.env.VITE_API_URL.replace(/\/$/, "");  // This points to backend


  // Auto-login if token exists in localStorage or sessionStorage
  useEffect(() => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      onLoginSuccess();
      navigate('/dashboard'); // Auto-redirect if already logged in
    }
  }, [onLoginSuccess, navigate]);

 const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        if (rememberMe) {
          localStorage.setItem("token", data.access_token);
          localStorage.setItem("username", username);
        } else {
          sessionStorage.setItem("token", data.access_token);
          sessionStorage.setItem("username", username);
        }

        alert("Login successful");
        onLoginSuccess(username);
        navigate("/dashboard");
      } else {
        console.error("Login error:", data);
        alert(typeof data.detail === "string" ? data.detail : JSON.stringify(data));
      }
    } catch (error) {
      console.error("Network error:", error);
      alert("Unable to connect to the server. Please try again later.");
    }
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleLogin}>
        <h2>Login</h2>

        <input
          type="text"
          value={username}
          placeholder="Username"
          onChange={(e) => setUsername(e.target.value)}
          required
        />

        <input
          type="password"
          value={password}
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <label className="remember-me">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={() => setRememberMe(!rememberMe)}
          />
          Remember Me
        </label>

        <button type="submit">Login</button>

        <div style={{ textAlign: 'center', marginTop: '10px' }}>
          <button
            type="button"
            onClick={() => navigate('/forgot-password')}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: '#007bff', 
              cursor: 'pointer', 
              padding: '5px',
              textDecoration: 'underline',
              fontSize: '14px'
            }}
          >
            Forgot Password?
          </button>
        </div>

       <button
      type="button"
    onClick={() => {
    console.log('Signup button clicked!');
    navigate('/signup');
    }}
    style={{ 
    background: 'none', 
    border: 'none', 
    color: 'blue', 
    cursor: 'pointer', 
    padding: 0,
    textDecoration: 'underline' 
    }}
  >
  Signup
</button>
      </form>
    </div>
  );
}

export default Login;
