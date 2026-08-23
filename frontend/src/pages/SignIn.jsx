import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
  Eye, EyeOff, ArrowRight, ArrowLeft, CheckCircle, Shield,
  X, Mail, Lock, KeyRound, Terminal, Package, FolderOpen,
  Network, CalendarClock, Loader,
} from 'lucide-react';
import authService from '../services/auth.js';
import useGoogleAuth from '../hooks/useGoogleAuth.js';

/* ─── Forgot password modal (link-based reset, matching our backend) ────────── */
function ForgotPasswordModal({ onClose }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.trim()) { setError('Email address is required'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Please enter a valid email address'); return; }
    try {
      setLoading(true);
      setError('');
      await authService.requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(err.message || 'Failed to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl w-full max-w-md p-8 z-10">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg
                     text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {sent ? (
          <div className="space-y-5 text-center py-2">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-100 mb-1">Check your inbox</h2>
              <p className="text-sm text-slate-500">
                If an account exists for <span className="text-slate-300 font-medium">{email}</span>,
                a password reset link is on its way.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm
                         rounded-xl transition-all shadow-lg shadow-brand-600/30"
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-slate-100 mb-1">Reset your password</h2>
              <p className="text-sm text-slate-500">
                Enter your registered email address and we'll send you a secure reset link.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  placeholder="Enter your email"
                  className={`w-full pl-10 pr-4 py-3 bg-slate-800 border rounded-xl text-slate-100 text-sm
                             placeholder:text-slate-500 focus:outline-none focus:ring-2
                             focus:ring-brand-500 focus:border-transparent transition-all
                             ${error ? 'border-red-400' : 'border-slate-700 hover:border-slate-600'}`}
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && !loading && submit()}
                />
              </div>
              {error && <p className="mt-1.5 text-xs text-red-400">⚠ {error}</p>}
            </div>

            <button
              type="button"
              onClick={submit}
              disabled={!email.trim() || loading}
              className="w-full flex items-center justify-center gap-2.5 py-3.5
                         bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:pointer-events-none
                         text-white font-semibold text-sm rounded-xl transition-all
                         shadow-lg shadow-brand-600/30 focus:outline-none focus:ring-2 focus:ring-brand-400"
            >
              {loading ? (
                <><Loader className="w-4 h-4 animate-spin" /> Sending link…</>
              ) : (
                <><KeyRound className="w-4 h-4" /> Send Reset Link</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Left brand panel ──────────────────────────────────────────────────────── */
const HIGHLIGHTS = [
  { icon: Terminal, label: 'Interactive remote shell from your browser' },
  { icon: Package, label: 'Bulk software deployment in one click' },
  { icon: FolderOpen, label: 'File transfer & remote file management' },
  { icon: Network, label: 'Group-based targeting across your fleet' },
  { icon: CalendarClock, label: 'Scheduled deployments & automation' },
  { icon: CheckCircle, label: 'Live results for every device' },
];

function LeftPanel() {
  return (
    <div className="auth-panel hidden lg:flex h-screen flex-col justify-start gap-8 p-10 xl:p-12 bg-gradient-to-br from-brand-950 via-brand-900 to-slate-900 relative overflow-hidden">
      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage:
            'linear-gradient(rgba(59,130,246,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.12) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      {/* Glow blobs */}
      <div className="absolute top-10 right-10 w-72 h-72 bg-brand-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-10 w-56 h-56 bg-cyan-500/15 rounded-full blur-3xl" />

      {/* Logo */}
      <div className="relative flex items-center gap-3">
        <img src="/logo.svg" alt="DeployX logo" className="h-10 w-auto" />
        <div>
          <p className="text-white font-bold text-lg leading-tight">DeployX</p>
          <p className="text-brand-300 text-xs">Fleet Deployment &amp; Management Platform</p>
        </div>
      </div>

      {/* Main copy */}
      <div className="relative">
        <h2 className="text-2xl xl:text-3xl font-extrabold text-white leading-tight mb-3">
          One platform for<br />
          <span className="bg-gradient-to-r from-brand-300 via-cyan-300 to-emerald-300 bg-clip-text text-transparent">
            every device, every deploy
          </span>
        </h2>
        <p className="text-slate-400 text-sm leading-relaxed mb-6 max-w-sm">
          Push software to hundreds of machines, open remote shells, transfer files and schedule
          maintenance — all from a single, secure command center.
        </p>
        <ul className="space-y-2.5">
          {HIGHLIGHTS.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-3 text-sm text-slate-300">
              <div className="w-6 h-6 rounded-lg bg-brand-600/30 flex items-center justify-center shrink-0">
                <Icon className="w-3.5 h-3.5 text-brand-400" />
              </div>
              {label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ─── Sign In page ──────────────────────────────────────────────────────────── */
export default function SignIn() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const googleAuth = useGoogleAuth(() => navigate('/dashboard', { replace: true }));

  if (authService.isLoggedIn()) return <Navigate to="/dashboard" replace />;

  const validate = () => {
    const errs = {};
    if (!formData.username.trim()) errs.username = 'Username or email is required';
    if (!formData.password) errs.password = 'Password is required';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      await authService.login(
        { username: formData.username.trim(), password: formData.password },
        rememberMe
      );
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setGeneralError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputCls = (hasError) =>
    `w-full px-4 py-3 bg-slate-800 border rounded-xl text-slate-100 text-sm
     placeholder:text-slate-500 focus:outline-none focus:ring-2
     focus:ring-brand-500 focus:border-transparent transition-all
     ${hasError ? 'border-red-400' : 'border-slate-700 hover:border-slate-600'}`;

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden grid lg:grid-cols-2 bg-slate-950">
      <LeftPanel />

      {forgotOpen && <ForgotPasswordModal onClose={() => setForgotOpen(false)} />}

      {/* Right — form */}
      <div className="flex flex-col min-h-screen lg:min-h-0 lg:h-screen relative
                      bg-slate-950 px-4 sm:px-6 py-8 lg:py-10 lg:overflow-y-auto">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="self-start inline-flex items-center gap-2 px-3 py-2 mb-4 text-sm font-medium
                     text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2.5 mb-6 self-start">
          <img src="/logo.svg" alt="DeployX logo" className="h-9 w-auto" />
          <span className="text-slate-100 font-bold text-lg">DeployX</span>
        </div>

        <div className="w-full max-w-md lg:max-w-lg mx-auto my-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-extrabold text-slate-100 mb-1.5">Welcome back</h1>
            <p className="text-slate-500 text-sm">
              Sign in to your DeployX account to continue.
            </p>
          </div>

          {/* Form card */}
          <div className="bg-slate-900 border border-slate-700/60 rounded-2xl p-6 shadow-2xl">
            {generalError && (
              <div className="mb-5 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-start gap-2">
                <X className="w-4 h-4 shrink-0 mt-0.5" />
                {generalError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* Username / Email */}
              <div>
                <label htmlFor="signin-username" className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                  Username or Email
                </label>
                <input
                  id="signin-username"
                  type="text"
                  autoComplete="username"
                  value={formData.username}
                  onChange={(e) => { setFormData(p => ({ ...p, username: e.target.value })); setFieldErrors(pe => ({ ...pe, username: '' })); }}
                  placeholder="Enter your username or email"
                  className={inputCls(fieldErrors.username)}
                />
                {fieldErrors.username && <p className="mt-1.5 text-xs text-red-400">⚠ {fieldErrors.username}</p>}
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="signin-password" className="block text-xs font-semibold text-slate-500 uppercase tracking-widest">
                    Password
                  </label>
                  <button
                    type="button"
                    className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
                    onClick={() => setForgotOpen(true)}
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="signin-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={formData.password}
                    onChange={(e) => { setFormData(p => ({ ...p, password: e.target.value })); setFieldErrors(pe => ({ ...pe, password: '' })); }}
                    placeholder="Enter your password"
                    className={`${inputCls(fieldErrors.password)} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-100 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.password && <p className="mt-1.5 text-xs text-red-400">⚠ {fieldErrors.password}</p>}
              </div>

              {/* Remember me */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none w-fit">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-brand-500 focus:ring-brand-500 focus:ring-offset-0"
                />
                <span className="text-sm text-slate-400">Remember me on this device</span>
              </label>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="group w-full flex items-center justify-center gap-2.5 py-3.5
                           bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:pointer-events-none
                           text-white font-semibold text-sm rounded-xl transition-all
                           shadow-lg shadow-brand-600/30 hover:shadow-brand-500/40
                           focus:outline-none focus:ring-2 focus:ring-brand-400"
              >
                {isSubmitting ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-slate-700/60" />
              <span className="text-xs text-slate-500">or</span>
              <div className="flex-1 h-px bg-slate-700/60" />
            </div>

            {/* Google */}
            <button
              type="button"
              onClick={() => googleAuth.prompt(false)}
              disabled={googleAuth.loading || isSubmitting}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white text-gray-900
                         font-semibold text-sm shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all
                         disabled:opacity-50 disabled:pointer-events-none"
            >
              <img src="https://www.svgrepo.com/show/355037/google.svg" alt="Google logo" className="w-5 h-5" />
              {googleAuth.loading ? 'Connecting…' : 'Continue with Google'}
            </button>

            {/* Switch */}
            <p className="text-center text-sm text-slate-400 mt-6">
              Don't have an account?{' '}
              <Link to="/signup" className="text-brand-400 hover:text-brand-300 font-semibold transition-colors">
                Create one free →
              </Link>
            </p>
          </div>

          {/* Trust strip */}
          <div className="mt-6 flex items-center justify-center gap-4 flex-wrap">
            {[
              { icon: Shield, text: 'Secure login' },
              { icon: CheckCircle, text: 'JWT protected' },
              { icon: CheckCircle, text: 'Session control' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-1.5 text-slate-500 text-xs">
                <Icon className="w-3 h-3 text-emerald-500" />
                {text}
              </div>
            ))}
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} DeployX. All rights reserved.
        </p>
      </div>
    </div>
  );
}
