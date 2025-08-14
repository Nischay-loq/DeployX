import React, { useEffect, useState } from "react";
import { fetchGroups, deleteGroup } from "./GroupingApi.js";
import GroupForm from "./GroupForm.jsx";
import GroupDeviceManager from "./GroupDeviceManager.jsx";
import { FaTrash, FaPencilAlt, FaCogs, FaPlus, FaUsers, FaDesktop, FaExclamationTriangle } from "react-icons/fa";

export default function GroupList() {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const loadGroups = async () => {
    const res = await fetchGroups();
    setGroups(res.data);
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const handleDelete = async (id) => {
    await deleteGroup(id);
    loadGroups();
  };

  const totalGroups = groups.length;
  const totalDevices = groups.reduce((acc, g) => acc + g.devices.length, 0);

  // Count of groups with at least one deployment error
  const groupsWithErrors = groups.filter(g => g.deploymentErrors && g.deploymentErrors.length > 0).length;

  return (
    <div style={styles.container}>
      {/* Top bar with stats */}
      <div style={styles.topBar}>
        <button style={styles.addButton} onClick={() => setShowModal(true)}>
          <FaPlus style={{ marginRight: "5px" }} /> Add Group
        </button>
      </div>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <div style={{ ...styles.statCard, background: "linear-gradient(135deg, #6c63ff, #8e7dff)" }}>
          <FaUsers style={styles.statIcon} />
          <div>
            <h3 style={styles.statValue}>{totalGroups}</h3>
            <p style={styles.statLabel}>Total Groups</p>
          </div>
        </div>
        <div style={{ ...styles.statCard, background: "linear-gradient(135deg, #ff4d4f, #ff7875)" }}>
          <FaDesktop style={styles.statIcon} />
          <div>
            <h3 style={styles.statValue}>{totalDevices}</h3>
            <p style={styles.statLabel}>Total Devices</p>
          </div>
        </div>
        <div style={{ ...styles.statCard, background: "linear-gradient(135deg, #ff9900, #ffc14d)" }}>
          <FaExclamationTriangle style={styles.statIcon} />
          <div>
            <h3 style={styles.statValue}>{groupsWithErrors}</h3>
            <p style={styles.statLabel}>Groups with Deployment Errors</p>
          </div>
        </div>
      </div>

      {/* Modal for creating group */}
      {showModal && (
        <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <GroupForm
              onGroupCreated={() => {
                loadGroups();
                setShowModal(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Groups Table */}
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Group Name</th>
            <th style={styles.th}>Description</th>
            <th style={styles.th}>Color</th>
            <th style={styles.th}>Devices</th>
            <th style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <tr key={g.id} style={styles.tr}>
              <td style={styles.td}>{g.group_name}</td>
              <td style={styles.td}>{g.description}</td>
              <td style={styles.td}>
                <div style={{ ...styles.colorBox, backgroundColor: g.color }} />
              </td>
              <td style={styles.td}>{g.devices.length}</td>
              <td style={styles.td}>
                <FaCogs
                  style={{ ...styles.icon, color: "#6c63ff" }}
                  title="Manage Devices"
                  onClick={() => setSelectedGroup(g)}
                />
                <FaPencilAlt
                  style={{ ...styles.icon, color: "#ffa500" }}
                  title="Update Group"
                  onClick={() => setShowModal(true)}
                />
                <FaTrash
                  style={{ ...styles.icon, color: "#ff4d4f" }}
                  title="Delete Group"
                  onClick={() => handleDelete(g.id)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

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
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    backgroundColor: "#f5f7fa",
    minHeight: "100vh",
  },
  topBar: {
    display: "flex",
    justifyContent: "flex-start",
    marginBottom: "1.5rem",
  },
  addButton: {
    padding: "0.5rem 1rem",
    backgroundColor: "#6c63ff",
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
    gap: "1.5rem",
    marginBottom: "2rem",
  },
  statCard: {
    display: "flex",
    alignItems: "center",
    padding: "1rem",
    borderRadius: "12px",
    color: "#fff",
    boxShadow: "0 6px 15px rgba(0,0,0,0.1)",
    transition: "transform 0.3s ease, box-shadow 0.3s ease",
    cursor: "pointer",
  },
  statIcon: {
    fontSize: "2.5rem",
    marginRight: "1rem",
  },
  statValue: {
    margin: 0,
    fontSize: "1.8rem",
    fontWeight: "700",
  },
  statLabel: {
    margin: 0,
    fontSize: "0.9rem",
    opacity: 0.9,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    backgroundColor: "#fff",
    borderRadius: "12px",
    overflow: "hidden",
    boxShadow: "0 8px 20px rgba(0,0,0,0.1)",
  },
  th: {
    padding: "1rem",
    backgroundColor: "#6c63ff",
    color: "#fff",
    textAlign: "left",
  },
  tr: {
    borderBottom: "1px solid #eee",
    transition: "background 0.3s",
  },
  td: {
    padding: "0.75rem 1rem",
    verticalAlign: "middle",
  },
  colorBox: {
    width: "30px",
    height: "30px",
    borderRadius: "6px",
    border: "1px solid #ccc",
  },
  icon: {
    cursor: "pointer",
    fontSize: "1.2rem",
    marginRight: "0.7rem",
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
