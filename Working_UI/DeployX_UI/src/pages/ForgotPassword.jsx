import { Link } from "react-router-dom";
import { useState } from "react";
import { Mail, Shield, ArrowLeft } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [notification, setNotification] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setNotification(null);

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setNotification({
        type: "success",
        message: "If an account exists, a reset link has been sent to your email."
      });
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_20%_20%,rgba(0,255,247,0.12),transparent_35%),radial-gradient(circle_at_80%_80%,rgba(0,168,255,0.12),transparent_35%)] p-6">
      <div className="glass-light border-trace rounded-3xl w-full max-w-md p-8">
        
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-electricBlue mb-2">
            Forgot Password
          </h1>
          <p className="text-gray-300 text-sm">
            Enter your registered email to reset your password
          </p>
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
            <p className="text-sm">{notification.message}</p>
          </div>
        )}

        {/* Form */}
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="relative">
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-cyberBlue/60 border border-neonAqua/40 text-softWhite
                         focus:outline-none focus:ring-2 focus:ring-neonAqua/70 transition-all pr-10"
            />
            <Mail className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          </div>

          <button 
  type="submit"
  disabled={isLoading}
  className="w-full mt-2 relative overflow-hidden px-6 py-3 rounded-xl bg-electricBlue text-cyberBlue font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
>
  <span className="relative z-10">
    {isLoading ? "Sending Reset Link..." : "Send Reset Link"}
  </span>
  <span className="absolute inset-0 rounded-xl blur-xl opacity-70 btn-pulse bg-neonAqua"></span>
</button>

        </form>

        {/* Links */}
        <div className="mt-6 flex flex-col items-center gap-3 text-sm">
          <Link to="/login" className="flex items-center gap-2 text-electricBlue hover:underline cursor-pointer">
            <ArrowLeft size={16} /> Back to Login
          </Link>
          <p className="text-gray-400">
            Don’t have an account?{" "}
            <Link to="/signup" className="text-electricBlue hover:underline cursor-pointer">
              Sign Up
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
  );
}
