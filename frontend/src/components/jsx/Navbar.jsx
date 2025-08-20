import React from "react";
import { FaHome, FaTasks, FaCogs, FaChartBar, FaSignOutAlt } from "react-icons/fa";
import { IoTerminalSharp } from "react-icons/io5";
import { Link } from "react-router-dom";
import { MdGroups2 } from "react-icons/md";
import { AiOutlineDeploymentUnit } from "react-icons/ai";
import "../css/Navbar.css";

export default function Navbar({ onLogout }) {
  return (
    <aside className="sidebar">
      <div className="logo">
        <h2>DeployX</h2>
      </div>
      <nav className="nav">
        <Link to="/dashboard"><FaHome /> Dashboard</Link>
        <Link to="/terminal"><IoTerminalSharp /> Terminal</Link>
        <Link to="/groups"><MdGroups2 /> Groups</Link>
        <Link to="/deployments"><AiOutlineDeploymentUnit /> Deployments</Link>
        <Link to="/settings"><FaCogs /> Settings</Link>
        <Link to="/reports"><FaChartBar /> Reports</Link>
      </nav>
      <div className="logout">
        <button className="logout-btn" onClick={onLogout}>
          <FaSignOutAlt size={22} style={{ marginRight: "8px" }} />
          Logout
        </button>
      </div>
    </aside>
  );
}
