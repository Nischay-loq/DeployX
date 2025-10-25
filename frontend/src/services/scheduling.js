import axios from 'axios';
import authService from './auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const schedulingService = {
  /**
   * Create a new scheduled task
   */
  async createScheduledTask(taskData) {
    try {
      const token = authService.getToken();
      console.log('Sending task data to backend:', JSON.stringify(taskData, null, 2));
      const response = await axios.post(
        `${API_BASE_URL}/api/schedule/tasks`,
        taskData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error creating scheduled task:', error);
      console.error('Response data:', error.response?.data);
      console.error('Response status:', error.response?.status);
      const errorDetail = error.response?.data?.detail || error.response?.data || 'Failed to create scheduled task';
      throw new Error(JSON.stringify(errorDetail));
    }
  },

  /**
   * Get all scheduled tasks
   */
  async getTasks(params = {}) {
    try {
      const token = authService.getToken();
      const response = await axios.get(
        `${API_BASE_URL}/api/schedule/tasks`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          params
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching scheduled tasks:', error);
      throw new Error(error.response?.data?.detail || 'Failed to fetch scheduled tasks');
    }
  },

  /**
   * Get a specific task by ID
   */
  async getTask(taskId) {
    try {
      const token = authService.getToken();
      const response = await axios.get(
        `${API_BASE_URL}/api/schedule/tasks/${taskId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching task:', error);
      throw new Error(error.response?.data?.detail || 'Failed to fetch task');
    }
  },

  /**
   * Update a scheduled task
   */
  async updateTask(taskId, updateData) {
    try {
      const token = authService.getToken();
      const response = await axios.put(
        `${API_BASE_URL}/api/schedule/tasks/${taskId}`,
        updateData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error updating task:', error);
      throw new Error(error.response?.data?.detail || 'Failed to update task');
    }
  },

  /**
   * Delete a scheduled task
   */
  async deleteTask(taskId) {
    try {
      const token = authService.getToken();
      const response = await axios.delete(
        `${API_BASE_URL}/api/schedule/tasks/${taskId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error deleting task:', error);
      throw new Error(error.response?.data?.detail || 'Failed to delete task');
    }
  },

  /**
   * Pause a scheduled task
   */
  async pauseTask(taskId) {
    try {
      const token = authService.getToken();
      const response = await axios.post(
        `${API_BASE_URL}/api/schedule/tasks/${taskId}/pause`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error pausing task:', error);
      throw new Error(error.response?.data?.detail || 'Failed to pause task');
    }
  },

  /**
   * Resume a paused task
   */
  async resumeTask(taskId) {
    try {
      const token = authService.getToken();
      const response = await axios.post(
        `${API_BASE_URL}/api/schedule/tasks/${taskId}/resume`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error resuming task:', error);
      throw new Error(error.response?.data?.detail || 'Failed to resume task');
    }
  },

  /**
   * Execute a task immediately
   */
  async executeTaskNow(taskId) {
    try {
      const token = authService.getToken();
      const response = await axios.post(
        `${API_BASE_URL}/api/schedule/tasks/${taskId}/execute`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error executing task:', error);
      throw new Error(error.response?.data?.detail || 'Failed to execute task');
    }
  },

  /**
   * Get execution history for a task
   */
  async getTaskExecutions(taskId, params = {}) {
    try {
      const token = authService.getToken();
      const response = await axios.get(
        `${API_BASE_URL}/api/schedule/tasks/${taskId}/executions`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          params
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching task executions:', error);
      throw new Error(error.response?.data?.detail || 'Failed to fetch task executions');
    }
  },

  /**
   * Get scheduling statistics
   */
  async getStats() {
    try {
      const token = authService.getToken();
      const response = await axios.get(
        `${API_BASE_URL}/api/schedule/stats`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching stats:', error);
      throw new Error(error.response?.data?.detail || 'Failed to fetch stats');
    }
  }
};

export default schedulingService;
