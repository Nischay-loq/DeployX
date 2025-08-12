import axios from "axios";

const API_BASE = `${import.meta.env.VITE_API_URL}/groups`;

export const fetchGroups = () => axios.get(API_BASE);

export const createGroup = (data) => axios.post(API_BASE, data);

export const updateGroup = (id, data) => axios.put(`${API_BASE}/${id}`, data);

export const deleteGroup = (id) => axios.delete(`${API_BASE}/${id}`);

export const assignDevice = (groupId, deviceId) =>
  axios.post(`${API_BASE}/${groupId}/assign/${deviceId}`);

export const removeDevice = (groupId, deviceId) =>
  axios.delete(`${API_BASE}/${groupId}/remove/${deviceId}`);
