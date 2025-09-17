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
    let token = localStorage.getItem('token');
    let username = localStorage.getItem('username');
    let rememberMe = true;
    
    // If not found in localStorage, check sessionStorage (remember me was not checked)
    if (!token) {
      token = sessionStorage.getItem('token');
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
      this.user = { username };
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
        localStorage.setItem('token', response.access_token);
        localStorage.setItem('username', credentials.username);
      } else {
        sessionStorage.setItem('token', response.access_token);
        sessionStorage.setItem('username', credentials.username);
        sessionStorage.setItem('sessionActive', 'true');
        sessionStorage.setItem('sessionLastActive', Date.now().toString());
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

  // Signup function
  async signup(userData) {
    try {
      const response = await apiClient.signup(userData);
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Helper method to clear session tokens only
  clearSessionTokens() {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('username');
    sessionStorage.removeItem('sessionActive');
    sessionStorage.removeItem('sessionLastActive');
  }

  // Helper method to clear all stored tokens
  clearAllTokens() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
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

  // Get token
  getToken() {
    return this.token;
  }

  // Send OTP for password reset
  async sendOTP(email) {
    return apiClient.sendOTP(email);
  }

  // Verify OTP
  async verifyOTP(email, otp) {
    return apiClient.verifyOTP(email, otp);
  }
}

// Create a singleton instance
const authService = new AuthService();

export default authService;