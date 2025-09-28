import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Login from "./components/jsx/login";
import Signup from "./components/jsx/signup";
import Dashboard from "./components/jsx/dashboard";
import Terminal from "./components/jsx/Terminal";
import Navbar from "./components/jsx/Navbar";
import DeploymentPage from "./components/jsx/DeploymentPage";

// Groups feature import
import GroupsPage from "./components/jsx/GroupList.jsx"; // Our GroupsPage is the GroupList component

import api from "./services/api";
import authService from "./services/auth";
import "./App.css";

function PrivateLayout({ onLogout, username }) {
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Navbar full height */}
      <div style={{ width: "220px", backgroundColor: "#333", color: "#fff" }}>
        <Navbar onLogout={onLogout} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard username={username} />} />
          <Route path="/terminal" element={<Terminal />} />
          <Route path="/groups" element={<GroupsPage />} /> {/* Groups route */}
           <Route path="/deployments" element={<DeploymentPage />} />
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");

  useEffect(() => {
    const validateToken = async () => {
      const token = authService.getAccessToken();
      if (token) {
        try {
          // Validate token by calling /auth/me endpoint
          const response = await api.get('/auth/me');
          if (response.data) {
            setIsLoggedIn(true);
            setUsername(response.data.username);
            // Update stored username if it's different
            const storage = authService.getRememberMe() ? localStorage : sessionStorage;
            storage.setItem('username', response.data.username);
          }
        } catch (error) {
          console.log('Token validation failed:', error);
          // Token is invalid, clear auth data
          authService.clearAllTokens();
          setIsLoggedIn(false);
          setUsername('');
        }
      }
    };

    validateToken();
  }, []);

  const handleLoginSuccess = (usernameFromLogin) => {
    setIsLoggedIn(true);
    setUsername(usernameFromLogin);
    localStorage.setItem("username", usernameFromLogin);
  };

  const handleLogout = () => {
    authService.clearAllTokens();
    setIsLoggedIn(false);
    setUsername("");
  };

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            isLoggedIn ? (
              <Navigate to="/dashboard" />
            ) : (
              <Login onLoginSuccess={handleLoginSuccess} />
            )
          }
        />
        <Route path="/signup" element={<Signup onSignupSuccess={() => {}} />} />

        {/* Private Routes */}
        {isLoggedIn ? (
          <Route
            path="/*"
            element={<PrivateLayout onLogout={handleLogout} username={username} />}
          />
        ) : (
          <Route path="/*" element={<Navigate to="/login" />} />
        )}
      </Routes>
    </Router>
  );
}

export default App;
