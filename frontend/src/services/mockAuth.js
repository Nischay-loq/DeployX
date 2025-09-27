// Temporary mock auth service for testing purposes
class MockAuthService {
  constructor() {
    // Set mock authentication data
    localStorage.setItem('token', 'mock-jwt-token-for-testing');
    localStorage.setItem('username', 'testuser');
  }

  getCurrentUser() {
    return {
      id: 1,
      username: 'testuser',
      email: 'test@example.com'
    };
  }

  isAuthenticated() {
    return true;
  }

  getToken() {
    return 'mock-jwt-token-for-testing';
  }
}

// Create and export mock instance
const mockAuthService = new MockAuthService();
export default mockAuthService;