import { Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Signup from './pages/Signup.jsx'
import Login from './pages/Login.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import ResetPassword from './pages/ResetPassword.jsx'   // ⬅️ Import ResetPassword
import Dashboard from './pages/Dashboard.jsx'

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        
        {/* ⬅️ Add this line for reset password page */}
        <Route path="/reset-password/:token" element={<ResetPassword />} /> 

        <Route path="/dashboard" element={<Dashboard />} />
        
        <Route
          path="*"
          element={
            <div className="h-screen flex items-center justify-center">
              Not Found.
              <Link to="/" className="ml-2 text-electricBlue underline">
                Go Home
              </Link>
            </div>
          }
        />
      </Routes>
    </>
  )
}
