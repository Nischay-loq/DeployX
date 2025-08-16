import React, { useState, useEffect } from "react";
import axios from "axios";
import { createGroup , getDevices } from "./GroupingApi.js";

const API_URL = import.meta.env.VITE_API_URL;

export default function GroupForm({ onGroupCreated }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [color, setColor] = useState("#6c63ff");
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [devices, setDevices] = useState([]);

  // Fetch devices from backend on mount
   useEffect(() => {
    const fetchDevices = async () => {
      try {
        const data = await getDevices();
        setDevices(data);
      } catch (err) {
        console.error("Error fetching devices:", err);
      }
    };
    fetchDevices();
  }, []);

  const handleDeviceSelect = (id) => {
    setSelectedDevices((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createGroup({
        group_name: name,
        description: desc,
        color,
        devices: selectedDevices,
      });
      setName("");
      setDesc("");
      setColor("#6c63ff");
      setSelectedDevices([]);
      onGroupCreated();
    } catch (err) {
      console.error("Error creating group:", err);
    }
  };

  return (
    <div style={styles.container}>
      {/* Left panel: Form + Selected Devices */}
      <div style={styles.leftPanel}>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Group name"
            required
            style={styles.input}
          />
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Description"
            style={styles.input}
          />
          <div style={styles.colorWrapper}>
            <label style={styles.colorLabel}>Pick Color:</label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              style={styles.colorInput}
            />
          </div>
          <button type="submit" style={styles.button}>
            Create Group
          </button>
        </form>

        {/* Selected Devices Table */}
        <div style={styles.selectedTableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {selectedDevices.length > 0 ? (
                selectedDevices.map((id) => {
                  const device = devices.find((d) => d.id === id);
                  return (
                    <tr key={id}>
                      <td>{device?.device_name || ""}</td>
                      <td>{device?.ip_address || ""}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="2" style={{ textAlign: "center" }}>
                    No devices selected
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right panel: All Devices */}
      <div style={styles.rightPanel}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th>Select</th>
              <th>Device Name</th>
              <th>IP Address</th>
              <th>OS</th>
              <th>Status</th>
              <th>Connection</th>
              <th>Last Seen</th>
              <th>Group</th>
            </tr>
          </thead>
          <tbody>
            {devices.length > 0 ? (
              devices.map((device) => (
                <tr key={device.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedDevices.includes(device.id)}
                      onChange={() => handleDeviceSelect(device.id)}
                    />
                  </td>
                  <td>{device.device_name}</td>
                  <td>{device.ip_address}</td>
                  <td>{device.os}</td>
                  <td style={{ color: device.status === "online" ? "green" : "red" }}>
                    {device.status}
                  </td>
                  <td>{device.connection_type}</td>
                  <td>{device.last_seen}</td>
                  <td>{device.group_name || "Not in group"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" style={{ textAlign: "center" }}>
                  No devices found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    gap: "1rem",
    width: "1200px",
    margin: "0 auto",
    height: "100vh",
    padding: "1rem",
    boxSizing: "border-box",
  },
  leftPanel: {
    flex: "0 0 350px",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  rightPanel: {
    flex: 1,
    overflowX: "auto",
    backgroundColor: "#fff",
    padding: "1rem",
    borderRadius: "12px",
    boxShadow: "0 5px 20px rgba(0,0,0,0.1)",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    backgroundColor: "#fff",
    padding: "1rem",
    borderRadius: "12px",
    boxShadow: "0 5px 20px rgba(0,0,0,0.1)",
  },
  input: {
    width: "100%",
    padding: "0.75rem 1rem",
    borderRadius: "8px",
    border: "1px solid #ccc",
  },
  colorWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  colorLabel: {
    fontWeight: "600",
  },
  colorInput: {
    width: "50px",
    height: "40px",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
  button: {
    padding: "0.75rem",
    border: "none",
    borderRadius: "8px",
    background: "linear-gradient(135deg, #6c63ff, #a29bfe)",
    color: "#fff",
    fontWeight: "600",
    cursor: "pointer",
  },
  selectedTableContainer: {
    backgroundColor: "#fff",
    padding: "0.5rem",
    borderRadius: "8px",
    boxShadow: "0 5px 20px rgba(0,0,0,0.05)",
    flex: 1,
    overflowY: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.95rem",
  },
};
