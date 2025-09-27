import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Shield, Lock, CheckCircle, AlertTriangle } from "lucide-react";
import authService from "../services/auth.js";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("validating"); // validating | valid | invalid | success
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      setMessage("Reset link is missing or incomplete.");
      return;
    }

    const validateToken = async () => {
      try {
        const response = await authService.validatePasswordResetToken(token);
        setEmail(response.email);
        setStatus("valid");
      } catch (error) {
        setStatus("invalid");
        setMessage(error.message || "This reset link is invalid or has expired.");
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate new password
    if (!newPassword) {
      setMessage("New password is required.");
      return;
    }
    if (newPassword.length < 6) {
      setMessage("Password must be at least 6 characters long.");
      return;
    }
    if (newPassword.length > 128) {
      setMessage("Password must not exceed 128 characters.");
      return;
    }
    
    // Validate confirm password
    if (!confirmPassword) {
      setMessage("Please confirm your new password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match. Please make sure both passwords are identical.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      await authService.confirmPasswordReset(token, newPassword);
      setStatus("success");
      setMessage("Password reset successfully! Redirecting to login...");
      setTimeout(() => navigate("/login"), 2500);
    } catch (error) {
      setStatus("valid");
      setMessage(error.message || "Failed to reset password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderContent = () => {
    if (status === "validating") {
      return (
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-accent-cyan/20">
            <div className="w-6 h-6 border-4 border-accent-cyan border-t-transparent rounded-full animate-spin"></div>
          </div>
          <div>
            <h2 className="text-white text-xl font-semibold">Verifying reset link...</h2>
            <p className="text-gray-400 text-sm">Hold on while we confirm the link's validity.</p>
          </div>
        </div>
      );
    }

    if (status === "invalid") {
      return (
        <div className="text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <div>
            <h2 className="text-white text-xl font-semibold mb-2">Reset link issue</h2>
            <p className="text-gray-400 text-sm mb-4">{message}</p>
            <Link
              to="/forgot-password"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-primary-500 text-white font-semibold hover:bg-primary-400 transition"
            >
              Request a new reset link
            </Link>
          </div>
        </div>
      );
    }

    if (status === "success") {
      return (
        <div className="text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <div>
            <h2 className="text-white text-xl font-semibold mb-2">Password updated</h2>
            <p className="text-gray-400 text-sm">{message}</p>
          </div>
        </div>
      );
    }

    return (
      <>
        <div className="text-center mb-6">
          <h2 className="text-2xl font-semibold text-white mb-2">Create a new password</h2>
          <p className="text-gray-400 text-sm">
            For security, choose a strong password you haven't used before. This link is valid for 30 minutes.
          </p>
          {email && (
            <p className="text-primary-400 text-xs mt-3">Resetting password for {email}</p>
          )}
        </div>

        {message && (
          <div className="mb-6 p-4 rounded-lg border border-red-400/30 bg-red-500/10 text-red-300 text-sm">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative">
            <label className="block text-sm font-medium text-gray-300 mb-2">New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-900/80 border border-gray-700 text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
            </div>
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-300 mb-2">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-900/80 border border-gray-700 text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-6 py-3 rounded-xl bg-primary-500 text-white font-semibold hover:bg-primary-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Updating password..." : "Reset Password"}
          </button>
        </form>

        <div className="text-center mt-6 text-sm text-gray-400">
          Remembered your password?{" "}
          <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium">
            Back to login
          </Link>
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[radial-gradient(circle_at_20%_20%,rgba(0,255,247,0.12),transparent_35%),radial-gradient(circle_at_80%_80%,rgba(0,168,255,0.12),transparent_35%)]">
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

      <div className="absolute inset-0 flex items-center justify-center p-6 form-container">
        <div className="glass-light border-trace rounded-3xl w-full max-w-md p-8">
          <div className="flex items-center justify-center gap-2 text-primary-400 text-sm mb-4">
            <Shield size={16} />
            <span>Password reset links expire in 30 minutes</span>
          </div>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}