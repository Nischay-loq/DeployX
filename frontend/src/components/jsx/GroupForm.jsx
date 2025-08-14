import React, { useState, useEffect } from "react";
import { createGroup, getDevices } from "./GroupingApi.js";

export default function GroupForm({ onGroupCreated }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [color, setColor] = useState("#6c63ff");
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [devices, setDevices] = useState([]);

  // Fetch devices from backend on mount
  useEffect(() => {
    async function fetchDevicesData() {
      try {
        const data = await getDevices();
        setDevices(data);
      } catch (err) {
        console.error("Error fetching devices:", err);
      }
    }
    fetchDevicesData();
  }, []);

  const handleDeviceSelect = (id) => {
    setSelectedDevices((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
  };

  return (
    <div style={styles.container}>
      {/* Group Creation Form */}
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

      {/* Devices Table */}
      <div style={styles.tableContainer}>
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
            {devices && devices.length > 0 ? (
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
                  <td
                    style={{
                      color: device.status === "online" ? "green" : "red",
                    }}
                  >
                    {device.status}
                  </td>
                  <td>{device.connection_type}</td>
                  <td>{device.last_seen}</td>
                  <td>{device.group_name || "Not in group"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9" style={{ textAlign: "center" }}>
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
    gap: "2rem",
    alignItems: "flex-start",
    width: "95%",
    maxWidth: "1600px",
    margin: "0 auto",
    padding: "2rem",
    height: "calc(100vh - 60px)",
    boxSizing: "border-box",
    overflow: "hidden",
  },

  // Form styles
  form: {
    flex: "0 0 400px",
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    backgroundColor: "#fff",
    padding: "2rem",
    borderRadius: "16px",
    boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
    height: "fit-content",
  },
  input: {
    width: "100%",
    padding: "1rem 1.25rem",
    borderRadius: "12px",
    border: "1px solid #ccc",
    fontSize: "1.1rem",
  },
  colorWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
  colorLabel: {
    fontWeight: "600",
    fontSize: "1rem",
    color: "#555",
  },
  colorInput: {
    width: "60px",
    height: "45px",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
  button: {
    padding: "1rem 2rem",
    border: "none",
    borderRadius: "12px",
    background: "linear-gradient(135deg, #6c63ff, #a29bfe)",
    color: "#fff",
    fontWeight: "700",
    fontSize: "1rem",
    cursor: "pointer",
  },

  // Table container styles
  tableContainer: {
    flex: 1,
    backgroundColor: "#fff",
    padding: "1.5rem",
    borderRadius: "16px",
    boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
    overflowX: "hidden", // no horizontal scroll
    overflowY: "auto",
    maxHeight: "100%",
  },

  // Table styles
  table: {
    width: "100%",
    borderCollapse: "collapse",
    tableLayout: "fixed", // columns fit container width
    fontSize: "1rem",
  },
  th: {
    textAlign: "left",
    padding: "0.75rem",
    borderBottom: "2px solid #ddd",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  td: {
    padding: "0.75rem",
    borderBottom: "1px solid #eee",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    wordWrap: "break-word",
  },
};
