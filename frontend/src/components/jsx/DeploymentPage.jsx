import React, { useState, useEffect } from "react";
import axios from "axios";
import "../css/DeploymentPage.css";

export default function DeploymentPage() {
  // hardcoded software list
  const HARD_CODED_SOFTWARES = [
    { id: 1, name: "7-Zip" },
    { id: 2, name: "Google Chrome" },
    { id: 3, name: "Node.js" },
    { id: 4, name: "Git" },
    { id: 5, name: "Python 3.11" }
  ];

  const [softwares] = useState(HARD_CODED_SOFTWARES);
  const [selectedSoftwares, setSelectedSoftwares] = useState([]);

  const [groups, setGroups] = useState([]);
  const [groupsError, setGroupsError] = useState(null);
  const [groupsLoading, setGroupsLoading] = useState(false);

  const [devices, setDevices] = useState([]);
  const [devicesError, setDevicesError] = useState(null);
  const [devicesLoading, setDevicesLoading] = useState(false);

  const [selectedGroups, setSelectedGroups] = useState([]);
  const [selectedDevices, setSelectedDevices] = useState([]);

  const [progress, setProgress] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [retryIds, setRetryIds] = useState([]);
  const [loading, setLoading] = useState(false);

  const API_BASE = import.meta.env.VITE_API_URL.replace(/\/$/, "");

  useEffect(() => {
    let mounted = true;

    const loadGroups = async () => {
      setGroupsLoading(true);
      setGroupsError(null);
      try {
        const res = await axios.get(`${API_BASE}/groups`);
        if (!mounted) return;
        if (Array.isArray(res.data)) setGroups(res.data);
        else if (Array.isArray(res.data.groups)) setGroups(res.data.groups);
        else setGroups([]);
      } catch (err) {
        if (!mounted) return;
        console.error("groups load error:", err);
        setGroups([]);
        setGroupsError("Failed to load groups");
      } finally {
        if (mounted) setGroupsLoading(false);
      }
    };

    const loadDevices = async () => {
      setDevicesLoading(true);
      setDevicesError(null);
      try {
        const res = await axios.get(`${API_BASE}/groups/devices`);
        if (!mounted) return;
        if (Array.isArray(res.data)) setDevices(res.data);
        else if (Array.isArray(res.data.devices)) setDevices(res.data.devices);
        else setDevices([]);
      } catch (err) {
        if (!mounted) return;
        console.error("devices load error:", err);
        setDevices([]);
        setDevicesError("Failed to load devices");
      } finally {
        if (mounted) setDevicesLoading(false);
      }
    };

    loadGroups();
    loadDevices();

    return () => { mounted = false; };
  }, []);

  // toggle software selection
  const toggleSoftware = (id) => {
    setSelectedSoftwares(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // toggle group selection via checkbox
  const toggleGroup = (id) => {
    setSelectedGroups(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // toggle device selection via checkbox
  const toggleDevice = (id) => {
    setSelectedDevices(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleInstall = async () => {
    if (selectedSoftwares.length === 0) {
      alert("Select at least one software.");
      return;
    }
    if (selectedGroups.length === 0 && selectedDevices.length === 0) {
      alert("Select at least one group or device.");
      return;
    }

    setLoading(true);
    setShowModal(true);
    try {
      const res = await axios.post(`${API_BASE}/deployments/install`, {
        group_ids: selectedGroups,
        device_ids: selectedDevices,
        software_ids: selectedSoftwares
      });
      const deploymentId = res.data.deployment_id;
      pollProgress(deploymentId);
    } catch (err) {
      console.error("start deployment error:", err);
      alert("Failed to start deployment. See console for details.");
      setShowModal(false);
    } finally {
      setLoading(false);
    }
  };

  const pollProgress = (deploymentId) => {
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`${API_BASE}/deployments/${deploymentId}/progress`);
        setProgress(res.data.devices || []);
        if (res.data.completed) clearInterval(interval);
      } catch (err) {
        console.error("poll progress error:", err);
        clearInterval(interval);
      }
    }, 2000);
  };

  useEffect(() => {
    setRetryIds(progress.filter(d => d.status === "failed").map(d => d.device_id));
  }, [progress]);

  const handleRetry = async (deviceIds = retryIds) => {
    if (!deviceIds || deviceIds.length === 0) return;
    try {
      await axios.post(`${API_BASE}/deployments/retry`, { device_ids: deviceIds });
      alert("Retry request submitted.");
    } catch (err) {
      console.error("retry error:", err);
      alert("Retry failed.");
    }
  };

  return (
    <div className="deploy-container">
      <h2>Software Deployment</h2>

      <div className="deploy-card">
        <section className="softwares-panel">
          <label>Select Softwares</label>
          <div className="softwares-list">
            {softwares.map(s => (
              <label key={s.id} className="software-item">
                <input
                  type="checkbox"
                  checked={selectedSoftwares.includes(s.id)}
                  onChange={() => toggleSoftware(s.id)}
                />
                <span>{s.name}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="tables-row">
          <div className="table-panel">
            <div className="panel-header">
              <label>Groups</label>
              {groupsLoading && <span className="loading-text">Loading…</span>}
              {groupsError && <span className="load-error">{groupsError}</span>}
            </div>
            <div className="scroll-table">
              <table className="list-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>Group Name</th>
                    <th>Count</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.length === 0 && !groupsLoading && !groupsError && (
                    <tr><td colSpan={3}>No groups found</td></tr>
                  )}
                  {groups.map(g => (
                    <tr key={g.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedGroups.includes(g.id)}
                          onChange={() => toggleGroup(g.id)}
                        />
                      </td>
                      <td>{g.group_name}</td>
                      <td>{g.member_count ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="table-panel">
            <div className="panel-header">
              <label>Devices</label>
              {devicesLoading && <span className="loading-text">Loading…</span>}
              {devicesError && <span className="load-error">{devicesError}</span>}
            </div>
            <div className="scroll-table">
              <table className="list-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>Device Name</th>
                    <th>IP / Host</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.length === 0 && !devicesLoading && !devicesError && (
                    <tr><td colSpan={3}>No devices found</td></tr>
                  )}
                  {devices.map(d => (
                    <tr key={d.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedDevices.includes(d.id)}
                          onChange={() => toggleDevice(d.id)}
                        />
                      </td>
                      <td>{d.device_name || d.name || `Device ${d.id}`}</td>
                      <td>{d.ip_address ?? d.host ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <div className="actions-row">
          <button
            className="deploy-btn"
            onClick={handleInstall}
            disabled={loading || (selectedGroups.length === 0 && selectedDevices.length === 0) || selectedSoftwares.length === 0}
          >
            {loading ? "Deploying..." : "Install"}
          </button>
        </div>
      </div>

      {showModal && (
        <ProgressModal progress={progress} onRetry={handleRetry} retryIds={retryIds} />
      )}
    </div>
  );
}

function ProgressModal({ progress, onRetry, retryIds }) {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Installation Progress</h3>
        <table className="progress-table">
          <thead>
            <tr>
              <th>Device</th>
              <th>Status</th>
              <th>Progress</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {Array.isArray(progress) && progress.length === 0 && (
              <tr><td colSpan={4}>No progress yet</td></tr>
            )}
            {Array.isArray(progress) && progress.map(d => (
              <tr key={d.device_id}>
                <td>{d.device_name}</td>
                <td className={d.status === "failed" ? "failed" : "success"}>{d.status}</td>
                <td>
                  <progress value={d.percent ?? 0} max="100" />
                  {d.percent ?? 0}%
                </td>
                <td>
                  {d.status === "failed" && <button onClick={() => onRetry([d.device_id])}>Retry</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {retryIds.length > 0 && (
          <button className="retry-btn" onClick={() => onRetry(retryIds)}>Retry All Failed</button>
        )}
      </div>
    </div>
  );
}
