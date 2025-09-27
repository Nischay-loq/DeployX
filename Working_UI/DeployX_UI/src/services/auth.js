// Authentication service for managing user state and tokens
import apiClient from './api.js';

class AuthService {
  constructor() {
    this.user = null;
    this.token = null;
    this.isAuthenticated = false;
    this.setupSessionManagement();
  }

  // Setup session management for non-remember-me logins
  setupSessionManagement() {
    // For session-only logins, we'll use a combination of sessionStorage and a heartbeat
    this.sessionHeartbeat();
  }

  // Session heartbeat to maintain session activity
  sessionHeartbeat() {
    // Update session timestamp every 30 seconds if session is active
    setInterval(() => {
      if (sessionStorage.getItem('sessionActive') === 'true') {
        sessionStorage.setItem('sessionLastActive', Date.now().toString());
      }
    }, 30000);
  }

  // Notify app/components that auth state changed
  notifyAuthChange() {
    try {
      window.dispatchEvent(new Event('auth:changed'));
    } catch (_) {
      // no-op in non-browser contexts
    }
  }

  // Initialize authentication state from stored tokens
  init() {
    // Check localStorage first (remember me was checked)
    let token = localStorage.getItem('access_token') || localStorage.getItem('token');
    let username = localStorage.getItem('username');
    let rememberMe = true;
    
    // If not found in localStorage, check sessionStorage (remember me was not checked)
    if (!token) {
      token = sessionStorage.getItem('access_token') || sessionStorage.getItem('token');
      username = sessionStorage.getItem('username');
      rememberMe = false;
      
      // For session-only logins, check if session is still valid
      if (token && sessionStorage.getItem('sessionActive') === 'true') {
        const lastActive = sessionStorage.getItem('sessionLastActive');
        const now = Date.now();
        
        // If more than 5 minutes since last activity, or no lastActive timestamp, 
        // consider the session expired (this handles server restarts)
        if (!lastActive || (now - parseInt(lastActive)) > 5 * 60 * 1000) {
          // Session expired, clear it
          this.clearSessionTokens();
          token = null;
          username = null;
        } else {
          // Update the last active timestamp
          sessionStorage.setItem('sessionLastActive', now.toString());
        }
      }
    }
    
    if (token && username) {
      this.token = token;
      
      // Load full user data if available
      const storage = rememberMe ? localStorage : sessionStorage;
      const storedUserData = storage.getItem('user');
      
      if (storedUserData) {
        try {
          this.user = JSON.parse(storedUserData);
        } catch (e) {
          console.warn('Failed to parse stored user data:', e);
          this.user = { username };
        }
      } else {
        this.user = { username };
      }
      
      this.isAuthenticated = true;
      
      // If it's a session token (not remember me), ensure session is marked as active
      if (!rememberMe) {
        sessionStorage.setItem('sessionActive', 'true');
        sessionStorage.setItem('sessionLastActive', Date.now().toString());
      }
    } else {
      this.token = null;
      this.user = null;
      this.isAuthenticated = false;
    }
    this.notifyAuthChange();
  }

  // Login function
  async login(credentials, rememberMe = false) {
    try {
      const response = await apiClient.login(credentials);
      
      this.token = response.access_token;
      this.user = { username: credentials.username };
      this.isAuthenticated = true;

      // Clear any existing tokens first
      this.clearAllTokens();

      // Store tokens based on remember me preference
      if (rememberMe) {
        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem('token', response.access_token); // Keep for backward compatibility
        localStorage.setItem('username', credentials.username);
        
        // Store refresh token if available
        if (response.refresh_token) {
          localStorage.setItem('refresh_token', response.refresh_token);
        }
        
        // Store user data if available
        if (response.user) {
          localStorage.setItem('user', JSON.stringify(response.user));
        }
      } else {
        sessionStorage.setItem('token', response.access_token);
        sessionStorage.setItem('username', credentials.username);
        sessionStorage.setItem('sessionActive', 'true');
        sessionStorage.setItem('sessionLastActive', Date.now().toString());
        
        // For session storage, also store access_token for consistency
        sessionStorage.setItem('access_token', response.access_token);
        
        // Store refresh token in localStorage even for session logins
        // (refresh tokens are usually longer-lived)
        if (response.refresh_token) {
          localStorage.setItem('refresh_token', response.refresh_token);
        }
        
        // Store user data
        if (response.user) {
          sessionStorage.setItem('user', JSON.stringify(response.user));
        }
      }

      this.notifyAuthChange();
      return response;
    } catch (error) {
      this.isAuthenticated = false;
      this.user = null;
      this.token = null;
      this.notifyAuthChange();
      throw error;
    }
  }

  // Step 1: Request signup and send OTP
  async signupRequest(userData) {
    try {
      const response = await apiClient.signupRequest(userData);
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Step 2: Complete signup after OTP verification
  async signupComplete(email, otp) {
    try {
      const response = await apiClient.signupComplete({ email, otp });
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Legacy signup function (direct, no OTP)
  async signup(userData) {
    try {
      const response = await apiClient.signup(userData);
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Signup with OTP verification (deprecated - use signupRequest + signupComplete)
  async signupWithOTP(userData, otp) {
    try {
      const response = await apiClient.signupWithOTP({
        ...userData,
        otp: otp
      });
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Helper method to clear session tokens only
  clearSessionTokens() {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('username');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('sessionActive');
    sessionStorage.removeItem('sessionLastActive');
  }

  // Helper method to clear all stored tokens
  clearAllTokens() {
    localStorage.removeItem('token');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('username');
    localStorage.removeItem('user');
    this.clearSessionTokens();
  }

  // Logout function
  logout() {
    this.isAuthenticated = false;
    this.user = null;
    this.token = null;
    
    // Clear all stored tokens
    this.clearAllTokens();
    this.notifyAuthChange();
  }

  // Check if user is authenticated
  isLoggedIn() {
    return this.isAuthenticated;
  }

  // Get current user
  getCurrentUser() {
    return this.user;
  }

  // Update current user data
  updateUserData(userData) {
    this.user = { ...this.user, ...userData };
    
    // Also update stored user data
    const isRememberMe = localStorage.getItem('access_token') || localStorage.getItem('token');
    const storage = isRememberMe ? localStorage : sessionStorage;
    
    if (storage.getItem('user')) {
      storage.setItem('user', JSON.stringify(this.user));
    }
    
    this.notifyAuthChange();
  }

  // Get token
  getToken() {
    return this.token;
  }

  // Send OTP for password reset
  async sendOTP(email, purpose = 'signup') {
    return apiClient.sendOTP(email, purpose);
  }

  // Verify OTP
  async verifyOTP(email, otp) {
    return apiClient.verifyOTP(email, otp);
  }

  async requestPasswordReset(email) {
    return apiClient.requestPasswordReset(email);
  }

  async validatePasswordResetToken(token) {
    return apiClient.validatePasswordResetToken(token);
  }

  async confirmPasswordReset(token, newPassword) {
    return apiClient.confirmPasswordReset(token, newPassword);
  }

  // Google OAuth login
  async googleLogin(token, rememberMe = false) {
    try {
      const response = await apiClient.googleAuth(token);
      
      this.token = response.access_token;
      this.user = response.user || { username: response.user?.username || 'google_user' };
      this.isAuthenticated = true;

      // Clear any existing tokens first
      this.clearAllTokens();

      // Store tokens based on remember me preference
      if (rememberMe) {
        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem('token', response.access_token);
        localStorage.setItem('username', this.user.username);
        
        if (response.refresh_token) {
          localStorage.setItem('refresh_token', response.refresh_token);
        }
        
        if (response.user) {
          localStorage.setItem('user', JSON.stringify(response.user));
        }
      } else {
        sessionStorage.setItem('access_token', response.access_token);
        sessionStorage.setItem('token', response.access_token);
        sessionStorage.setItem('username', this.user.username);
        sessionStorage.setItem('sessionActive', 'true');
        sessionStorage.setItem('sessionLastActive', Date.now().toString());
        
        if (response.refresh_token) {
          localStorage.setItem('refresh_token', response.refresh_token);
        }
        
        if (response.user) {
          sessionStorage.setItem('user', JSON.stringify(response.user));
        }
      }

      this.notifyAuthChange();
      return response;
    } catch (error) {
      this.isAuthenticated = false;
      this.user = null;
      this.token = null;
      this.notifyAuthChange();
      throw error;
    }
  }

  // Password reset
  async resetPassword(email, otp, newPassword) {
    return apiClient.resetPassword(email, otp, newPassword);
  }

  // Check if user is logged in
  isLoggedIn() {
    return this.isAuthenticated && this.token;
  }

  // Get current token
  getToken() {
    return this.token || localStorage.getItem('token') || sessionStorage.getItem('token');
  }

  // Get current user
  getCurrentUser() {
    return this.user;
  }
}

// Create a singleton instance
const authService = new AuthService();

export default authService;