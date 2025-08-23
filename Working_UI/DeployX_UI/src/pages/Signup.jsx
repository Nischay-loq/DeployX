import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'

export default function Signup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
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
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsLoading(false);
      return;
    }

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      
      // Store user data in localStorage
      const storedUsers = JSON.parse(localStorage.getItem('deployx_users') || '[]');
      const newUser = {
        id: Date.now(),
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        createdAt: new Date().toISOString()
      };
      
      // Check if email already exists
      if (storedUsers.find(user => user.email === formData.email)) {
        setErrors({ email: 'Email already exists' });
        return;
      }

      storedUsers.push(newUser);
      localStorage.setItem('deployx_users', JSON.stringify(storedUsers));
      
      setShowSuccess(true);
      
      // Redirect to login with email pre-filled after 2 seconds
      setTimeout(() => {
        navigate('/login', { state: { email: formData.email } });
      }, 2000);
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

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[radial-gradient(circle_at_20%_20%,rgba(0,255,247,0.12),transparent_35%),radial-gradient(circle_at_80%_80%,rgba(0,168,255,0.12),transparent_35%)]">
      {/* motion particles via CSS circles */}
      <div className="particles-background">
        {Array.from({length: 20}).map((_,i)=>(
          <div key={i} className="absolute w-2 h-2 rounded-full bg-neonAqua blur-[1px] opacity-70"
            style={{ top: `${Math.random()*100}%`, left: `${Math.random()*100}%`, animation: `float ${6+Math.random()*6}s infinite alternate`}}/>
        ))}
      </div>
      <style>{`@keyframes float{from{transform:translateY(0)}to{transform:translateY(-20px)}}`}</style>

      {/* Navigation back to home */}
      <div className="absolute top-6 left-6 z-10">
        <Link to="/" className="px-4 py-2 border border-electricBlue rounded-lg text-electricBlue hover:bg-electricBlue hover:text-cyberBlue transition-all cursor-pointer">
          ← Back to Home
        </Link>
      </div>

      <div className="absolute inset-0 flex items-center justify-center p-6 form-container">
        <div className="glass-light border-trace rounded-3xl w-full max-w-md p-8">
          {showSuccess ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl">✓</span>
              </div>
              <h2 className="text-2xl font-bold text-softWhite mb-2">Account Created!</h2>
              <p className="text-gray-300 mb-4">Redirecting to login page...</p>
              <div className="animate-pulse text-electricBlue">Please wait...</div>
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-bold mb-6 text-center text-softWhite">Create your DeployX account</h1>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-sm mb-1 text-softWhite cursor-pointer">Full Name</label>
                  <input 
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl bg-cyberBlue/60 border border-neonAqua/40 focus:outline-none focus:ring-2 focus:ring-neonAqua/70 transition-all text-softWhite cursor-text" 
                    placeholder="Ada Lovelace" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1 text-softWhite cursor-pointer">Email</label>
                  <input 
                    type="email" 
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 rounded-xl bg-cyberBlue/60 border transition-all text-softWhite cursor-text focus:outline-none focus:ring-2 focus:ring-neonAqua/70 ${
                      errors.email ? 'border-red-400' : 'border-neonAqua/40'
                    }`}
                    placeholder="you@company.com" 
                    required 
                  />
                  {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
                </div>
                <div>
                  <label className="block text-sm mb-1 text-softWhite cursor-pointer">Password</label>
                  <input 
                    type="password" 
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 rounded-xl bg-cyberBlue/60 border transition-all text-softWhite cursor-text focus:outline-none focus:ring-2 focus:ring-neonAqua/70 ${
                      errors.password ? 'border-red-400' : 'border-neonAqua/40'
                    }`}
                    placeholder="••••••••" 
                    required 
                  />
                  {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
                </div>
                <div>
                  <label className="block text-sm mb-1 text-softWhite cursor-pointer">Confirm Password</label>
                  <input 
                    type="password" 
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 rounded-xl bg-cyberBlue/60 border transition-all text-softWhite cursor-text focus:outline-none focus:ring-2 focus:ring-neonAqua/70 ${
                      errors.confirmPassword ? 'border-red-400' : 'border-neonAqua/40'
                    }`}
                    placeholder="••••••••" 
                    required 
                  />
                  {errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{errors.confirmPassword}</p>}
                </div>

                <div className="flex items-center justify-center gap-2">
                  <Link to="/login" className="text-electricBlue hover:underline cursor-pointer">
                    Already have an account? Login
                  </Link>
                </div>


                <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 relative overflow-hidden px-6 py-3 rounded-xl bg-electricBlue text-cyberBlue font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <span className="relative z-10">{isLoading ? "Creating Account..." : "Create Account"}</span>
                  <span className="absolute inset-0 rounded-xl blur-xl opacity-70 btn-pulse bg-neonAqua"></span>
                </button>
                {/* Divider */}
                <div className="flex items-center my-4">
                  <hr className="flex-grow border-gray-600" />
                  <span className="px-3 text-gray-400 text-sm">OR</span>
                  <hr className="flex-grow border-gray-600" />
                </div>

                 {/* Google Button */}
                  <button
                    type="button"
                    onClick={() => console.log("Google Sign Up")}
                    className="w-full px-6 py-3 rounded-xl bg-white text-gray-800 font-semibold flex items-center justify-center gap-3
                              hover:shadow-lg transition-all cursor-pointer"
                  >
                    <img
                      src="https://www.svgrepo.com/show/355037/google.svg"
                      alt="Google"
                      className="w-5 h-5"
                    />
                    Continue with Google
                  </button>

              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
