import { useState } from 'react';
import '../css/signup.css'; // Keep your existing styles

function Signup({ onSignupSuccess }) {
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSendOtp = async (e) => {
    e.preventDefault();
    const API_URL = import.meta.env.VITE_API_URL.replace(/\/$/, ""); 

    try {
      const res = await fetch(`${API_URL}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email }),
      });

      const data = await res.json();

      if (res.ok) {
        alert(data.message || 'OTP sent successfully');
        setOtpSent(true);
      } else {
        alert(data.detail || 'Failed to send OTP');
      }
    } catch (err) {
      console.error(err);
      alert('Something went wrong while sending OTP');
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    const API_URL = import.meta.env.VITE_API_URL;

    try {
      const res = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, otp }),
      });

      const data = await res.json();

      if (res.ok) {
        alert(data.message || 'Signup successful');
        onSignupSuccess();
      } else {
        alert(data.detail || 'Signup failed');
      }
    } catch (err) {
      console.error(err);
      alert('Something went wrong during signup');
    }
  };

  return (
    <div className="signup-container">
      <form
        className="signup-form"
        onSubmit={otpSent ? handleSignup : handleSendOtp}
      >
        <h2>Signup</h2>

        <input
          name="username"
          value={form.username}
          placeholder="Username"
          onChange={handleChange}
          required
        />

        <input
          name="email"
          type="email"
          value={form.email}
          placeholder="Email"
          onChange={handleChange}
          required
        />

        <input
          name="password"
          type="password"
          value={form.password}
          placeholder="Password"
          onChange={handleChange}
          required
        />

        {otpSent && (
          <input
            name="otp"
            type="text"
            value={otp}
            placeholder="Enter OTP"
            onChange={(e) => setOtp(e.target.value)}
            required
          />
        )}

        <button type="submit">{otpSent ? 'Signup' : 'Send OTP'}</button>
      </form>
    </div>
  );
}

export default Signup;
