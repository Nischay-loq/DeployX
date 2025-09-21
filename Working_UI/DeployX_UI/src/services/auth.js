// Authentication service for managing user state and tokens
import apiClient from './api.js';

class AuthService {
  constructor() {
    this.user = null;
    this.token = null;
    this.isAuthenticated = false;
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
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const username = localStorage.getItem('username') || sessionStorage.getItem('username');
    
    if (token && username) {
      this.token = token;
      this.user = { username };
      this.isAuthenticated = true;
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

      // Store tokens based on remember me preference
      if (rememberMe) {
        localStorage.setItem('token', response.access_token);
        localStorage.setItem('username', credentials.username);
      } else {
        sessionStorage.setItem('token', response.access_token);
        sessionStorage.setItem('username', credentials.username);
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

  // Logout function
  logout() {
    this.isAuthenticated = false;
    this.user = null;
    this.token = null;
    
    // Clear stored tokens
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('username');
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
  async sendOTP(email, purpose = 'signup') {
    return apiClient.sendOTP(email, purpose);
  }

  // Verify OTP
  async verifyOTP(email, otp) {
    return apiClient.verifyOTP(email, otp);
  }

  // Google OAuth login
  async googleLogin(token, rememberMe = false) {
    try {
      const response = await apiClient.googleAuth(token);
      
      this.token = response.access_token;
      this.user = { username: 'google_user' }; // Will be updated with actual user info
      this.isAuthenticated = true;

      // Store tokens based on remember me preference
      if (rememberMe) {
        localStorage.setItem('token', response.access_token);
        localStorage.setItem('username', 'google_user');
      } else {
        sessionStorage.setItem('token', response.access_token);
        sessionStorage.setItem('username', 'google_user');
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