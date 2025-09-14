// Authentication service for managing user state and tokens
import apiClient from './api.js';

class AuthService {
  constructor() {
    this.user = null;
    this.token = null;
    this.isAuthenticated = false;
  }

  // Initialize authentication state from stored tokens
  init() {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const username = localStorage.getItem('username') || sessionStorage.getItem('username');
    
    if (token && username) {
      this.token = token;
      this.user = { username };
      this.isAuthenticated = true;
    }
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

      return response;
    } catch (error) {
      this.isAuthenticated = false;
      this.user = null;
      this.token = null;
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