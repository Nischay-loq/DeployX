import apiClient from './api.js';

class AuthService {
  constructor() {
    this.user = null;
    this.token = null;
    this.isAuthenticated = false;
    this.setupSessionManagement();
  }

  setupSessionManagement() {
    setInterval(() => {
      const sessionActive = sessionStorage.getItem('sessionActive');
      if (sessionActive === 'true') {
        sessionStorage.setItem('sessionLastActive', Date.now().toString());
      }
    }, 30000);
  }

  notifyAuthChange() {
    try {
      window.dispatchEvent(new Event('auth:changed'));
    } catch (_) {}
  }

  init() {
    let token = localStorage.getItem('access_token') || localStorage.getItem('token');
    let username = localStorage.getItem('username');
    let rememberMe = true;
    
    if (!token) {
      token = sessionStorage.getItem('access_token') || sessionStorage.getItem('token');
      username = sessionStorage.getItem('username');
      rememberMe = false;
      
      const sessionActive = sessionStorage.getItem('sessionActive');
      if (token && sessionActive) {
        const isOAuthSession = sessionStorage.getItem('oauth_provider');
        const isPersistentSession = sessionActive === 'persistent';
        
        if (isOAuthSession || isPersistentSession) {
          sessionStorage.setItem('sessionLastActive', Date.now().toString());
        } else if (sessionActive === 'true') {
          const lastActive = sessionStorage.getItem('sessionLastActive');
          const now = Date.now();
          
          if (!lastActive || (now - parseInt(lastActive)) > 30 * 60 * 1000) {
            this.clearSessionTokens();
            token = null;
            username = null;
          } else {
            sessionStorage.setItem('sessionLastActive', now.toString());
          }
        }
      }
    }
    
    if (token && username) {
      this.token = token;
      
      const storage = rememberMe ? localStorage : sessionStorage;
      const storedUserData = storage.getItem('user');
      
      if (storedUserData) {
        try {
          this.user = JSON.parse(storedUserData);
        } catch (e) {
          this.user = { username };
        }
      } else {
        this.user = { username };
      }
      
      this.isAuthenticated = true;
      
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

  async login(credentials, rememberMe = false) {
    try {
      const response = await apiClient.login(credentials);
      
      this.token = response.access_token;
      this.user = { username: credentials.username };
      this.isAuthenticated = true;

      this.clearAllTokens();

      if (rememberMe) {
        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem('token', response.access_token);
        localStorage.setItem('username', credentials.username);
        
        if (response.refresh_token) {
          localStorage.setItem('refresh_token', response.refresh_token);
        }
        
        if (response.user) {
          localStorage.setItem('user', JSON.stringify(response.user));
        }
      } else {
        sessionStorage.setItem('token', response.access_token);
        sessionStorage.setItem('username', credentials.username);
        sessionStorage.setItem('sessionActive', 'true');
        sessionStorage.setItem('sessionLastActive', Date.now().toString());
        sessionStorage.setItem('access_token', response.access_token);
        
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

  async signupRequest(userData) {
    return apiClient.signupRequest(userData);
  }

  async signupComplete(email, otp) {
    return apiClient.signupComplete({ email, otp });
  }

  async signup(userData) {
    return apiClient.signup(userData);
  }

  clearSessionTokens() {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('username');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('sessionActive');
    sessionStorage.removeItem('sessionLastActive');
    sessionStorage.removeItem('oauth_provider');
  }

  clearAllTokens() {
    localStorage.removeItem('token');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('username');
    localStorage.removeItem('user');
    localStorage.removeItem('oauth_provider');
    this.clearSessionTokens();
  }

  logout() {
    this.isAuthenticated = false;
    this.user = null;
    this.token = null;
    this.clearAllTokens();
    this.notifyAuthChange();
  }

  isLoggedIn() {
    return this.isAuthenticated && this.token;
  }

  getCurrentUser() {
    return this.user;
  }

  updateUserData(userData) {
    this.user = { ...this.user, ...userData };
    
    const isRememberMe = localStorage.getItem('access_token') || localStorage.getItem('token');
    const storage = isRememberMe ? localStorage : sessionStorage;
    
    if (storage.getItem('user')) {
      storage.setItem('user', JSON.stringify(this.user));
    }
    
    this.notifyAuthChange();
  }

  getToken() {
    return this.token || localStorage.getItem('token') || sessionStorage.getItem('token');
  }

  async sendOTP(email, purpose = 'signup') {
    return apiClient.sendOTP(email, purpose);
  }

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

  async googleLogin(token, rememberMe = true) {
    try {
      const response = await apiClient.googleAuth(token);
      
      this.token = response.access_token;
      this.user = response.user || { username: response.user?.username || 'google_user' };
      this.isAuthenticated = true;

      this.clearAllTokens();

      const storage = rememberMe ? localStorage : sessionStorage;
      
      storage.setItem('access_token', response.access_token);
      storage.setItem('token', response.access_token);
      storage.setItem('username', this.user.username);
      storage.setItem('oauth_provider', 'google');
      
      if (response.refresh_token) {
        localStorage.setItem('refresh_token', response.refresh_token);
      }
      
      if (response.user) {
        storage.setItem('user', JSON.stringify(response.user));
      }

      if (!rememberMe) {
        sessionStorage.setItem('sessionActive', 'persistent');
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

  async resetPassword(email, otp, newPassword) {
    return apiClient.resetPassword(email, otp, newPassword);
  }

  isPersistentSession() {
    const hasLocalStorageToken = !!(localStorage.getItem('access_token') || localStorage.getItem('token'));
    const isOAuthSession = !!(localStorage.getItem('oauth_provider') || sessionStorage.getItem('oauth_provider'));
    const isPersistentSession = sessionStorage.getItem('sessionActive') === 'persistent';
    
    return hasLocalStorageToken || isOAuthSession || isPersistentSession;
  }
}

const authService = new AuthService();
export default authService;