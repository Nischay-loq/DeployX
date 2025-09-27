import api from './api';

class DevicesService {
  async fetchDevices() {
    try {
      const response = await api.get('/devices/');
      return response; // The API client already returns the JSON data
    } catch (error) {
      console.error('Failed to fetch devices:', error);
      throw error;
    }
  }

  async getDevice(deviceId) {
    try {
      const response = await api.get(`/devices/${deviceId}`);
      return response; // The API client already returns the JSON data
    } catch (error) {
      console.error('Failed to get device:', error);
      throw error;
    }
  }

  async updateDeviceStatus(deviceId, status) {
    try {
      const response = await api.put(`/devices/${deviceId}/status`, { status });
      return response; // The API client already returns the JSON data
    } catch (error) {
      console.error('Failed to update device status:', error);
      throw error;
    }
  }
}

export default new DevicesService();