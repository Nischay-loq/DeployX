import { useState, useEffect, useCallback, useRef } from 'react';
import authService from '../services/auth.js';

/**
 * Google Identity Services helper - loads the GSI client, initializes it with
 * VITE_GOOGLE_CLIENT_ID and triggers the One Tap / button flow through a
 * hidden rendered button (the same approach AuthModal used).
 */
export default function useGoogleAuth(onSuccess) {
  const [scriptReady, setScriptReady] = useState(false);
  const [clientReady, setClientReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const optionsRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.google?.accounts?.id) {
      setScriptReady(true);
      return;
    }

    const existing = document.getElementById('google-identity-services');
    if (existing) {
      const onLoad = () => setScriptReady(true);
      const onError = () => setError('Failed to load Google Sign-In. Please refresh and try again.');
      existing.addEventListener('load', onLoad);
      existing.addEventListener('error', onError);
      return () => {
        existing.removeEventListener('load', onLoad);
        existing.removeEventListener('error', onError);
      };
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.id = 'google-identity-services';
    script.onload = () => setScriptReady(true);
    script.onerror = () => setError('Failed to load Google Sign-In. Please refresh and try again.');
    document.body.appendChild(script);
  }, []);

  const handleCredentialResponse = useCallback(
    async (response) => {
      if (!response.credential) {
        setError('No credential received from Google');
        return;
      }
      try {
        setLoading(true);
        setError('');
        await authService.googleLogin(response.credential, optionsRef.current?.rememberMe ?? true);
        onSuccess?.();
      } catch (err) {
        setError(err.message || 'Google sign-in failed');
      } finally {
        setLoading(false);
      }
    },
    [onSuccess]
  );

  useEffect(() => {
    if (!scriptReady || clientReady) return;
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setError('Google sign-in is not configured. Please contact the administrator.');
      return;
    }
    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      setClientReady(true);
    } catch (err) {
      console.error('Failed to initialize Google Sign-In:', err);
      setError('Failed to initialize Google Sign-In');
    }
  }, [scriptReady, clientReady, handleCredentialResponse]);

  const prompt = useCallback((rememberMe = true) => {
    if (!window.google?.accounts?.id) {
      setError('Google Sign-In is still loading, please try again.');
      return;
    }
    try {
      setError('');
      setLoading(true);
      optionsRef.current = { rememberMe };

      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      document.body.appendChild(container);

      window.google.accounts.id.renderButton(container, {
        theme: 'filled_blue',
        size: 'large',
        type: 'standard',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: 300,
        locale: 'en',
      });

      setTimeout(() => {
        const btn = container.querySelector('[role="button"]');
        if (btn) {
          btn.click();
        } else {
          setError('Failed to start Google sign-in');
          setLoading(false);
        }
        setTimeout(() => {
          if (document.body.contains(container)) document.body.removeChild(container);
        }, 1000);
      }, 100);
    } catch (err) {
      console.error('Google auth error:', err);
      setError('Failed to start Google sign-in');
      setLoading(false);
    }
  }, []);

  return { loading, error, prompt, setError };
}
