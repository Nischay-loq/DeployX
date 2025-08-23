import { Link } from 'react-router-dom'
import { useState } from 'react'
import { Eye, EyeOff, Shield } from 'lucide-react'

export default function ForgotPassword({}) {
  const [formData, setFormData] = useState({
    email: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    newPassword: false,
    confirmPassword: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    // Validation
    const newErrors = {};
    if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    if (formData.newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsLoading(false);
      return;
    }

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setShowSuccess(true);
    }, 1000);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear error when user starts typing
    if (errors[e.target.name]) {
      setErrors({
        ...errors,
        [e.target.name]: ''
      });
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords({
      ...showPasswords,
      [field]: !showPasswords[field]
    });
  };

  return (
    <div className="min-h-screen items-center justify-center relative overflow-hidden bg-[radial-gradient(circle_at_20%_20%,rgba(0,255,247,0.12),transparent_35%),radial-gradient(circle_at_80%_80%,rgba(0,168,255,0.12),transparent_35%)]">
      {/* motion particles via CSS circles */}
      <div className="particles-background">
        {Array.from({length: 20}).map((_,i)=>(
          <div key={i} className="absolute w-2 h-2 rounded-full bg-neonAqua blur-[1px] opacity-70"
            style={{ top: `${Math.random()*100}%`, left: `${Math.random()*100}%`, animation: `float ${6+Math.random()*6}s infinite alternate`}}/>
        ))}
      </div>
      <style>{`@keyframes float{from{transform:translateY(0)}to{transform:translateY(-20px)}}`}</style>

     

      <div className="absolute inset-0 flex items-center justify-center p-6 form-container">
        <div className="glass-light border-trace rounded-3xl w-full max-w-md p-8">
          {showSuccess ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl">✓</span>
              </div>
              <h2 className="text-2xl font-bold text-softWhite mb-2">Password Reset!</h2>
              <p className="text-gray-300 mb-4">Your password has been successfully reset.</p>
              <Link 
                to="/login" 
                className="inline-block px-6 py-3 bg-electricBlue text-cyberBlue font-semibold rounded-xl hover:bg-opacity-90 transition-all cursor-pointer"
              >
                Continue to Login
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h1 className="text-3xl font-bold text-electricBlue mb-2">
                  DeployX
                </h1>
                <p className="text-gray-300 text-sm">
                  Reset your password
                </p>
              </div>

              <form className="space-y-6" onSubmit={handleSubmit}>
                {/* Email */}
                <div>
                  <label className="block text-sm mb-2 text-softWhite cursor-pointer">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    required
                    className="w-full px-4 py-3 rounded-xl bg-cyberBlue/60 border border-neonAqua/40 text-softWhite
                               focus:outline-none focus:ring-2 focus:ring-neonAqua/70 transition-all cursor-text"
                  />
                </div>

                {/* New Password */}
                <div className="relative">
                  <label className="block text-sm mb-2 text-softWhite cursor-pointer">New Password</label>
                  <input
                    type={showPasswords.newPassword ? "text" : "password"}
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    placeholder="Enter new password"
                    required
                    className={`w-full px-4 py-3 rounded-xl bg-cyberBlue/60 border transition-all text-softWhite
                               focus:outline-none focus:ring-2 focus:ring-neonAqua/70 pr-12 cursor-text ${
                      errors.newPassword ? 'border-red-400' : 'border-neonAqua/40'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('newPassword')}
                    className="absolute right-3 top-8 text-gray-400 hover:text-gray-300 transition-all p-1 hover:bg-gray-400/20 rounded cursor-pointer"
                  >
                    {showPasswords.newPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                  {errors.newPassword && <p className="text-red-400 text-xs mt-1">{errors.newPassword}</p>}
                </div>

                {/* Confirm Password */}
                <div className="relative">
                  <label className="block text-sm mb-2 text-softWhite cursor-pointer">Confirm Password</label>
                  <input
                    type={showPasswords.confirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm new password"
                    required
                    className={`w-full px-4 py-3 rounded-xl bg-cyberBlue/60 border transition-all text-softWhite
                               focus:outline-none focus:ring-2 focus:ring-neonAqua/70 pr-12 cursor-text ${
                      errors.confirmPassword ? 'border-red-400' : 'border-neonAqua/40'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('confirmPassword')}
                    className="absolute right-3 top-8 text-gray-400 hover:text-gray-300 transition-all p-1 hover:bg-gray-400/20 rounded cursor-pointer"
                  >
                    {showPasswords.confirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                  {errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{errors.confirmPassword}</p>}
                </div>

                {/* Reset Password Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 relative overflow-hidden px-6 py-3 rounded-xl bg-electricBlue text-cyberBlue font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <span className="relative z-10">{isLoading ? "Reseting Password..." : "Reset Password"}</span>
                  <span className="absolute inset-0 rounded-xl blur-xl opacity-70 btn-pulse bg-neonAqua"></span>

                </button>

                {/* Links */}
                <div className="text-center space-y-2">
                  <Link to="/login" className="block text-electricBlue hover:underline text-sm cursor-pointer">
                    Back to Login
                  </Link>
                  <p className="text-gray-300 text-sm">
                    Don't have an account?{" "}
                    <Link to="/signup" className="text-electricBlue hover:underline cursor-pointer">
                      Sign Up
                    </Link>
                  </p>
                </div>
              </form>

              {/* Security Info */}
              <div className="mt-8 text-center">
                <div className="flex items-center justify-center gap-2 text-green-400 text-sm">
                  <Shield size={16} />
                  <span>Secured by TLS 1.3 Encryption</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
