import React, { useEffect, useState } from "react";
import { fetchGroups, deleteGroup } from "./GroupingApi.js";
import GroupForm from "./GroupForm.jsx";
import GroupDeviceManager from "./GroupDeviceManager.jsx";
import {
  FaTrash,
  FaPencilAlt,
  FaCogs,
  FaPlus,
  FaUsers,
  FaDesktop,
  FaExclamationTriangle,
} from "react-icons/fa";

export default function GroupList() {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null); // track edit vs create

  // Normalize groups response to a plain array
  const normalizeGroups = (res) => {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res.groups)) return res.groups;
    if (Array.isArray(res?.data?.groups)) return res.data.groups;
    if (Array.isArray(res?.data?.results)) return res.data.results;
    return [];
  };

  const loadGroups = async () => {
    try {
      const res = await fetchGroups();
      const list = normalizeGroups(res);
      setGroups(list);
    } catch (err) {
      console.error("Error fetching groups:", err);
      setGroups([]);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const handleDelete = async (id) => {
    try {
      await deleteGroup(id);
    } finally {
      loadGroups();
    }
  };

  // Safely get device count on a group (supports multiple API shapes)
  const getDeviceCount = (g) => {
    if (Array.isArray(g?.devices)) return g.devices.length;
    if (Array.isArray(g?.device_ids)) return g.device_ids.length;
    if (typeof g?.device_count === "number") return g.device_count;
    return 0;
  };

  const totalGroups = groups.length;
  const totalDevices = groups.reduce((acc, g) => acc + getDeviceCount(g), 0);
  const groupsWithErrors = groups.filter(
    (g) => Array.isArray(g?.deploymentErrors) && g.deploymentErrors.length > 0
  ).length;

  return (
    <div style={styles.container}>
      {/* Top bar */}
      <div style={styles.topBar}>
        <button
          style={styles.addButton}
          onClick={() => {
            setEditingGroup(null); // create mode
            setShowModal(true);
          }}
        >
          <FaPlus style={{ marginRight: "6px" }} /> Add Group
        </button>

        {/* Refresh button */}
        <button
          style={{ ...styles.addButton, marginLeft: "10px", backgroundColor: "#10B981" }}
          onClick={loadGroups}
        >
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div style={styles.statsGrid}>
        <div
          style={{
            ...styles.statCard,
            background: "linear-gradient(135deg, #6366F1, #8b5cf6)",
          }}
        >
          <FaUsers style={styles.statIcon} />
          <div>
            <h3 style={styles.statValue}>{totalGroups}</h3>
            <p style={styles.statLabel}>Total Groups</p>
          </div>
        </div>
        <div
          style={{
            ...styles.statCard,
            background: "linear-gradient(135deg, #ef4444, #f97316)",
          }}
        >
          <FaDesktop style={styles.statIcon} />
          <div>
            <h3 style={styles.statValue}>{totalDevices}</h3>
            <p style={styles.statLabel}>Total Devices</p>
          </div>
        </div>
        <div
          style={{
            ...styles.statCard,
            background: "linear-gradient(135deg, #f59e0b, #fbbf24)",
          }}
        >
          <FaExclamationTriangle style={styles.statIcon} />
          <div>
            <h3 style={styles.statValue}>{groupsWithErrors}</h3>
            <p style={styles.statLabel}>Groups with Errors</p>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div
          style={styles.modalOverlay}
          onClick={() => {
            setShowModal(false);
            setEditingGroup(null);
          }}
        >
          <div
            style={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <GroupForm
              initialData={editingGroup} // pass when editing
              onGroupCreated={() => {
                loadGroups();
                setShowModal(false);
                setEditingGroup(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Groups List */}
      <div style={styles.groupList}>
        {groups.map((g) => (
          <div
            key={g.id}
            style={{
              ...styles.groupCard,
              border: `2.5px solid ${g.color || "#6366F1"}`,
            }}
          >
            <div style={styles.groupHeader}>
              <h3 style={styles.groupName}>{g.group_name}</h3>
              <div style={styles.groupActions}>
                <FaCogs
                  style={{ ...styles.icon, color: "#6366F1" }}
                  title="Manage Devices"
                  onClick={() => setSelectedGroup(g)}
                />
                <FaPencilAlt
                  style={{ ...styles.icon, color: "#f59e0b" }}
                  title="Update Group"
                  onClick={() => {
                    setEditingGroup(g); // edit mode
                    setShowModal(true);
                  }}
                />
                <FaTrash
                  style={{ ...styles.icon, color: "#ef4444" }}
                  title="Delete Group"
                  onClick={() => handleDelete(g.id)}
                />
              </div>
            </div>
            {g.description && (
              <p style={styles.groupDescription}>{g.description}</p>
            )}
            <div style={styles.groupMeta}>
              <FaDesktop style={{ marginRight: "6px", color: "#4b5563" }} />
              {getDeviceCount(g)} Devices
            </div>
          </div>
        ))}
      </div>

      {/* Device Manager */}
      {selectedGroup && (
        <GroupDeviceManager
          group={selectedGroup}
          onClose={() => setSelectedGroup(null)}
        />
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: "2rem",
    fontFamily: "'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    backgroundColor: "#f9fafb",
    minHeight: "100vh",
    color: "#111827",
  },
  topBar: {
    display: "flex",
    justifyContent: "flex-start",
    marginBottom: "1.5rem",
  },
  addButton: {
    padding: "0.6rem 1.2rem",
    backgroundColor: "#6366F1",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    fontSize: "1rem",
    transition: "background 0.3s ease",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "1.2rem",
    marginBottom: "2rem",
  },
  statCard: {
    display: "flex",
    alignItems: "center",
    padding: "1rem 1.2rem",
    borderRadius: "12px",
    color: "#fff",
    boxShadow: "0 6px 12px rgba(0,0,0,0.08)",
  },
  statIcon: {
    fontSize: "2.2rem",
    marginRight: "0.8rem",
    opacity: 0.9,
  },
  statValue: {
    margin: 0,
    fontSize: "1.6rem",
    fontWeight: "700",
  },
  statLabel: {
    margin: 0,
    fontSize: "0.85rem",
    opacity: 0.9,
  },
  groupList: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  groupCard: {
    background: "#fff",
    borderRadius: "10px",
    padding: "1.2rem",
    boxShadow: "0 4px 10px rgba(0,0,0,0.06)",
    display: "flex",
    flexDirection: "column",
    width: "100%",
    transition: "transform 0.2s, box-shadow 0.2s",
  },
  groupHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "0.5rem",
  },
  groupName: {
    margin: 0,
    fontSize: "1.1rem",
    fontWeight: "600",
    color: "#111827",
  },
  groupDescription: {
    fontSize: "0.9rem",
    color: "#4b5563",
    marginBottom: "0.75rem",
  },
  groupMeta: {
    fontSize: "0.9rem",
    color: "#374151",
    display: "flex",
    alignItems: "center",
    fontWeight: "500",
  },
  groupActions: {
    display: "flex",
    gap: "0.8rem",
  },
  icon: {
    cursor: "pointer",
    fontSize: "1.15rem",
    transition: "transform 0.2s",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: "2rem",
    borderRadius: "12px",
    minWidth: "400px",
    maxWidth: "90%",
  },
};
