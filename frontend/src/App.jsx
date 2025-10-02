import { Routes, Route, Link, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Home from './pages/Home.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import Dashboard from './pages/Dashboard.jsx'
import VerifyEmailChange from './pages/VerifyEmailChange.jsx'
import authService from './services/auth.js'

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize authentication state on app load
    authService.init();
    setIsAuthenticated(authService.isLoggedIn());
    setIsLoading(false);

    // Subscribe to auth change events instead of polling
    const handler = () => {
      setIsAuthenticated(authService.isLoggedIn());
    };
    window.addEventListener('auth:changed', handler);
    return () => {
      window.removeEventListener('auth:changed', handler);
    };
  }, []);

  // Handle logout
  const handleLogout = () => {
    authService.logout();
    setIsAuthenticated(false);
  };

  // Professional loading screen (initial app load only)
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-primary-500 to-accent-cyan rounded-2xl mb-6 shadow-lg">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h2 className="text-2xl font-semibold text-white mb-2">DeployX</h2>
          <p className="text-gray-400 animate-pulse">Initializing platform...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 transition-colors duration-300">
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/" 
          element={isAuthenticated ? <Navigate to="/dashboard" /> : <Home />} 
        />
        <Route 
          path="/forgot-password" 
          element={isAuthenticated ? <Navigate to="/dashboard" /> : <ForgotPassword />} 
        />
        <Route 
          path="/reset-password" 
          element={isAuthenticated ? <Navigate to="/dashboard" /> : <ResetPassword />} 
        />
        <Route 
          path="/verify-email-change" 
          element={<VerifyEmailChange />} 
        />
        
        {/* Protected Routes */}
        <Route 
          path="/dashboard" 
          element={isAuthenticated ? <Dashboard onLogout={handleLogout} /> : <Navigate to="/" />} 
        />
        
        {/* Catch all route - Professional 404 */}
        <Route path="*" element={
          <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-6">
            <div className="text-center max-w-md">
              <div className="mb-8">
                <h1 className="text-9xl font-bold text-primary-500 mb-4">404</h1>
                <h2 className="text-2xl font-semibold text-white mb-2">Page Not Found</h2>
                <p className="text-gray-400 mb-8">
                  The page you're looking for doesn't exist or has been moved.
                </p>
              </div>
              <div className="space-y-4">
                <Link 
                  to="/" 
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Go Home
                </Link>
                <div className="text-sm text-gray-500">
                  or <Link to="/" className="text-primary-400 hover:text-primary-300 transition-colors">return to homepage</Link>
                </div>
              </div>
            </div>
          </div>
        } />
      </Routes>
    </div>
  )
}
