import { useState, useEffect } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
  Eye, EyeOff, ArrowRight, ArrowLeft, CheckCircle, Circle,
  Shield, X, Mail, Lock, KeyRound, User as UserIcon,
  Zap, Terminal as TerminalIcon, Globe, Loader,
} from 'lucide-react';
import authService from '../services/auth.js';
import useGoogleAuth from '../hooks/useGoogleAuth.js';

/* ─── Password strength ─────────────────────────────────────────────────────── */
function getPasswordStrength(pw) {
  let score = 0;
  if (pw.length >= 6) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (pw.length >= 12) score++;

  if (score <= 1) return { label: 'Weak', pct: 20, color: 'bg-red-500' };
  if (score === 2) return { label: 'Fair', pct: 40, color: 'bg-amber-500' };
  if (score === 3) return { label: 'Good', pct: 65, color: 'bg-yellow-400' };
  if (score === 4) return { label: 'Strong', pct: 85, color: 'bg-emerald-400' };
  return { label: 'Excellent', pct: 100, color: 'bg-brand-500' };
}

const REQUIREMENTS = [
  { test: (v) => v.length >= 6, required: true, label: 'At least 6 characters' },
  { test: (v) => /[A-Z]/.test(v), required: false, label: 'One uppercase letter (recommended)' },
  { test: (v) => /[0-9]/.test(v), required: false, label: 'One number (recommended)' },
  { test: (v) => /[^A-Za-z0-9]/.test(v), required: false, label: 'One special character (bonus)' },
];

/* ─── Left brand panel ──────────────────────────────────────────────────────── */
const PERKS = [
  { icon: Zap, title: 'One-Click Rollouts', desc: 'Push software to your entire fleet instantly.' },
  { icon: TerminalIcon, title: 'Browser Shell', desc: 'Fix problems live with a real remote terminal.' },
  { icon: Shield, title: 'Secure by Design', desc: 'Activation keys and JWT keep access locked down.' },
  { icon: Globe, title: 'Works Anywhere', desc: 'Agents connect out — NATs and firewalls are fine.' },
];

function LeftPanel() {
  return (
    <div className="auth-panel hidden lg:flex h-screen flex-col justify-between gap-8 p-10 xl:p-12 bg-gradient-to-br from-slate-950 via-brand-950 to-slate-900 relative overflow-hidden">
      {/* Grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage:
            'linear-gradient(rgba(59,130,246,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.12) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/15 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />

      {/* Logo */}
      <div className="relative flex items-center gap-3">
        <img src="/logo.svg" alt="DeployX logo" className="h-10 w-auto" />
        <div>
          <p className="text-white font-bold text-lg leading-tight">DeployX</p>
          <p className="text-brand-300 text-xs">Fleet Deployment &amp; Management Platform</p>
        </div>
      </div>

      {/* Copy */}
      <div className="relative">
        <h2 className="text-2xl xl:text-3xl font-extrabold text-white leading-tight mb-3">
          Join DeployX and<br />
          <span className="bg-gradient-to-r from-emerald-300 via-cyan-300 to-brand-300 bg-clip-text text-transparent">
            command your whole fleet
          </span>
        </h2>
        <p className="text-slate-400 text-sm leading-relaxed mb-6 max-w-sm">
          Create your account and get instant access to bulk deployments, remote shells,
          file transfers, and automation across every machine you manage.
        </p>

        <div className="grid grid-cols-2 gap-3">
          {PERKS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white/5 border border-white/10 rounded-2xl p-3">
              <div className="w-7 h-7 bg-brand-600/25 rounded-xl flex items-center justify-center mb-2">
                <Icon className="w-4 h-4 text-brand-400" />
              </div>
              <p className="text-white text-xs font-semibold mb-1">{title}</p>
              <p className="text-slate-500 text-xs leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Security note */}
        <div className="flex items-start gap-3 px-4 py-3 bg-brand-600/10 border border-brand-500/20 rounded-xl mt-6">
          <Shield className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-500 leading-relaxed">
            Agents only enroll with an activation key issued from your account — your fleet stays
            yours alone.
          </p>
        </div>
      </div>

      {/* Footer note */}
      <p className="relative text-xs text-slate-600">
        Free for small fleets · No credit card required
      </p>
    </div>
  );
}

/* ─── Sign Up page ──────────────────────────────────────────────────────────── */
export default function SignUp() {
  const navigate = useNavigate();
  const [step, setStep] = useState('form'); // 'form' | 'otp'
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [formData, setFormData] = useState({
    username: '', email: '', password: '', confirmPassword: '', otp: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const googleAuth = useGoogleAuth(() => navigate('/dashboard', { replace: true }));

  useEffect(() => {
    if (!success || step !== 'done') return;
    const t = setTimeout(() => navigate('/signin', { replace: true }), 2500);
    return () => clearTimeout(t);
  }, [success, step, navigate]);

  if (authService.isLoggedIn()) return <Navigate to="/dashboard" replace />;

  const setField = (name, value) => {
    setFormData((p) => ({ ...p, [name]: value }));
    setFieldErrors((pe) => ({ ...pe, [name]: '' }));
    setGeneralError('');
  };

  const validateForm = () => {
    const errs = {};
    const { username, email, password, confirmPassword } = formData;

    if (!username.trim()) errs.username = 'Username is required';
    else if (username.length < 3) errs.username = 'Username must be at least 3 characters long';
    else if (username.length > 50) errs.username = 'Username must not exceed 50 characters';
    else if (!/^[a-zA-Z0-9_]+$/.test(username)) errs.username = 'Only letters, numbers and underscores';

    if (!email.trim()) errs.email = 'Email address is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Please enter a valid email address';

    if (!password) errs.password = 'Password is required';
    else if (password.length < 6) errs.password = 'Password must be at least 6 characters long';
    else if (password.length > 128) errs.password = 'Password must not exceed 128 characters';

    if (!confirmPassword) errs.confirmPassword = 'Please confirm your password';
    else if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match';

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSendOtp = async () => {
    setGeneralError('');
    if (!validateForm()) return;
    try {
      setIsSubmitting(true);
      await authService.signupRequest({
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
      });
      setStep('otp');
      setSuccess('');
    } catch (err) {
      setGeneralError(err.message || 'Failed to send the verification code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async () => {
    setGeneralError('');
    const otp = formData.otp.trim();
    if (!otp) { setFieldErrors((p) => ({ ...p, otp: 'Verification code is required' })); return; }
    if (!/^\d{6}$/.test(otp)) { setFieldErrors((p) => ({ ...p, otp: 'Code must be exactly 6 digits' })); return; }

    try {
      setIsSubmitting(true);
      await authService.signupComplete(formData.email.trim(), otp);
      setStep('done');
      setSuccess('Account created successfully! Redirecting you to sign in…');
    } catch (err) {
      setGeneralError(err.message || 'Verification failed. Please check the code and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputCls = (hasError) =>
    `w-full px-4 py-3 bg-slate-800 border rounded-xl text-slate-100 text-sm
     placeholder:text-slate-500 focus:outline-none focus:ring-2
     focus:ring-brand-500 focus:border-transparent transition-all
     ${hasError ? 'border-red-400' : 'border-slate-700 hover:border-slate-600'}`;

  const strength = getPasswordStrength(formData.password);
  const pw = formData.password;

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden grid lg:grid-cols-2 bg-slate-950">
      <LeftPanel />

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
            <h1 className="text-2xl font-extrabold text-slate-100 mb-1.5">
              {step === 'form' ? 'Create your account' : 'Verify your email'}
            </h1>
            <p className="text-slate-500 text-sm">
              {step === 'form'
                ? 'Free for small fleets. Set up in under a minute.'
                : <>We sent a 6-digit code to <span className="text-slate-300 font-medium">{formData.email}</span>.</>}
            </p>
          </div>

          {/* Form card */}
          <div className="bg-slate-900 border border-slate-700/60 rounded-2xl p-6 shadow-2xl">
            {(generalError || googleAuth.error) && (
              <div className="mb-5 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-start gap-2">
                <X className="w-4 h-4 shrink-0 mt-0.5" />
                {generalError || googleAuth.error}
              </div>
            )}

            {success && (
              <div className="mb-5 px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm flex items-start gap-2">
                <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                {success}
              </div>
            )}

            {step === 'done' ? (
              <div className="py-4 text-center space-y-4">
                <Loader className="w-5 h-5 animate-spin text-brand-400 mx-auto" />
                <Link
                  to="/signin"
                  className="inline-block text-brand-400 hover:text-brand-300 font-semibold text-sm transition-colors"
                >
                  Go to sign in →
                </Link>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  step === 'form' ? handleSendOtp() : handleVerify();
                }}
                className="space-y-5"
                noValidate
              >
                {step === 'form' && (
                  <>
                    {/* Username */}
                    <div>
                      <label htmlFor="su-username" className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                        Username
                      </label>
                      <div className="relative">
                        <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                        <input
                          id="su-username"
                          type="text"
                          autoComplete="username"
                          value={formData.username}
                          onChange={(e) => setField('username', e.target.value)}
                          placeholder="Choose a username"
                          className={`${inputCls(fieldErrors.username)} pl-10`}
                        />
                      </div>
                      {fieldErrors.username && <p className="mt-1.5 text-xs text-red-400">⚠ {fieldErrors.username}</p>}
                    </div>

                    {/* Email */}
                    <div>
                      <label htmlFor="su-email" className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                        <input
                          id="su-email"
                          type="email"
                          autoComplete="email"
                          value={formData.email}
                          onChange={(e) => setField('email', e.target.value)}
                          placeholder="you@company.com"
                          className={`${inputCls(fieldErrors.email)} pl-10`}
                        />
                      </div>
                      {fieldErrors.email && <p className="mt-1.5 text-xs text-red-400">⚠ {fieldErrors.email}</p>}
                    </div>

                    {/* Password */}
                    <div>
                      <label htmlFor="su-password" className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                        <input
                          id="su-password"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          value={pw}
                          onChange={(e) => setField('password', e.target.value)}
                          placeholder="Create a password"
                          className={`${inputCls(fieldErrors.password)} pl-10 pr-11`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-100 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Strength meter */}
                      {pw && (
                        <div className="mt-2.5">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-slate-500">Password strength</span>
                            <span className={`font-medium ${
                              strength.label === 'Weak' ? 'text-red-400' :
                              strength.label === 'Fair' ? 'text-amber-400' :
                              strength.label === 'Good' ? 'text-yellow-300' :
                              strength.label === 'Strong' ? 'text-emerald-400' : 'text-brand-400'
                            }`}>{strength.label}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${strength.color}`} style={{ width: `${strength.pct}%` }} />
                          </div>
                        </div>
                      )}

                      {/* Requirements */}
                      <ul className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                        {REQUIREMENTS.map(({ test, label }) => {
                          const met = test(pw);
                          return (
                            <li key={label} className={`flex items-center gap-1.5 text-xs ${met ? 'text-emerald-400' : 'text-slate-500'}`}>
                              <CheckCircle className={`w-3 h-3 shrink-0 ${met ? 'text-emerald-400' : 'text-slate-600'}`} />
                              <span className={met ? '' : 'opacity-80'}>{label.replace(/ \(.*\)/, '')}{!met && label.includes('(') ? ' *' : ''}</span>
                            </li>
                          );
                        })}
                      </ul>
                      {fieldErrors.password && <p className="mt-1.5 text-xs text-red-400">⚠ {fieldErrors.password}</p>}
                    </div>

                    {/* Confirm */}
                    <div>
                      <label htmlFor="su-confirm" className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                        <input
                          id="su-confirm"
                          type={showConfirm ? 'text' : 'password'}
                          autoComplete="new-password"
                          value={formData.confirmPassword}
                          onChange={(e) => setField('confirmPassword', e.target.value)}
                          placeholder="Re-enter your password"
                          className={`${inputCls(fieldErrors.confirmPassword)} pl-10 pr-11`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm((v) => !v)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-100 transition-colors"
                        >
                          {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {fieldErrors.confirmPassword && <p className="mt-1.5 text-xs text-red-400">⚠ {fieldErrors.confirmPassword}</p>}
                    </div>
                  </>
                )}

                {step === 'otp' && (
                  <>
                    <div>
                      <label htmlFor="su-otp" className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                        Verification Code
                      </label>
                      <input
                        id="su-otp"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={formData.otp}
                        onChange={(e) => setField('otp', e.target.value.replace(/\D/g, ''))}
                        placeholder="••••••"
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl
                                   text-slate-100 text-center tracking-[0.5em] text-lg font-mono
                                   focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                        autoFocus
                      />
                      {fieldErrors.otp && <p className="mt-1.5 text-xs text-red-400 text-center">⚠ {fieldErrors.otp}</p>}
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <button
                        type="button"
                        onClick={() => { setStep('form'); setFormData((p) => ({ ...p, otp: '' })); }}
                        className="hover:text-slate-300 transition-colors"
                      >
                        ← Change details
                      </button>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={handleSendOtp}
                        className="text-brand-400 hover:text-brand-300 font-medium transition-colors disabled:opacity-50"
                      >
                        {isSubmitting ? 'Sending…' : 'Resend code'}
                      </button>
                    </div>
                  </>
                )}

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
                      {step === 'form' ? 'Sending code…' : 'Creating account…'}
                    </>
                  ) : (
                    <>
                      {step === 'form' ? 'Send Verification Code' : 'Verify & Create Account'}
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </form>
            )}

            {step !== 'done' && (
              <>
                {/* Divider */}
                <div className="flex items-center gap-3 my-6">
                  <div className="flex-1 h-px bg-slate-700/60" />
                  <span className="text-xs text-slate-500">or</span>
                  <div className="flex-1 h-px bg-slate-700/60" />
                </div>

                {/* Google */}
                <button
                  type="button"
                  onClick={() => googleAuth.prompt(true)}
                  disabled={googleAuth.loading || isSubmitting}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white text-gray-900
                             font-semibold text-sm shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all
                             disabled:opacity-50 disabled:pointer-events-none"
                >
                  <img src="https://www.svgrepo.com/show/355037/google.svg" alt="Google logo" className="w-5 h-5" />
                  {googleAuth.loading ? 'Connecting…' : 'Sign up with Google'}
                </button>
              </>
            )}

            {/* Switch */}
            {step !== 'done' && (
              <p className="text-center text-sm text-slate-400 mt-6">
                Already have an account?{' '}
                <Link to="/signin" className="text-brand-400 hover:text-brand-300 font-semibold transition-colors">
                  Sign in →
                </Link>
              </p>
            )}
          </div>

          {/* Trust strip */}
          <div className="mt-6 flex items-center justify-center gap-4 flex-wrap">
            {[
              { icon: KeyRound, text: 'OTP verified signup' },
              { icon: CheckCircle, text: 'No credit card' },
              { icon: Shield, text: 'JWT protected' },
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
