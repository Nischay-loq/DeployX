import { Routes, Route, Link, Navigate } from 'react-router-dom'
import { useState, useEffect, lazy, Suspense } from 'react'
import Home from './pages/Home.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import VerifyEmailChange from './pages/VerifyEmailChange.jsx'
import SignIn from './pages/SignIn.jsx'
import SignUp from './pages/Signup.jsx'
import authService from './services/auth.js'

// Dashboard is the heaviest page (terminal + managers) - load it on demand
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'))

const LoadingScreen = () => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center">
    <div className="text-center">
      <div className="inline-block mb-6 animate-pulse">
        <img src="/logo.svg" alt="DeployX logo" className="h-16 w-auto drop-shadow-lg" />
      </div>
      <h2 className="text-2xl font-semibold text-slate-100 mb-2">DeployX</h2>
      <p className="text-slate-500 animate-pulse">Loading dashboard...</p>
    </div>
  </div>
)

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    authService.init();
    setIsAuthenticated(authService.isLoggedIn());
    setIsLoading(false);

    const handler = () => setIsAuthenticated(authService.isLoggedIn());
    window.addEventListener('auth:changed', handler);
    return () => window.removeEventListener('auth:changed', handler);
  }, []);

  const handleLogout = () => {
    authService.logout();
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-950 transition-colors duration-300">
      <Routes>
        <Route 
          path="/" 
          element={isAuthenticated ? <Navigate to="/dashboard" /> : <Home />} 
        />
        {/* Auth pages */}
        <Route path="/signin" element={isAuthenticated ? <Navigate to="/dashboard" /> : <SignIn />} />
        <Route path="/signup" element={isAuthenticated ? <Navigate to="/dashboard" /> : <SignUp />} />
        {/* Legacy URLs */}
        <Route path="/login" element={<Navigate to="/signin" replace />} />
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
        
        <Route 
          path="/dashboard" 
          element={
            isAuthenticated ? (
              <Suspense fallback={<LoadingScreen />}>
                <Dashboard onLogout={handleLogout} />
              </Suspense>
            ) : <Navigate to="/" />
          } 
        />
        
        <Route path="*" element={
          <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
            <div className="text-center max-w-md">
              <div className="mb-8">
                <h1 className="text-9xl font-bold text-brand-500 mb-4">404</h1>
                <h2 className="text-2xl font-semibold text-slate-100 mb-2">Page Not Found</h2>
                <p className="text-slate-400 mb-8">
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
                <div className="text-sm text-slate-500">
                  or <Link to="/" className="text-brand-400 hover:text-brand-300 transition-colors">return to homepage</Link>
                </div>
              </div>
            </div>
          </div>
        } />
      </Routes>
    </div>
  )
}
