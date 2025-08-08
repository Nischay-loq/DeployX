import React from "react";
import "../css/dashboard.css"; // Assuming you have a CSS file for styling
import { FaHome, FaTasks, FaCogs, FaChartBar, FaSignOutAlt } from "react-icons/fa";
import { IoTerminalSharp } from "react-icons/io5";

export default function Dashboard() {
  return (
    <div className="dashboard">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">
          <h2>DeployX</h2>
        </div>
        <nav className="nav">
          <a href="#" className="active"><FaHome /> Dashboard</a>
          <a href="#"><IoTerminalSharp /> Terminal</a>
          <a href="#"><FaTasks /> Deployments</a>
          <a href="#"><FaCogs /> Settings</a>
          <a href="#"><FaChartBar /> Reports</a>
        </nav>
        <div className="logout">
          <a href="#"><FaSignOutAlt /> Logout</a>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="header">
          <h1>Dashboard Overview</h1>
        </header>
        <section className="content">
          <div className="card">Content Block 1</div>
          <div className="card">Content Block 2</div>
          <div className="card">Content Block 3</div>
        </section>
      </main>
    </div>
  );
}
