import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { X, Shield } from "lucide-react";
import authService from "../services/auth.js";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [notification, setNotification] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleClose = () => {
    navigate("/");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setNotification(null);

    try {
      await authService.requestPasswordReset(email);
      setIsSent(true);
      setNotification({
        type: "success",
        message:
          "If an account exists for this email, a password reset link has been sent. Please check your inbox."
      });
    } catch (error) {
      setNotification({
        type: "error",
        message: error.message || "Failed to send password reset link. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
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
            <p className="text-gray-300 text-sm">Reset your password</p>
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

          <form onSubmit={handleSubmit} className="space-y-6">
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isSent}
              className="w-full px-4 py-3 rounded-xl bg-cyberBlue/60 border border-neonAqua/40 text-softWhite focus:outline-none focus:ring-2 focus:ring-neonAqua/70 transition-all cursor-text disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={isLoading || isSent}
              className="w-full mt-2 relative overflow-hidden px-6 py-3 rounded-xl bg-electricBlue text-cyberBlue font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <span className="relative z-10">
                {isLoading ? "Sending..." : isSent ? "Link Sent" : "Send Reset Link"}
              </span>
              <span className="absolute inset-0 rounded-xl blur-xl opacity-70 btn-pulse bg-neonAqua"></span>
            </button>
          </form>

          {/* Links */}
          <div className="text-center space-y-2 mt-6">
            <p className="text-gray-400 text-sm">
              Remember your password?{" "}
              <Link
                to="/login"
                className="text-electricBlue hover:underline cursor-pointer"
              >
                Back to Login
              </Link>
            </p>
          </div>

          {/* Security Info */}
          <div className="mt-8 text-center">
            <div className="flex items-center justify-center gap-2 text-green-400 text-sm">
              <Shield size={16} />
              <span>Reset link expires in 30 minutes</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}