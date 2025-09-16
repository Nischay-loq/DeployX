import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Lock, CheckCircle } from "lucide-react";

export default function ResetPassword() {
  const { token } = useParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notification, setNotification] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    setNotification(null);

    if (password !== confirmPassword) {
      setNotification({
        type: "error",
        message: "Passwords do not match."
      });
      return;
    }

    // Simulate API call
    setTimeout(() => {
      if (token === "sampletoken") {
        setNotification({
          type: "success",
          message: "Password successfully reset! You can now log in."
        });
      } else {
        setNotification({
          type: "error",
          message: "Invalid or expired reset link."
        });
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_20%_20%,rgba(0,255,247,0.12),transparent_35%),radial-gradient(circle_at_80%_80%,rgba(0,168,255,0.12),transparent_35%)] p-6">
      <div className="glass-light border-trace rounded-3xl w-full max-w-md p-8">
        <h1 className="text-3xl font-bold text-electricBlue text-center mb-2">
          Reset Password
        </h1>
        <p className="text-gray-300 text-sm text-center mb-6">
          Enter your new password below
        </p>

        {notification && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              notification.type === "success"
                ? "bg-green-100/20 border-green-300/30 text-green-300"
                : "bg-red-100/20 border-red-300/30 text-red-300"
            }`}
          >
            <p className="text-sm">{notification.message}</p>
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="relative">
            <input
              type="password"
              placeholder="New Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-cyberBlue/60 border border-neonAqua/40 text-softWhite
                         focus:outline-none focus:ring-2 focus:ring-neonAqua/70 transition-all pr-10"
            />
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          </div>

          <div className="relative">
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-cyberBlue/60 border border-neonAqua/40 text-softWhite
                         focus:outline-none focus:ring-2 focus:ring-neonAqua/70 transition-all pr-10"
            />
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          </div>

          <button
            type="submit"
            className="w-full mt-2 relative overflow-hidden px-6 py-3 rounded-xl bg-electricBlue text-cyberBlue font-semibold cursor-pointer"
          >
            <span className="relative z-10">Change Password</span>
            <span className="absolute inset-0 rounded-xl blur-xl opacity-70 btn-pulse bg-neonAqua"></span>
          </button>
        </form>

        {notification?.type === "success" && (
          <div className="mt-6 flex justify-center">
            <Link
              to="/login"
              className="flex items-center gap-2 text-green-400 hover:underline"
            >
              <CheckCircle size={16} /> Back to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
