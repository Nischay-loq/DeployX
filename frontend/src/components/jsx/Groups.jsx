import React, { useEffect, useState } from "react";
import axios from "axios";

export default function GroupsPage() {
  const [devices, setDevices] = useState([]);
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [ipStart, setIpStart] = useState("");
  const [ipEnd, setIpEnd] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch devices on mount
  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      const res = await axios.get("/devices");
      console.log("API devices response:", res.data);

      // Safely extract devices array
      if (Array.isArray(res.data)) {
        setDevices(res.data);
      } else if (res.data && Array.isArray(res.data.devices)) {
        setDevices(res.data.devices);
      } else {
        console.warn("Devices data format not recognized, setting empty list");
        setDevices([]);
      }
    } catch (err) {
      console.error("Error fetching devices", err);
      setDevices([]);
    }
  };

  const handleDeviceSelect = (id) => {
    setSelectedDevices((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      alert("Group name is required");
      return;
    }

    const payload = {
      group_name: groupName,
      description,
      device_ids: selectedDevices.length > 0 ? selectedDevices : undefined,
      ip_start: ipStart || undefined,
      ip_end: ipEnd || undefined,
    };

    try {
      setLoading(true);
      await axios.post("/groups", payload);
      alert("Group created successfully");

      // Reset form
      setGroupName("");
      setDescription("");
      setSelectedDevices([]);
      setIpStart("");
      setIpEnd("");

      // Refresh devices list
      fetchDevices();
    } catch (err) {
      console.error("Error creating group", err);
      alert("Failed to create group");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Connected Devices</h2>

      <table
        border="1"
        cellPadding="6"
        style={{ width: "100%", marginBottom: "20px" }}
      >
        <thead>
          <tr>
            <th>Select</th>
            <th>Device Name</th>
            <th>IP Address</th>
            <th>MAC Address</th>
            <th>OS</th>
            <th>Status</th>
            <th>Connection</th>
            <th>Last Seen</th>
            <th>Group</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(devices) && devices.length > 0 ? (
            devices.map((dev) => (
              <tr key={dev.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedDevices.includes(dev.id)}
                    onChange={() => handleDeviceSelect(dev.id)}
                  />
                </td>
                <td>{dev.device_name}</td>
                <td>{dev.ip_address}</td>
                <td>{dev.mac_address}</td>
                <td>{dev.os}</td>
                <td>{dev.status}</td>
                <td>{dev.connection_type}</td>
                <td>{dev.last_seen}</td>
                <td>{dev.group_name || "-"}</td>
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

      <h3>Create Device Group</h3>
      <div style={{ marginBottom: "10px" }}>
        <input
          type="text"
          placeholder="Group Name"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          style={{ marginRight: "10px" }}
        />
        <input
          type="text"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ marginRight: "10px" }}
        />
      </div>

      <div style={{ marginBottom: "10px" }}>
        <input
          type="text"
          placeholder="IP Start (e.g. 192.168.1.1)"
          value={ipStart}
          onChange={(e) => setIpStart(e.target.value)}
          style={{ marginRight: "10px" }}
        />
        <input
          type="text"
          placeholder="IP End (e.g. 192.168.1.50)"
          value={ipEnd}
          onChange={(e) => setIpEnd(e.target.value)}
        />
      </div>

      <button onClick={handleCreateGroup} disabled={loading}>
        {loading ? "Creating..." : "Create Group"}
      </button>
    </div>
  );
}
