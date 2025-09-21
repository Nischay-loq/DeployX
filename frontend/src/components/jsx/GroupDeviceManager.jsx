import React, { useEffect, useState } from "react";
import { assignDevice, removeDevice } from "./GroupingApi.js";
import axios from "axios";

export default function GroupDeviceManager({ group, onClose }) {
  const [devices, setDevices] = useState([]);

  const loadDevices = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/devices`);
      setDevices(res.data);
    } catch (error) {
      console.error("Error fetching devices:", error);
    }
  };

  useEffect(() => {
    loadDevices();
  }, []);

  const isInGroup = (deviceId) =>
    group.devices.some((d) => d.id === deviceId);

  const toggleDevice = async (deviceId) => {
    try {
      if (isInGroup(deviceId)) {
        await removeDevice(group.id, deviceId);
      } else {
        await assignDevice(group.id, deviceId);
      }
      onClose(); // refresh list after changes
    } catch (error) {
      console.error("Error updating device assignment:", error);
    }
  };

  return (
    <div>
      <h3>Manage Devices for {group.group_name}</h3>
      <button onClick={onClose}>Close</button>
      {devices.map((d) => (
        <div key={d.id}>
          {d.device_name} ({d.ip_address}) -
          <button onClick={() => toggleDevice(d.id)}>
            {isInGroup(d.id) ? "Remove" : "Add"}
          </button>
        </div>
      ))}
    </div>
  );
}
