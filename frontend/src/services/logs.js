import api from './api';

class LogsService {
  /**
   * Get all logs with filtering and pagination
   */
  async getAllLogs(params = {}) {
    try {
      const response = await api.get('/api/logs/', { params });
      console.log('LogsService - Raw API response:', response);
      return response; // api.get already returns parsed JSON
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      throw error;
    }
  }

  /**
   * Get log statistics
   */
  async getLogStats() {
    try {
      const response = await api.get('/api/logs/stats');
      console.log('LogsService - Stats response:', response);
      return response; // api.get already returns parsed JSON
    } catch (error) {
      console.error('Failed to fetch log stats:', error);
      throw error;
    }
  }

  /**
   * Get detailed information about a specific log entry
   */
  async getLogDetails(logId) {
    try {
      const response = await api.get(`/api/logs/${logId}/details`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch details for log ${logId}:`, error);
      throw error;
    }
  }

  /**
   * Format log type for display
   */
  formatLogType(type) {
    const typeMap = {
      software_deployment: 'Software Deployment',
      file_deployment: 'File Deployment',
      command_execution: 'Command Execution',
      scheduled_task: 'Scheduled Task'
    };
    return typeMap[type] || type;
  }

  /**
   * Get icon for log type
   */
  getLogTypeIcon(type) {
    const iconMap = {
      software_deployment: '📦',
      file_deployment: '📄',
      command_execution: '⚡',
      scheduled_task: '⏰'
    };
    return iconMap[type] || '📋';
  }

  /**
   * Get color class for status
   */
  getStatusColor(status) {
    const colorMap = {
      pending: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30',
      running: 'text-blue-400 bg-blue-500/20 border-blue-500/30',
      in_progress: 'text-blue-400 bg-blue-500/20 border-blue-500/30',
      completed: 'text-green-400 bg-green-500/20 border-green-500/30',
      success: 'text-green-400 bg-green-500/20 border-green-500/30',
      failed: 'text-red-400 bg-red-500/20 border-red-500/30',
      error: 'text-red-400 bg-red-500/20 border-red-500/30',
      cancelled: 'text-gray-400 bg-gray-500/20 border-gray-500/30'
    };
    return colorMap[status] || 'text-gray-400 bg-gray-500/20 border-gray-500/30';
  }

  /**
   * Get color for log type
   */
  getLogTypeColor(type) {
    const colorMap = {
      software_deployment: 'text-purple-400 bg-purple-500/10',
      file_deployment: 'text-cyan-400 bg-cyan-500/10',
      command_execution: 'text-orange-400 bg-orange-500/10',
      scheduled_task: 'text-blue-400 bg-blue-500/10'
    };
    return colorMap[type] || 'text-gray-400 bg-gray-500/10';
  }

  /**
   * Format date for display
   */
  formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
    });
  }

  /**
   * Format full date and time
   */
  formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Calculate duration between two dates
   */
  calculateDuration(startDate, endDate) {
    if (!startDate) return 'N/A';
    if (!endDate) return 'In progress...';
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffMs = end - start;
    
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }
}

export default new LogsService();
