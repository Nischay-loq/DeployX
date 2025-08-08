import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/login.css';

function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();

  // Auto-login if token exists in localStorage
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      onLoginSuccess();
      navigate('/dashboard'); // Auto-redirect if already logged in
    }
  }, [onLoginSuccess, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();

    const res = await fetch('http://localhost:8000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (res.ok) {
      if (rememberMe) {
        localStorage.setItem('token', data.access_token);
      } else {
        sessionStorage.setItem('token', data.access_token);
      }

      alert('Login successful');
      onLoginSuccess();
      navigate('/dashboard'); // Redirect after login
    } else {
      console.error('Login error:', data);
      alert(typeof data.detail === 'string' ? data.detail : JSON.stringify(data));
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
      </form>
    </div>
  );
}

export default Login;
