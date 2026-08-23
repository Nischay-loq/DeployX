import api from './api';

const schedulingService = {
  /**
   * Create a new scheduled task
   */
  async createScheduledTask(taskData) {
    try {
      return await api.post('/api/schedule/tasks', taskData);
    } catch (error) {
      console.error('Error creating scheduled task:', error);
      throw new Error(error.message || 'Failed to create scheduled task');
    }
  },

  /**
   * Get all scheduled tasks
   */
  async getTasks(params = {}) {
    try {
      return await api.get('/api/schedule/tasks', { params });
    } catch (error) {
      console.error('Error fetching scheduled tasks:', error);
      throw new Error(error.message || 'Failed to fetch scheduled tasks');
    }
  },

  /**
   * Get a specific task by ID
   */
  async getTask(taskId) {
    try {
      return await api.get(`/api/schedule/tasks/${taskId}`);
    } catch (error) {
      console.error('Error fetching task:', error);
      throw new Error(error.message || 'Failed to fetch task');
    }
  },

  /**
   * Update a scheduled task
   */
  async updateTask(taskId, updateData) {
    try {
      return await api.put(`/api/schedule/tasks/${taskId}`, updateData);
    } catch (error) {
      console.error('Error updating task:', error);
      throw new Error(error.message || 'Failed to update task');
    }
  },

  /**
   * Delete a scheduled task
   */
  async deleteTask(taskId) {
    try {
      return await api.delete(`/api/schedule/tasks/${taskId}`);
    } catch (error) {
      console.error('Error deleting task:', error);
      throw new Error(error.message || 'Failed to delete task');
    }
  },

  /**
   * Pause a scheduled task
   */
  async pauseTask(taskId) {
    try {
      return await api.post(`/api/schedule/tasks/${taskId}/pause`);
    } catch (error) {
      console.error('Error pausing task:', error);
      throw new Error(error.message || 'Failed to pause task');
    }
  },

  /**
   * Resume a paused task
   */
  async resumeTask(taskId) {
    try {
      return await api.post(`/api/schedule/tasks/${taskId}/resume`);
    } catch (error) {
      console.error('Error resuming task:', error);
      throw new Error(error.message || 'Failed to resume task');
    }
  },

  /**
   * Execute a task immediately
   */
  async executeTaskNow(taskId) {
    try {
      return await api.post(`/api/schedule/tasks/${taskId}/execute`);
    } catch (error) {
      console.error('Error executing task:', error);
      throw new Error(error.message || 'Failed to execute task');
    }
  },

  /**
   * Get execution history for a task
   */
  async getTaskExecutions(taskId, params = {}) {
    try {
      return await api.get(`/api/schedule/tasks/${taskId}/executions`, { params });
    } catch (error) {
      console.error('Error fetching task executions:', error);
      throw new Error(error.message || 'Failed to fetch task executions');
    }
  },

  /**
   * Get scheduling statistics
   */
  async getStats() {
    try {
      return await api.get('/api/schedule/stats');
    } catch (error) {
      console.error('Error fetching stats:', error);
      throw new Error(error.message || 'Failed to fetch stats');
    }
  }
};

export default schedulingService;
