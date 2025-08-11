import React, { useEffect, useState } from "react";
import axios from "axios";
import '../css/group.css';

const API_BASE_URL = "http://localhost:8000"; // Adjust your backend URL

export default function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [devices, setDevices] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewGroupModalOpen, setViewGroupModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Create group form state
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedDevices, setSelectedDevices] = useState([]);

  // View/Edit group state
  const [currentGroup, setCurrentGroup] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editGroupName, setEditGroupName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSelectedDevices, setEditSelectedDevices] = useState([]);
  const [actionLoading, setActionLoading] = useState(false); // separate loading for actions

  useEffect(() => {
    fetchGroups();
    fetchDevices();
  }, []);

  // Fetch all groups from API
  const fetchGroups = async () => {
    try {
      setError(null);
      const { data } = await axios.get(`${API_BASE_URL}/groups`);
      setGroups(Array.isArray(data) ? data : []);
    } catch (err) {
      setError("Failed to fetch groups");
      console.error(err);
    }
  };

  // Fetch all devices from API
  const fetchDevices = async () => {
    try {
      setError(null);
      const { data } = await axios.get(`${API_BASE_URL}/devices`);
      setDevices(Array.isArray(data) ? data : []);
    } catch (err) {
      setError("Failed to fetch devices");
      console.error(err);
    }
  };

  // Toggle device selection (create or edit mode)
  const toggleSelection = (id, isEdit = false) => {
    if (isEdit) {
      setEditSelectedDevices(prev =>
        prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
      );
    } else {
      setSelectedDevices(prev =>
        prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
      );
    }
  };

  // Validate group name input
  const isGroupNameValid = (name) => name.trim().length > 0;

  // Create new group
  const handleCreateGroup = async () => {
    if (!isGroupNameValid(groupName)) {
      alert("Group name is required");
      return;
    }

    const payload = {
      group_name: groupName.trim(),
      description: description.trim(),
      device_ids: selectedDevices,
    };

    try {
      setActionLoading(true);
      await axios.post(`${API_BASE_URL}/groups`, payload);
      alert("Group created successfully");
      await refreshDataAfterAction();
      resetCreateForm();
      setModalOpen(false);
    } catch (err) {
      alert("Failed to create group");
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Update existing group
  const handleUpdateGroup = async () => {
    if (!isGroupNameValid(editGroupName)) {
      alert("Group name is required");
      return;
    }

    const payload = {
      group_name: editGroupName.trim(),
      description: editDescription.trim(),
      device_ids: editSelectedDevices,
    };

    try {
      setActionLoading(true);
      await axios.put(`${API_BASE_URL}/groups/${currentGroup.id}`, payload);
      alert("Group updated successfully");
      await refreshDataAfterAction();
      closeViewGroupModal();
    } catch (err) {
      alert("Failed to update group");
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Delete group with confirmation
  const handleDeleteGroup = async () => {
    if (!window.confirm(`Are you sure you want to delete group "${currentGroup.group_name}"? This cannot be undone.`)) {
      return;
    }

    try {
      setActionLoading(true);
      await axios.delete(`${API_BASE_URL}/groups/${currentGroup.id}`);
      alert("Group deleted successfully");
      await refreshDataAfterAction();
      closeViewGroupModal();
    } catch (err) {
      alert("Failed to delete group");
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Refresh groups and devices after any action
  const refreshDataAfterAction = async () => {
    await Promise.all([fetchGroups(), fetchDevices()]);
  };

  // Reset create form inputs
  const resetCreateForm = () => {
    setGroupName("");
    setDescription("");
    setSelectedDevices([]);
  };

  // Open modal to view/edit a group
  const openGroupModal = (group) => {
    setCurrentGroup(group);
    setEditGroupName(group.group_name);
    setEditDescription(group.description || "");

    // Find devices belonging to this group by matching group_name
    const groupDevices = devices
      .filter(d => d.group_name === group.group_name)
      .map(d => d.id);

    setEditSelectedDevices(groupDevices);
    setEditMode(false);
    setViewGroupModalOpen(true);
  };

  // Close view/edit group modal and reset state
  const closeViewGroupModal = () => {
    setViewGroupModalOpen(false);
    setCurrentGroup(null);
    setEditMode(false);
    setEditSelectedDevices([]);
    setEditGroupName("");
    setEditDescription("");
  };

  return (
    <div className="container" aria-live="polite" aria-busy={loading || actionLoading}>
      <header>
        <h1>Device Groups Management</h1>
      </header>

      {error && (
        <div role="alert" className="error-message" tabIndex={-1}>
          {error}
        </div>
      )}

      <section className="groups-list" aria-label="Summary of device groups">
        <h2>Device Groups</h2>
        {groups.length === 0 ? (
          <p>No groups created yet.</p>
        ) : (
          groups.map(({ id, group_name, device_count }) => (
            <div className="group-item" key={id}>
              <span className="group-info">{group_name}</span>
              <span>
                {device_count} device{device_count !== 1 ? "s" : ""}
              </span>
            </div>
          ))
        )}
        <button
          className="create-btn"
          onClick={() => setModalOpen(true)}
          aria-haspopup="dialog"
          aria-controls="create-group-modal"
          aria-expanded={modalOpen}
        >
          + Create Group
        </button>
      </section>

      {/* Create Group Modal */}
      {modalOpen && (
        <div
          id="create-group-modal"
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-group-title"
          tabIndex={-1}
          onKeyDown={(e) => e.key === "Escape" && setModalOpen(false)}
        >
          <div className="modal-left">
            <button
              className="close-btn"
              aria-label="Close Create Group Modal"
              onClick={() => setModalOpen(false)}
            >
              &times;
            </button>
            <h3 id="create-group-title">Create New Group</h3>
            <label htmlFor="group-name-input" className="sr-only">Group Name</label>
            <input
              id="group-name-input"
              type="text"
              placeholder="Group Name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              autoFocus
              aria-required="true"
              aria-invalid={!isGroupNameValid(groupName)}
            />
            <label htmlFor="description-textarea" className="sr-only">Description</label>
            <textarea
              id="description-textarea"
              rows={3}
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <button
              onClick={handleCreateGroup}
              disabled={actionLoading || !isGroupNameValid(groupName)}
              aria-disabled={actionLoading || !isGroupNameValid(groupName)}
            >
              {actionLoading ? "Creating..." : "Create Group"}
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
                  devices.map(({ id, device_name, ip_address, mac_address, os, status, group_name }) => (
                    <tr key={id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedDevices.includes(id)}
                          onChange={() => toggleSelection(id, false)}
                          disabled={!!group_name}
                          title={group_name ? "Already in a group" : "Select device"}
                          aria-label={`Select device ${device_name}`}
                        />
                      </td>
                      <td>{device_name}</td>
                      <td>{ip_address}</td>
                      <td>{mac_address}</td>
                      <td>{os}</td>
                      <td>{status}</td>
                      <td>
                        {group_name ? (
                          <span className="group-label">{group_name}</span>
                        ) : (
                          <span style={{ color: "#e91e63", fontWeight: "600" }}>None</span>
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

      {/* Groups Table */}
      <section
        className="groups-table-section"
        aria-label="All device groups table"
        tabIndex={-1}
      >
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
              {groups.map(({ id, group_name, description, device_count }) => (
                <tr
                  key={id}
                  className="group-row"
                  onClick={() => openGroupModal({ id, group_name, description, device_count })}
                  tabIndex={0}
                  role="button"
                  aria-pressed="false"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      openGroupModal({ id, group_name, description, device_count });
                    }
                  }}
                >
                  <td>{group_name}</td>
                  <td>{description || "-"}</td>
                  <td>{device_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* View/Edit Group Modal */}
      {viewGroupModalOpen && currentGroup && (
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="view-group-title"
          tabIndex={-1}
          onKeyDown={(e) => e.key === "Escape" && closeViewGroupModal()}
        >
          <div className="modal-left">
            <button
              className="close-btn"
              aria-label="Close View Group Modal"
              onClick={closeViewGroupModal}
            >
              &times;
            </button>
            <h3 id="view-group-title">Group Details</h3>

            {editMode ? (
              <>
                <label htmlFor="edit-group-name" className="sr-only">Group Name</label>
                <input
                  id="edit-group-name"
                  type="text"
                  value={editGroupName}
                  onChange={(e) => setEditGroupName(e.target.value)}
                  aria-required="true"
                  aria-invalid={!isGroupNameValid(editGroupName)}
                  autoFocus
                />
                <label htmlFor="edit-description" className="sr-only">Description</label>
                <textarea
                  id="edit-description"
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
                <button
                  onClick={handleUpdateGroup}
                  disabled={actionLoading || !isGroupNameValid(editGroupName)}
                  aria-disabled={actionLoading || !isGroupNameValid(editGroupName)}
                >
                  {actionLoading ? "Updating..." : "Save Changes"}
                </button>
                <button
                  className="cancel-btn"
                  onClick={() => setEditMode(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <p><strong>Name:</strong> {currentGroup.group_name}</p>
                <p><strong>Description:</strong> {currentGroup.description || "-"}</p>
                <p><strong>Devices:</strong></p>
                <ul className="device-list">
                  {devices
                    .filter(d => d.group_name === currentGroup.group_name)
                    .map(d => (
                      <li key={d.id}>
                        {d.device_name} ({d.ip_address})
                      </li>
                    ))}
                  {devices.filter(d => d.group_name === currentGroup.group_name).length === 0 && (
                    <li>No devices assigned</li>
                  )}
                </ul>
                <button onClick={() => setEditMode(true)}>Edit Group</button>
                <button onClick={handleDeleteGroup} disabled={actionLoading} className="delete-btn">
                  {actionLoading ? "Deleting..." : "Delete Group"}
                </button>
              </>
            )}
          </div>

          {/* Device selection when editing */}
          {editMode && (
            <div className="modal-right">
              <h3>Select Devices</h3>
              <table>
                <thead>
                  <tr>
                    <th>Select</th>
                    <th>Name</th>
                    <th>IP</th>
                    <th>MAC</th>
                    <th>OS</th>
                    <th>Status</th>
                    <th>Current Group</th>
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
                    devices.map(({ id, device_name, ip_address, mac_address, os, status, group_name }) => {
                      // Allow selecting device if it belongs to current group or no group
                      const disabled = group_name && group_name !== currentGroup.group_name;
                      return (
                        <tr key={id}>
                          <td>
                            <input
                              type="checkbox"
                              checked={editSelectedDevices.includes(id)}
                              onChange={() => toggleSelection(id, true)}
                              disabled={disabled}
                              aria-label={`Select device ${device_name}`}
                              title={disabled ? "Device belongs to another group" : "Select device"}
                            />
                          </td>
                          <td>{device_name}</td>
                          <td>{ip_address}</td>
                          <td>{mac_address}</td>
                          <td>{os}</td>
                          <td>{status}</td>
                          <td>
                            {group_name ? (
                              <span className="group-label">{group_name}</span>
                            ) : (
                              <span style={{ color: "#e91e63", fontWeight: "600" }}>None</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
