// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// API Client class for handling all backend requests
class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Helper method to get current token
  getToken() {
    return localStorage.getItem('access_token') || localStorage.getItem('token') || sessionStorage.getItem('token');
  }

  // Helper method to get refresh token
  getRefreshToken() {
    return localStorage.getItem('refresh_token');
  }

  // Refresh access token
  async refreshAccessToken() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      localStorage.setItem('access_token', data.access_token);
      
      if (data.refresh_token) {
        localStorage.setItem('refresh_token', data.refresh_token);
      }

      return data.access_token;
    } catch (error) {
      // Clear all tokens on refresh failure
      this.clearAuth();
      throw error;
    }
  }

  // Check if this is a persistent session (Remember Me or OAuth)
  isPersistentSession() {
    // Check if tokens are stored in localStorage (Remember Me was checked)
    const hasLocalStorageToken = !!(localStorage.getItem('access_token') || localStorage.getItem('token'));
    
    // Check if this is an OAuth session (Google login)
    const isOAuthSession = !!(localStorage.getItem('oauth_provider') || sessionStorage.getItem('oauth_provider'));
    
    return hasLocalStorageToken || isOAuthSession;
  }

  // Clear all authentication data
  clearAuth() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('username');
    localStorage.removeItem('oauth_provider');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('username');
    sessionStorage.removeItem('oauth_provider');
    window.dispatchEvent(new Event('auth:changed'));
  }

  // Helper method to make API requests
  async request(endpoint, options = {}) {
    // Ensure proper URL construction without double slashes
    const baseUrl = this.baseURL.endsWith('/') ? this.baseURL.slice(0, -1) : this.baseURL;
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${baseUrl}${cleanEndpoint}`;
    const token = this.getToken();
    
    const config = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      console.log(`Making API request to: ${url}`, token ? 'with token' : 'without token');
      const response = await fetch(url, config);
      
      if (!response.ok) {
        // Handle 401 Unauthorized - try token refresh first
        if (response.status === 401 && !options._retry) {
          console.warn('Token expired, attempting refresh...');
          
          try {
            const newToken = await this.refreshAccessToken();
            
            // Retry the original request with new token
            const retryConfig = {
              ...config,
              headers: {
                ...config.headers,
                Authorization: `Bearer ${newToken}`,
              },
              _retry: true, // Mark as retry to prevent infinite loops
            };
            
            const retryResponse = await fetch(url, retryConfig);
            if (retryResponse.ok) {
              return await retryResponse.json();
            }
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            
            // Check if this is a persistent session (Remember Me or OAuth)
            const isPersistentSession = this.isPersistentSession();
            
            if (isPersistentSession) {
              // For persistent sessions, don't auto-logout - let the app handle it
              console.log('Persistent session detected - not auto-logging out');
              throw new Error('Authentication failed - please check your connection or refresh the page');
            } else {
              // For temporary sessions, clear auth and redirect
              this.clearAuth();
              
              // Redirect to login if not already there
              if (window.location.pathname !== '/login') {
                window.location.href = '/login';
              }
              throw new Error('Your session has expired. Please log in again.');
            }
          }
        }

        const contentType = response.headers.get('content-type');
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.detail || errorData.message || errorMessage;
          } catch (e) {
            // If JSON parsing fails, use the default message
          }
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API Request Error:', error);
      
      // Check if it's a network error
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Unable to connect to the server. Please check if the backend is running.');
      }
      
      throw error;
    }
  }

  // Authentication endpoints
  async login(credentials) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async signupRequest(userData) {
    return this.request('/auth/signup-request', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async signupComplete(data) {
    return this.request('/auth/signup-complete', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async signup(userData) {
    return this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async signupWithOTP(userData) {
    return this.request('/auth/signup-with-otp', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async sendOTP(email, purpose = 'signup') {
    return this.request('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ email, purpose }),
    });
  }

  async verifyOTP(email, otp) {
    return this.request('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
  }

  async requestPasswordReset(email) {
    return this.request('/auth/password-reset-request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async validatePasswordResetToken(token) {
    const params = new URLSearchParams({ token });
    return this.request(`/auth/password-reset-validate?${params.toString()}`, {
      method: 'GET',
    });
  }

  async confirmPasswordReset(token, newPassword) {
    return this.request('/auth/password-reset-confirm', {
      method: 'POST',
      body: JSON.stringify({ token, new_password: newPassword }),
    });
  }

  async googleAuth(token) {
    return this.request('/auth/google-auth', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  async resetPassword(email, otp, newPassword) {
    // Backward compatibility: fall back to OTP-based flow if needed
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, otp, new_password: newPassword }),
    });
  }

  // Get current user info (if needed)
  async getCurrentUser() {
    return this.request('/auth/me', {
      method: 'GET',
    });
  }

  // Standard HTTP methods for general API usage
  async get(endpoint) {
    return this.request(endpoint, {
      method: 'GET',
    });
  }

  async post(endpoint, data = null) {
    return this.request(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : null,
    });
  }

  async put(endpoint, data = null) {
    return this.request(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : null,
    });
  }

  async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE',
    });
  }
}

// Create a singleton instance
const apiClient = new ApiClient();

export default apiClient;