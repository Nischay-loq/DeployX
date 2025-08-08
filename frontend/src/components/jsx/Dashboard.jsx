import React from "react";
import "../css/dashboard.css";
import { FaHome, FaTasks, FaCogs, FaChartBar, FaSignOutAlt } from "react-icons/fa";
import { IoTerminalSharp } from "react-icons/io5";
import { Link, Routes, Route } from "react-router-dom";
import Terminal from "./Terminal";

function Overview() {
  return (
    <>
      <header className="header">
        <h1>Dashboard Overview</h1>
      </header>
      <section className="content">
        <div className="card">Content Block 1</div>
        <div className="card">Content Block 2</div>
        <div className="card">Content Block 3</div>
      </section>
    </>
  );
}

export default function Dashboard({ onLogout }) {
  return (
    <div className="dashboard">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">
          <h2>DeployX</h2>
        </div>
        <nav className="nav">
          <Link to="/dashboard"><FaHome /> Dashboard</Link>
          <Link to="/dashboard/terminal"><IoTerminalSharp /> Terminal</Link>
          <Link to="/dashboard/deployments"><FaTasks /> Deployments</Link>
          <Link to="/dashboard/settings"><FaCogs /> Settings</Link>
          <Link to="/dashboard/reports"><FaChartBar /> Reports</Link>
        </nav>
        <div className="logout">
          <button onClick={onLogout}><FaSignOutAlt /> Logout</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/terminal" element={<Terminal />} />
          {/* You can add more nested pages here */}
        </Routes>
      </main>
    </div>
  );
}
