import apiClient from './api';

class GeminiService {
  /**
   * Send a message to Gemini AI with optional context
   * @param {string} message - User's message
   * @param {Object} context - Additional context (page, userRole, etc.)
   * @returns {Promise<Object>} Response from Gemini
   */
  async chat(message, context = {}) {
    try {
      const response = await apiClient.post('/gemini/chat', {
        message,
        context: {
          ...context,
          timestamp: new Date().toISOString()
        }
      });
      return response;
    } catch (error) {
      console.error('Gemini chat error:', error);
      throw error;
    }
  }

  /**
   * Check Gemini API health status
   * @returns {Promise<Object>} Health check response
   */
  async checkHealth() {
    try {
      const response = await apiClient.get('/gemini/health');
      return response;
    } catch (error) {
      console.error('Gemini health check error:', error);
      return {
        status: 'error',
        configured: false,
        message: 'Unable to connect to Gemini service'
      };
    }
  }

  /**
   * Get current page context for Gemini
   * @returns {Object} Context information
   */
  getCurrentContext() {
    const path = window.location.pathname;
    const userRole = localStorage.getItem('userRole') || 'user';
    const userId = localStorage.getItem('user_id');

    return {
      page: path,
      userRole,
      user_id: userId,  // Backend expects 'user_id'
      timestamp: new Date().toISOString()
    };
  }
}

const geminiService = new GeminiService();
export default geminiService;
