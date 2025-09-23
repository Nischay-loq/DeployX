import api from './api';

class DeploymentsService {
  // Get all deployments for current user
  async fetchDeployments() {
    try {
      const response = await api.get('/deployments/');
      return response;
    } catch (error) {
      console.error('Failed to fetch deployments:', error);
      throw error;
    }
  }

  // Install software on devices/groups
  async installSoftware(deploymentData) {
    try {
      const response = await api.post('/deployments/install', deploymentData);
      return response;
    } catch (error) {
      console.error('Failed to start software installation:', error);
      throw error;
    }
  }

  // Get deployment progress
  async getDeploymentProgress(deploymentId) {
    try {
      const response = await api.get(`/deployments/${deploymentId}/progress`);
      return response;
    } catch (error) {
      console.error('Failed to get deployment progress:', error);
      throw error;
    }
  }

  // Retry failed deployments
  async retryFailedDeployments(deviceIds, deploymentId = null) {
    try {
      const response = await api.post('/deployments/retry', {
        device_ids: deviceIds,
        deployment_id: deploymentId
      });
      return response;
    } catch (error) {
      console.error('Failed to retry deployments:', error);
      throw error;
    }
  }

  // Get available software (hardcoded for now, matching the old frontend)
  getAvailableSoftware() {
    return [
      { id: 1, name: "7-Zip" },
      { id: 2, name: "Google Chrome" },
      { id: 3, name: "Node.js" },
      { id: 4, name: "Git" },
      { id: 5, name: "Python 3.11" },
      { id: 6, name: "Visual Studio Code" },
      { id: 7, name: "Docker Desktop" },
      { id: 8, name: "Notepad++" }
    ];
  }
}

export default new DeploymentsService();