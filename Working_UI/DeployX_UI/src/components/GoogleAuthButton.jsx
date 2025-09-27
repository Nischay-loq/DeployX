import { useEffect, useRef } from 'react';

const GoogleAuthButton = ({ text = "Sign in with Google", onSuccess, onError, disabled = false }) => {
  const googleButtonRef = useRef(null);

  useEffect(() => {
    if (window.google && googleButtonRef.current) {
      // Initialize Google Sign-In
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || 'your-google-client-id',
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      // Render the Google Sign-In button
      window.google.accounts.id.renderButton(
        googleButtonRef.current,
        {
          theme: 'outline',
          size: 'large',
          width: '100%',
          text: text.includes('Sign up') ? 'signup_with' : 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          locale: 'en',
        }
      );
    }
  }, [text]);

  const handleCredentialResponse = async (response) => {
    try {
      if (response.credential) {
        // Send the Google ID token to our backend
        const result = await fetch('http://localhost:8000/auth/google', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: response.credential,
          }),
        });

        const data = await result.json();

        if (result.ok) {
          onSuccess(data);
        } else {
          onError(data.detail || 'Authentication failed');
        }
      }
    } catch (error) {
      console.error('Google auth error:', error);
      onError('Authentication failed. Please try again.');
    }
  };

  return (
    <div className="w-full">
      <div
        ref={googleButtonRef}
        className={`w-full ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      />
    </div>
  );
};

export default GoogleAuthButton;