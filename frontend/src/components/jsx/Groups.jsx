import React, { useEffect, useState } from "react";
import axios from "axios";
import '../css/group.css';

export default function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [devices, setDevices] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewGroupModalOpen, setViewGroupModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state for creating a new group
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedDevices, setSelectedDevices] = useState([]);

  // State for viewing/editing an existing group
  const [currentGroup, setCurrentGroup] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editGroupName, setEditGroupName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSelectedDevices, setEditSelectedDevices] = useState([]);

  useEffect(() => {
    fetchGroups();
    fetchDevices();
  }, []);

  const fetchGroups = async () => {
    try {
      const res = await axios.get("/groups");
      setGroups(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch groups", err);
      setGroups([]);
    }
  };

  const fetchDevices = async () => {
    try {
      const res = await axios.get("/devices");
      setDevices(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch devices", err);
      setDevices([]);
    }
  };

  const toggleDeviceSelection = (id) => {
    setSelectedDevices((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const toggleEditDeviceSelection = (id) => {
    setEditSelectedDevices((prev) =>
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
      device_ids: selectedDevices,
    };

    try {
      setLoading(true);
      await axios.post("/groups", payload);
      alert("Group created successfully");

      fetchGroups();
      fetchDevices();

      setGroupName("");
      setDescription("");
      setSelectedDevices([]);
      setModalOpen(false);
    } catch (err) {
      console.error("Error creating group", err);
      alert("Failed to create group");
    } finally {
      setLoading(false);
    }
  };

  const openGroupModal = (group) => {
    setCurrentGroup(group);
    setEditGroupName(group.group_name);
    setEditDescription(group.description || "");
    // Find devices that belong to this group
    const groupDevices = devices
      .filter((d) => d.group_name === group.group_name)
      .map((d) => d.id);
    setEditSelectedDevices(groupDevices);
    setEditMode(false);
    setViewGroupModalOpen(true);
  };

  const handleUpdateGroup = async () => {
    if (!editGroupName.trim()) {
      alert("Group name is required");
      return;
    }
    const payload = {
      group_name: editGroupName,
      description: editDescription,
      device_ids: editSelectedDevices,
    };

    try {
      setLoading(true);
      await axios.put(`/groups/${currentGroup.id}`, payload);
      alert("Group updated successfully");

      fetchGroups();
      fetchDevices();

      setViewGroupModalOpen(false);
      setCurrentGroup(null);
      setEditMode(false);
    } catch (err) {
      console.error("Error updating group", err);
      alert("Failed to update group");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="container">
        <div className="groups-list">
          <h2>Device Groups</h2>
          {groups.length === 0 ? (
            <p>No groups created yet.</p>
          ) : (
            groups.map((group) => (
              <div className="group-item" key={group.id}>
                <span className="group-info">{group.group_name}</span>
                <span>
                  {group.device_count} device{group.device_count !== 1 ? "s" : ""}
                </span>
              </div>
            ))
          )}
          <button className="create-btn" onClick={() => setModalOpen(true)}>
            + Create Group
          </button>
        </div>

        {/* Create Group Modal */}
        {modalOpen && (
          <div className="modal" role="dialog" aria-modal="true">
            <div className="modal-left">
              <button
                className="close-btn"
                aria-label="Close"
                onClick={() => setModalOpen(false)}
              >
                &times;
              </button>
              <h3>Create New Group</h3>
              <input
                type="text"
                placeholder="Group Name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                autoFocus
              />
              <textarea
                rows={3}
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <button onClick={handleCreateGroup} disabled={loading}>
                {loading ? "Creating..." : "Create Group"}
              </button>
            </div>

            <div className="modal-right">
              <h3>Devices</h3>
              <table>
                <thead>
                  <tr>
                    <th>Select</th>
                    <th>Name</th>
                    <th>IP</th>
                    <th>MAC</th>
                    <th>OS</th>
                    <th>Status</th>
                    <th>Group</th>
                  </tr>
                </thead>
                <tbody>
                  {!Array.isArray(devices) || devices.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: "center" }}>
                        No devices found
                      </td>
                    </tr>
                  ) : (
                    devices.map((dev) => (
                      <tr key={dev.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedDevices.includes(dev.id)}
                            onChange={() => toggleDeviceSelection(dev.id)}
                            disabled={!!dev.group_name}
                            title={dev.group_name ? "Already in group" : ""}
                          />
                        </td>
                        <td>{dev.device_name}</td>
                        <td>{dev.ip_address}</td>
                        <td>{dev.mac_address}</td>
                        <td>{dev.os}</td>
                        <td>{dev.status}</td>
                        <td>
                          {dev.group_name ? (
                            <span className="group-label">{dev.group_name}</span>
                          ) : (
                            <span style={{ color: "#e91e63", fontWeight: "600" }}>
                              None
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Groups Table at Bottom */}
        <div className="groups-table-section">
          <h2>All Groups</h2>
          {groups.length === 0 ? (
            <p>No groups available.</p>
          ) : (
            <table className="groups-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Device Count</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <tr
                    key={group.id}
                    className="group-row"
                    onClick={() => openGroupModal(group)}
                    tabIndex={0}
                    role="button"
                    aria-pressed="false"
                  >
                    <td>{group.group_name}</td>
                    <td>{group.description || "-"}</td>
                    <td>{group.device_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* View/Edit Group Modal */}
        {viewGroupModalOpen && currentGroup && (
          <div className="modal" role="dialog" aria-modal="true">
            <div className="modal-left">
              <button
                className="close-btn"
                aria-label="Close"
                onClick={() => {
                  setViewGroupModalOpen(false);
                  setCurrentGroup(null);
                  setEditMode(false);
                }}
              >
                &times;
              </button>
              <h3>
                {editMode ? "Edit Group" : "Group Details"}:{" "}
                {!editMode ? currentGroup.group_name : ""}
              </h3>

              {editMode ? (
                <>
                  <input
                    type="text"
                    value={editGroupName}
                    onChange={(e) => setEditGroupName(e.target.value)}
                    autoFocus
                  />
                  <textarea
                    rows={3}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                  />
                  <button onClick={handleUpdateGroup} disabled={loading}>
                    {loading ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    className="cancel-btn"
                    onClick={() => setEditMode(false)}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <p>
                    <strong>Name:</strong> {currentGroup.group_name}
                  </p>
                  <p>
                    <strong>Description:</strong>{" "}
                    {currentGroup.description || "No description"}
                  </p>
                  <button onClick={() => setEditMode(true)}>Edit</button>
                </>
              )}
            </div>

            <div className="modal-right">
              <h3>Devices in Group</h3>
              <table>
                <thead>
                  <tr>
                    <th>{editMode ? "Select" : "Device Name"}</th>
                    <th>IP</th>
                    <th>MAC</th>
                    <th>OS</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.filter(d => d.group_name === currentGroup.group_name).length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: "center" }}>
                        No devices in this group
                      </td>
                    </tr>
                  ) : (
                    devices
                      .filter((d) => d.group_name === currentGroup.group_name)
                      .map((dev) => (
                        <tr key={dev.id}>
                          <td>
                            {editMode ? (
                              <input
                                type="checkbox"
                                checked={editSelectedDevices.includes(dev.id)}
                                onChange={() => toggleEditDeviceSelection(dev.id)}
                              />
                            ) : (
                              dev.device_name
                            )}
                          </td>
                          <td>{dev.ip_address}</td>
                          <td>{dev.mac_address}</td>
                          <td>{dev.os}</td>
                          <td>{dev.status}</td>
                        </tr>
                      ))
                  )}
                  {/* If in edit mode, show devices not in group to add */}
                  {editMode &&
                    devices
                      .filter((d) => d.group_name !== currentGroup.group_name)
                      .map((dev) => (
                        <tr key={dev.id} className="not-in-group">
                          <td>
                            <input
                              type="checkbox"
                              checked={editSelectedDevices.includes(dev.id)}
                              onChange={() => toggleEditDeviceSelection(dev.id)}
                            />
                            <span className="device-name">{dev.device_name}</span>
                          </td>
                          <td>{dev.ip_address}</td>
                          <td>{dev.mac_address}</td>
                          <td>{dev.os}</td>
                          <td>{dev.status}</td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
