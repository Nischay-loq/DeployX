import api from './api.js';

const API_BASE = '/groups';

// Groups API service
export const groupsService = {
  // Get all groups
  async fetchGroups() {
    try {
      const data = await api.get(`${API_BASE}/`);
      return data;
    } catch (error) {
      console.error('Failed to fetch groups:', error);
      throw error;
    }
  },

  // Create a new group
  async createGroup(groupData) {
    try {
      const data = await api.post(`${API_BASE}/`, groupData);
      return data;
    } catch (error) {
      console.error('Failed to create group:', error);
      throw error;
    }
  },

  // Update an existing group
  async updateGroup(groupId, groupData) {
    try {
      const data = await api.put(`${API_BASE}/${groupId}`, groupData);
      return data;
    } catch (error) {
      console.error('Failed to update group:', error);
      throw error;
    }
  },

  // Delete a group
  async deleteGroup(groupId) {
    try {
      const data = await api.delete(`${API_BASE}/${groupId}`);
      return data;
    } catch (error) {
      console.error('Failed to delete group:', error);
      throw error;
    }
  },

  // Assign device to group
  async assignDevice(groupId, deviceId) {
    try {
      const data = await api.post(`${API_BASE}/${groupId}/assign/${deviceId}`);
      return data;
    } catch (error) {
      console.error('Failed to assign device to group:', error);
      throw error;
    }
  },

  // Remove device from group
  async removeDevice(groupId, deviceId) {
    try {
      const data = await api.delete(`${API_BASE}/${groupId}/remove/${deviceId}`);
      return data;
    } catch (error) {
      console.error('Failed to remove device from group:', error);
      throw error;
    }
  }
};

export default groupsService;