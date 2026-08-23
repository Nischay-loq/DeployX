/**
 * Activation Keys API Service
 */
import api from './api';

const activationService = {
  /**
   * Generate a new activation key
   * @param {Object} options - Optional parameters
   * @param {string} options.notes - Notes for the key
   * @param {number} options.expiry_days - Days until expiry (default 30)
   */
  async generateKey(options = {}) {
    return api.post('/activation/generate', options);
  },

  /**
   * List all activation keys
   * @param {Object} params - Query parameters
   */
  async listKeys(params = {}) {
    return api.get('/activation/keys', { params });
  },

  /**
   * Delete an activation key
   * @param {number} keyId - The key ID to delete
   */
  async deleteKey(keyId) {
    return api.delete(`/activation/keys/${keyId}`);
  },

  /**
   * Get one-liner agent setup commands for a key (Windows + Linux)
   * @param {number} keyId - The activation key ID
   */
  async getSetupCommands(keyId) {
    return api.get(`/api/agent/setup/commands/${keyId}`);
  },

  /**
   * Check activation status for a machine
   * @param {string} machineId - The machine ID to check
   */
  async checkStatus(machineId) {
    return api.get(`/activation/check/${machineId}`);
  }
};

export default activationService;
