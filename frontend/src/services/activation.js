/**
 * Activation Keys API Service
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ActivationService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  getToken() {
    return localStorage.getItem('access_token') || localStorage.getItem('token') || sessionStorage.getItem('token');
  }

  async request(endpoint, options = {}) {
    const token = this.getToken();
    
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || `HTTP error ${response.status}`);
    }

    return response.json();
  }

  /**
   * Generate a new activation key
   * @param {Object} options - Optional parameters
   * @param {string} options.notes - Notes for the key
   * @param {number} options.expiry_days - Days until expiry (default 30)
   */
  async generateKey(options = {}) {
    return this.request('/activation/generate', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  /**
   * List all activation keys
   * @param {Object} params - Query parameters
   * @param {boolean} params.include_used - Include used keys
   * @param {boolean} params.include_expired - Include expired keys
   * @param {number} params.skip - Pagination skip
   * @param {number} params.limit - Pagination limit
   */
  async listKeys(params = {}) {
    const queryParams = new URLSearchParams();
    
    if (params.include_used !== undefined) {
      queryParams.append('include_used', params.include_used);
    }
    if (params.include_expired !== undefined) {
      queryParams.append('include_expired', params.include_expired);
    }
    if (params.skip !== undefined) {
      queryParams.append('skip', params.skip);
    }
    if (params.limit !== undefined) {
      queryParams.append('limit', params.limit);
    }

    const queryString = queryParams.toString();
    const endpoint = `/activation/keys${queryString ? `?${queryString}` : ''}`;
    
    return this.request(endpoint, { method: 'GET' });
  }

  /**
   * Delete an activation key
   * @param {number} keyId - The key ID to delete
   */
  async deleteKey(keyId) {
    return this.request(`/activation/keys/${keyId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Check activation status for a machine
   * @param {string} machineId - The machine ID to check
   */
  async checkStatus(machineId) {
    return this.request(`/activation/check/${machineId}`, {
      method: 'GET',
    });
  }
}

const activationService = new ActivationService();
export default activationService;
