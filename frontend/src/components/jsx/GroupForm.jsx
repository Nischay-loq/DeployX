import React, { useState, useEffect } from "react";
import axios from "axios";
import { createGroup, getDevices, updateGroup as updateGroupApi } from "./GroupingApi.js";

const API_URL = import.meta.env.VITE_API_URL;

export default function GroupForm({ initialData, onGroupCreated }) {
  const [name, setName] = useState(initialData?.group_name || "");
  const [desc, setDesc] = useState(initialData?.description || "");
  const [color, setColor] = useState(initialData?.color || "#6c63ff");
  const [selectedDevices, setSelectedDevices] = useState(
    Array.isArray(initialData?.devices) ? initialData.devices : []
  ); // array of device objects
  const [devices, setDevices] = useState([]); // array of device objects
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [devicesError, setDevicesError] = useState(null);

  // normalize any devices response
  const normalizeDevices = (res) => {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res.devices)) return res.devices;
    if (Array.isArray(res.rows)) return res.rows;
    if (res.data && Array.isArray(res.data.devices)) return res.data.devices;
    return [];
  };

  // Fetch devices and sync with selected on edit
  useEffect(() => {
    let mounted = true;

    const fetchDevicesList = async () => {
      setDevicesLoading(true);
      setDevicesError(null);
      try {
        // 1) try custom API wrapper
        const wrapper = await getDevices();
        if (!mounted) return;
        let all = normalizeDevices(wrapper);

        // 2) fallback direct API call if needed
        if (!Array.isArray(all) || all.length === 0) {
          const url = API_URL ? `${API_URL}/devices` : "/devices";
          const res = await axios.get(url);
          if (!mounted) return;
          all = normalizeDevices(res);
        }

        // Build selected devices from initialData if present (can be ids or objects)
        let selected = [];
        if (initialData?.devices) {
          if (Array.isArray(initialData.devices) && initialData.devices.length > 0) {
            if (typeof initialData.devices[0] === "object") {
              // objects already
              selected = initialData.devices;
            } else {
              // ids -> map to objects
              const idSet = new Set(initialData.devices);
              selected = all.filter((d) => idSet.has(d.id));
            }
          }
        } else {
          // keep current selectedDevices if any (e.g., from create mode or user interaction)
          selected = selectedDevices;
        }

        // Deduplicate and split available vs selected
        const selectedIdSet = new Set((selected || []).map((d) => d.id));
        const available = all.filter((d) => !selectedIdSet.has(d.id));

        if (!mounted) return;
        setSelectedDevices(selected);
        setDevices(available);
      } catch (err) {
        if (!mounted) return;
        console.error("Error fetching devices:", err);
        setDevices([]);
        setDevicesError("Failed to load devices");
      } finally {
        if (mounted) setDevicesLoading(false);
      }
    };

    fetchDevicesList();
    return () => {
      mounted = false;
    };
    // Re-run when switching between create/edit or when initialData changes
  }, [initialData]);

  // select/unselect device by clicking card
  const handleDeviceClick = (device) => {
    const isSelected = selectedDevices.find((d) => d.id === device.id);
    if (isSelected) {
      // remove from selected -> add back to available
      setSelectedDevices((prev) => prev.filter((d) => d.id !== device.id));
      setDevices((prev) => [...prev, device]);
    } else {
      // add to selected -> remove from available
      setSelectedDevices((prev) => [...prev, device]);
      setDevices((prev) => prev.filter((d) => d.id !== device.id));
    }
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    const payload = {
      group_name: name,
      description: desc,
      color,
      device_ids: selectedDevices.map((d) => d.id), // <-- FIXED FIELD NAME
    };

    if (initialData?.id) {
      // Update flow
      const url = API_URL ? `${API_URL}/groups/${initialData.id}` : `/groups/${initialData.id}`;
      if (typeof updateGroupApi === "function") {
        await updateGroupApi(initialData.id, payload);
      } else {
        await axios.put(url, payload);
      }
    } else {
      // Create flow
      await createGroup(payload);
      await fetchGroups();
      setName("");
      setDesc("");
      setColor("#6c63ff");
      setSelectedDevices([]);
    }

    onGroupCreated();
  } catch (err) {
    console.error(initialData?.id ? "Error updating group:" : "Error creating group:", err);
  }
};

  const formatLastSeen = (v) => {
    if (!v) return "-";
    try {
      const d = new Date(v);
      if (isNaN(d)) return v;
      return d.toLocaleString();
    } catch {
      return v;
    }
  };

  const getStatusColor = (status) => {
    if (status === "online") return "#4caf50";
    if (status === "offline") return "#f44336";
    return "#9e9e9e";
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
            {initialData?.id ? "Update Group" : "Create Group"}
          </button>
        </form>

        {/* Selected Devices */}
        <div style={styles.selectedTableContainer}>
          <h3 style={{ marginBottom: "0.5rem" }}>Selected Devices</h3>
          {selectedDevices.length > 0 ? (
            <div style={styles.deviceGrid}>
              {selectedDevices.map((device) => (
                <div
                  key={device.id}
                  style={{
                    ...styles.deviceCard,
                    borderLeft: `6px solid ${getStatusColor(device.status)}`,
                  }}
                  onClick={() => handleDeviceClick(device)}
                >
                  <h4 style={{ margin: 0 }}>{device.device_name}</h4>
                  <p><strong>IP:</strong> {device.ip_address}</p>
                  <p><strong>Status:</strong> {device.status}</p>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "0.5rem" }}>
              No devices selected
            </div>
          )}
        </div>
      </div>

      {/* Right panel: All Devices */}
      <div style={styles.rightPanel}>
        {devicesLoading && <div style={{ marginBottom: 8 }}>Loading devices…</div>}
        {devicesError && <div style={{ color: "red", marginBottom: 8 }}>{devicesError}</div>}

        <div style={styles.deviceGrid}>
          {Array.isArray(devices) && devices.length > 0 ? (
            devices.map((device) => (
              <div
                key={device.id}
                style={{
                  ...styles.deviceCard,
                  borderLeft: `6px solid ${getStatusColor(device.status)}`,
                }}
                onClick={() => handleDeviceClick(device)}
              >
                <h3 style={{ margin: 0 }}>{device.device_name}</h3>
                <p><strong>IP:</strong> {device.ip_address}</p>
                <p><strong>OS:</strong> {device.os}</p>
                <p>
                  <strong>Status:</strong>{" "}
                  <span style={{ color: getStatusColor(device.status) }}>
                    {device.status}
                  </span>
                </p>
                <p><strong>Connection:</strong> {device.connection_type}</p>
                <p><strong>Last Seen:</strong> {formatLastSeen(device.last_seen)}</p>
                <p><strong>Group:</strong> {device.group_name || "Not in group"}</p>
              </div>
            ))
          ) : (
            <div style={{ textAlign: "center", width: "100%" }}>
              {devicesLoading ? "Loading devices…" : "No devices found"}
            </div>
          )}
        </div>
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
    overflowY: "auto",
    backgroundColor: "#f5f7fb",
    padding: "1rem",
    borderRadius: "12px",
    boxShadow: "0 5px 20px rgba(0,0,0,0.1)",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    backgroundColor: "#fff",
    padding: "1.5rem",
    borderRadius: "16px",
    boxShadow: "0 8px 20px rgba(0,0,0,0.1)",
  },
  input: {
    width: "100%",
    padding: "0.85rem 1rem",
    borderRadius: "10px",
    border: "1px solid #ddd",
    fontSize: "0.95rem",
    background: "#fafafa",
    transition: "all 0.2s ease",
  },
  colorWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "0.8rem",
  },
  colorLabel: {
    fontWeight: "600",
  },
  colorInput: {
    width: "42px",
    height: "42px",
    border: "none",
    borderRadius: "50%",
    cursor: "pointer",
    boxShadow: "0 3px 6px rgba(0,0,0,0.2)",
  },
  button: {
    padding: "0.85rem",
    border: "none",
    borderRadius: "10px",
    background: "linear-gradient(135deg, #6c63ff, #8e2de2)",
    color: "#fff",
    fontWeight: "600",
    cursor: "pointer",
    fontSize: "1rem",
    transition: "all 0.3s ease",
  },
  selectedTableContainer: {
    backgroundColor: "#fff",
    padding: "0.8rem",
    borderRadius: "12px",
    boxShadow: "0 5px 20px rgba(0,0,0,0.05)",
    flex: 1,
    overflowY: "auto",
  },
  deviceGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: "1rem",
  },
  deviceCard: {
    backgroundColor: "#fff",
    borderRadius: "12px",
    padding: "1rem",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    display: "flex",
    flexDirection: "column",
    cursor: "pointer",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  },
  deviceCardHover: {
    transform: "translateY(-4px)",
    boxShadow: "0 6px 16px rgba(0,0,0,0.15)",
  },
};
