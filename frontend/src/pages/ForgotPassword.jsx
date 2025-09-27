import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { X } from "lucide-react";
import authService from "../services/auth.js";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notification, setNotification] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleClose = () => {
    navigate("/");
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setNotification(null);

    try {
      await authService.sendOTP(email, "reset");
      setNotification({
        type: "success",
        message: "OTP sent to your email successfully!"
      });
      setStep(2);
    } catch (error) {
      setNotification({
        type: "error",
        message: error.message || "Failed to send OTP. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setNotification(null);

    try {
      await authService.verifyOTP(email, otp);
      setNotification({
        type: "success",
        message: "OTP verified successfully!"
      });
      setStep(3);
    } catch (error) {
      setNotification({
        type: "error",
        message: error.message || "Invalid OTP. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setNotification({
        type: "error",
        message: "Passwords do not match."
      });
      return;
    }

    setIsLoading(true);
    setNotification(null);

    try {
      await authService.resetPassword(email, newPassword);
      setNotification({
        type: "success",
        message: "Password reset successfully! You can now login."
      });
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (error) {
      setNotification({
        type: "error",
        message: error.message || "Failed to reset password. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
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

          {/* Form */}
          {step === 1 && (
            <form onSubmit={handleEmailSubmit} className="space-y-6">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-cyberBlue/60 border border-neonAqua/40 text-softWhite focus:outline-none focus:ring-2 focus:ring-neonAqua/70 transition-all cursor-text"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 relative overflow-hidden px-6 py-3 rounded-xl bg-electricBlue text-cyberBlue font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <span className="relative z-10">
                  {isLoading ? "Sending..." : "Send OTP"}
                </span>
                <span className="absolute inset-0 rounded-xl blur-xl opacity-70 btn-pulse bg-neonAqua"></span>
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleOtpSubmit} className="space-y-6">
              <input
                type="text"
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-cyberBlue/60 border border-neonAqua/40 text-softWhite focus:outline-none focus:ring-2 focus:ring-neonAqua/70 transition-all cursor-text"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 relative overflow-hidden px-6 py-3 rounded-xl bg-electricBlue text-cyberBlue font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <span className="relative z-10">
                  {isLoading ? "Verifying..." : "Verify OTP"}
                </span>
                <span className="absolute inset-0 rounded-xl blur-xl opacity-70 btn-pulse bg-neonAqua"></span>
              </button>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <input
                type="password"
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-cyberBlue/60 border border-neonAqua/40 text-softWhite focus:outline-none focus:ring-2 focus:ring-neonAqua/70 transition-all cursor-text"
              />
              <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-cyberBlue/60 border border-neonAqua/40 text-softWhite focus:outline-none focus:ring-2 focus:ring-neonAqua/70 transition-all cursor-text"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 relative overflow-hidden px-6 py-3 rounded-xl bg-electricBlue text-cyberBlue font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <span className="relative z-10">
                  {isLoading ? "Resetting..." : "Reset Password"}
                </span>
                <span className="absolute inset-0 rounded-xl blur-xl opacity-70 btn-pulse bg-neonAqua"></span>
              </button>
            </form>
          )}

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
              <span>Secured by TLS 1.3 Encryption</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}