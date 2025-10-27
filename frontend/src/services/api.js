const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  getToken() {
    return localStorage.getItem('access_token') || localStorage.getItem('token') || sessionStorage.getItem('token');
  }

  getRefreshToken() {
    return localStorage.getItem('refresh_token');
  }

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
      this.clearAuth();
      throw error;
    }
  }

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

  async request(endpoint, options = {}) {
    const baseUrl = this.baseURL.endsWith('/') ? this.baseURL.slice(0, -1) : this.baseURL;
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${baseUrl}${cleanEndpoint}`;
    const token = this.getToken();
    
    const headers = {
      'Accept': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };
    
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    
    const config = {
      method: options.method || 'GET',
      headers,
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        if (response.status === 401 && !options._retry) {
          try {
            const newToken = await this.refreshAccessToken();
            
            const retryConfig = {
              ...config,
              headers: {
                ...config.headers,
                Authorization: `Bearer ${newToken}`,
              },
              _retry: true,
            };
            
            const retryResponse = await fetch(url, retryConfig);
            if (retryResponse.ok) {
              return await retryResponse.json();
            }
          } catch (refreshError) {
            const hasLocalStorageToken = !!(localStorage.getItem('access_token') || localStorage.getItem('token'));
            const isOAuthSession = !!(localStorage.getItem('oauth_provider') || sessionStorage.getItem('oauth_provider'));
            
            if (hasLocalStorageToken || isOAuthSession) {
              throw new Error('Authentication failed - please check your connection or refresh the page');
            } else {
              this.clearAuth();
              
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
          } catch (e) {}
        }
        
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Unable to connect to the server. Please check if the backend is running.');
      }
      
      throw error;
    }
  }

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
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, otp, new_password: newPassword }),
    });
  }

  async getCurrentUser() {
    return this.request('/auth/me', {
      method: 'GET',
    });
  }

  async get(endpoint, options = {}) {
    // Handle query parameters
    let url = endpoint;
    if (options.params) {
      const params = new URLSearchParams();
      Object.keys(options.params).forEach(key => {
        if (options.params[key] !== null && options.params[key] !== undefined && options.params[key] !== '') {
          params.append(key, options.params[key]);
        }
      });
      const queryString = params.toString();
      if (queryString) {
        url = `${endpoint}${endpoint.includes('?') ? '&' : '?'}${queryString}`;
      }
    }
    
    return this.request(url, {
      method: 'GET',
      ...options,
    });
  }

  async post(endpoint, data = null, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: data instanceof FormData ? data : (data ? JSON.stringify(data) : null),
      ...options,
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

const apiClient = new ApiClient();
export default apiClient;