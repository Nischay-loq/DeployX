import { Routes, Route, Link, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Home from './pages/Home.jsx'
import Signup from './pages/Signup.jsx'
import Login from './pages/Login.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import Dashboard from './pages/Dashboard.jsx'
import authService from './services/auth.js'

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize authentication state on app load
    authService.init();
    setIsAuthenticated(authService.isLoggedIn());
    setIsLoading(false);
  }, []);

  // Handle login success
  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  // Handle logout
  const handleLogout = () => {
    authService.logout();
    setIsAuthenticated(false);
  };

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[radial-gradient(circle_at_20%_20%,rgba(0,255,247,0.12),transparent_35%),radial-gradient(circle_at_80%_80%,rgba(0,168,255,0.12),transparent_35%)]">
        <div className="text-electricBlue text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/" 
          element={isAuthenticated ? <Navigate to="/dashboard" /> : <Home />} 
        />
        <Route 
          path="/signup" 
          element={isAuthenticated ? <Navigate to="/dashboard" /> : <Signup />} 
        />
        <Route 
          path="/login" 
          element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} 
        />
        <Route 
          path="/forgot-password" 
          element={isAuthenticated ? <Navigate to="/dashboard" /> : <ForgotPassword />} 
        />
        
        {/* Protected Routes */}
        <Route 
          path="/dashboard" 
          element={isAuthenticated ? <Dashboard onLogout={handleLogout} /> : <Navigate to="/login" />} 
        />
        
        {/* Catch all route */}
        <Route path="*" element={
          <div className="h-screen flex items-center justify-center">
            Not Found. 
            <Link to="/" className="ml-2 text-electricBlue underline">Go Home</Link>
          </div>
        } />
      </Routes>
    </>
  )
}
