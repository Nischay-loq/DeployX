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
        {/* DeployX Logo - Testing multiple paths */}
        <img 
          src="/deployx-logo.png" 
          alt="DeployX Logo" 
          style={{
            height: '35px',
            width: 'auto',
            maxWidth: '140px',
            objectFit: 'contain',
            display: 'block',
            margin: '0 auto',
            backgroundColor: 'transparent'
          }}
          onError={(e) => {
            console.error('❌ Image failed to load:', e.target.src);
            // Hide the image and show text fallback
            e.target.style.display = 'none';
            const fallback = e.target.parentNode.querySelector('.logo-fallback');
            if (fallback) fallback.style.display = 'block';
          }}
          onLoad={(e) => {
            console.log('✅ DeployX logo loaded successfully from:', e.target.src);
          }}
        />
        
        {/* Fallback text that matches your cosmic design */}
        <div 
          className="logo-fallback"
          style={{
            display: 'none',
            fontSize: '20px',
            fontWeight: 'bold',
            textAlign: 'center',
            padding: '10px 0',
            background: 'linear-gradient(45deg, #8B5CF6, #3B82F6, #06B6D4, #8B5CF6)',
            backgroundSize: '300% 300%',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '2px',
            animation: 'gradient-shift 3s ease infinite'
          }}
        >
          DeployX
        </div>
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
