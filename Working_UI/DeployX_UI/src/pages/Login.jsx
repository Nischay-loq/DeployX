import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Eye, EyeOff, Shield, X } from "lucide-react";
import authService from "../services/auth.js";

export default function Login() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [notification, setNotification] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Pre-fill username if coming from signup
  useEffect(() => {
    if (location.state?.email) {
      setUsername(location.state.email);
    }
  }, [location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setNotification(null);

    try {
      await authService.login({ username, password }, rememberMe);
      setNotification({
        type: "success",
        message: "Login successful! Redirecting to dashboard...",
      });
      // Navigate immediately; App will also gate by auth state
      navigate("/dashboard");
    } catch (error) {
      setNotification({
        type: "error",
        message: error?.message || "Unable to connect to the server. Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setNotification({
      type: "error",
      message: "Google login will be implemented in a future update.",
    });
  };

  const handleClose = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[radial-gradient(circle_at_20%_20%,rgba(0,255,247,0.12),transparent_35%),radial-gradient(circle_at_80%_80%,rgba(0,168,255,0.12),transparent_35%)]">
      {/* motion particles */}
      <div className="particles-background">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-neonAqua blur-[1px] opacity-70"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animation: `float ${6 + Math.random() * 6}s infinite alternate`,
            }}
          />
        ))}
      </div>
      <style>{`@keyframes float{from{transform:translateY(0)}to{transform:translateY(-20px)}}`}</style>

      {/* Close Button */}
      <button
        onClick={handleClose}
        className="absolute top-6 right-6 z-50 text-red-500 hover:text-red-400 transition-all p-2 hover:bg-red-500/20 rounded-lg"
        aria-label="Close"
        type="button"
      >
        <X size={28} />
      </button>

      <div className="absolute inset-0 flex items-center justify-center p-6 form-container">
        <div className="glass-light border-trace rounded-3xl w-full max-w-md p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-electricBlue mb-2">
              DeployX
            </h1>
            <p className="text-gray-300 text-sm">Access your command center</p>
          </div>

          {/* Notification */}
          {notification && (
            <div
              className={`mb-6 p-4 rounded-lg border ${
                notification.type === "success"
                  ? "bg-green-100/20 border-green-300/30 text-green-300"
                  : "bg-red-100/20 border-red-300/30 text-red-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    notification.type === "success"
                      ? "bg-green-500"
                      : "bg-red-500"
                  }`}
                >
                  <span className="text-white text-xs font-bold">
                    {notification.type === "success" ? "✓" : "!"}
                  </span>
                </div>
                <p className="text-sm">{notification.message}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Username */}
            <div>
              <input
                type="text"
                placeholder="Username or Email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-cyberBlue/60 border border-neonAqua/40 text-softWhite focus:outline-none focus:ring-2 focus:ring-neonAqua/70 transition-all cursor-text"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-cyberBlue/60 border border-neonAqua/40 text-softWhite focus:outline-none focus:ring-2 focus:ring-neonAqua/70 transition-all pr-12 cursor-text"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-all p-1 hover:bg-gray-400/20 rounded cursor-pointer"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* Remember + Forgot Password */}
            <div className="flex items-center justify-between text-sm mb-4">
              <label className="flex items-center gap-2 text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="accent-electricBlue w-4 h-4 rounded cursor-pointer"
                />
                Remember me
              </label>
              <Link
                to="/forgot-password"
                className="text-electricBlue hover:underline cursor-pointer"
              >
                Forgot Password?
              </Link>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 relative overflow-hidden px-6 py-3 rounded-xl bg-electricBlue text-cyberBlue font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <span className="relative z-10">
                {isLoading ? "Signing In..." : "Sign In"}
              </span>
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
              onClick={handleGoogleLogin}
              className="w-full px-6 py-3 rounded-xl bg-white text-gray-800 font-semibold flex items-center justify-center gap-3 hover:shadow-lg transition-all cursor-pointer"
            >
              <img
                src="https://www.svgrepo.com/show/355037/google.svg"
                alt="Google"
                className="w-5 h-5"
              />
              Continue with Google
            </button>

            {/* Links */}
            <div className="text-center space-y-2">
              <p className="text-gray-400 text-sm">
                Don't have an account?{" "}
                <Link
                  to="/signup"
                  className="text-electricBlue hover:underline cursor-pointer"
                >
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
        </div>
      </div>
    </div>
  );
}