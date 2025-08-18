import React, { useState, useEffect } from "react";
import axios from "axios";
import "./LogsPage.css";

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [filters, setFilters] = useState({
    deployment_id: "",
    device_id: "",
    log_type: "",
    start: "",
    end: ""
  });

  useEffect(() => { fetchLogs(); }, [filters]);

  const fetchLogs = async () => {
    const params = {};
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
    const res = await axios.get("/api/logs", { params });
    setLogs(res.data);
  };

  return (
    <div className="logs-container">
      <h2>Deployment Logs</h2>
      <div className="logs-filter">
        <input placeholder="Deployment ID" value={filters.deployment_id} onChange={e => setFilters(f => ({ ...f, deployment_id: e.target.value }))} />
        <input placeholder="Device ID" value={filters.device_id} onChange={e => setFilters(f => ({ ...f, device_id: e.target.value }))} />
        <select value={filters.log_type} onChange={e => setFilters(f => ({ ...f, log_type: e.target.value }))}>
          <option value="">All Types</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="error">Error</option>
        </select>
        <input type="datetime-local" value={filters.start} onChange={e => setFilters(f => ({ ...f, start: e.target.value }))} />
        <input type="datetime-local" value={filters.end} onChange={e => setFilters(f => ({ ...f, end: e.target.value }))} />
        <button onClick={fetchLogs}>Filter</button>
      </div>
      <table className="logs-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Deployment</th>
            <th>Device</th>
            <th>Type</th>
            <th>Message</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log.id}>
              <td>{log.timestamp}</td>
              <td>{log.deployment_id}</td>
              <td>{log.device_id}</td>
              <td className={log.log_type}>{log.log_type}</td>
              <td>{log.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}