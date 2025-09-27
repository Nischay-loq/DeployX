import { useState, useEffect } from 'react';
import { X, Mail } from 'lucide-react';

export default function OTPVerification({ 
  email, 
  onVerify, 
  onBack, 
  onResend,
  title = "Verify Email",
  subtitle = "We've sent a verification code to your email",
  standalone = false // Whether to render as standalone page or embedded component
}) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleOtpChange = (index, value) => {
    // Only allow single digits
    if (value.length > 1) return;
    
    // Only allow numeric characters
    if (value && !/^\d$/.test(value)) {
      setError('Verification code must contain only numbers');
      return;
    }
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }

    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const otpString = otp.join('');
    
    // Validate OTP format
    if (!otpString.trim()) {
      setError('Verification code is required');
      return;
    }
    
    if (otpString.length !== 6) {
      setError('Verification code must be exactly 6 digits');
      return;
    }
    
    if (!/^\d{6}$/.test(otpString)) {
      setError('Verification code must contain only numbers');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      await onVerify(otpString);
    } catch (error) {
      setError(error.message || 'Invalid verification code. Please check the code sent to your email and try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    
    setCanResend(false);
    setCountdown(60);
    setError('');
    
    try {
      await onResend();
    } catch (error) {
      setError('Failed to resend OTP. Please try again.');
    }
  };

  const renderContent = () => (
    <>
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-electricBlue/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Mail className="text-electricBlue" size={24} />
        </div>
        <h1 className="text-3xl font-bold text-electricBlue mb-2">
          {title}
        </h1>
        <p className="text-gray-300 text-sm">
          {subtitle}
        </p>
        <p className="text-neonAqua font-medium">{email}</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 rounded-lg border bg-red-100/20 border-red-300/30 text-red-300">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full flex items-center justify-center bg-red-500">
              <span className="text-white text-xs font-bold">!</span>
            </div>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* OTP Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* OTP Input */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Enter verification code
          </label>
          <div className="flex gap-3 justify-center">
            {otp.map((digit, index) => (
              <input
                key={index}
                id={`otp-${index}`}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength="1"
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-12 h-12 text-center text-xl font-bold rounded-xl bg-cyberBlue/60 border border-neonAqua/40 text-softWhite focus:outline-none focus:ring-2 focus:ring-neonAqua/70 transition-all"
                disabled={isVerifying}
              />
            ))}
          </div>
        </div>

        {/* Verify Button */}
        <button
          type="submit"
          disabled={isVerifying || otp.join('').length !== 6}
          className="w-full relative overflow-hidden px-6 py-3 rounded-xl bg-electricBlue text-cyberBlue font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <span className="relative z-10">
            {isVerifying ? "Verifying..." : "Verify Code"}
          </span>
          <span className="absolute inset-0 rounded-xl blur-xl opacity-70 btn-pulse bg-neonAqua"></span>
        </button>

        {/* Resend Section */}
        <div className="text-center">
          <p className="text-gray-400 text-sm mb-2">
            Didn't receive the code?
          </p>
          {canResend ? (
            <button
              type="button"
              onClick={handleResend}
              className="text-electricBlue hover:underline font-medium cursor-pointer"
            >
              Resend Code
            </button>
          ) : (
            <p className="text-gray-500 text-sm">
              Resend in {countdown}s
            </p>
          )}
        </div>

        {/* Back Button */}
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="w-full px-6 py-3 rounded-xl border border-gray-600 text-gray-300 font-semibold hover:bg-gray-800/30 transition-all cursor-pointer"
          >
            Back to Sign Up
          </button>
        )}
      </form>
    </>
  );

  if (standalone) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-[radial-gradient(circle_at_20%_20%,rgba(0,255,247,0.12),transparent_35%),radial-gradient(circle_at_80%_80%,rgba(0,168,255,0.12),transparent_35%)]">
        {/* Animated background particles */}
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

        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="glass-light border-trace rounded-3xl w-full max-w-md p-8">
            {renderContent()}
          </div>
        </div>
      </div>
    );
  }

  return renderContent();
}