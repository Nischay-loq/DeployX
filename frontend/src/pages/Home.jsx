import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle, Package, FolderOpen, Users, BarChart3,
  CheckCircle, ChevronLeft, ChevronRight, ArrowRight,
  Mail, Phone, MapPin, Clock, Star, Network,
  Cpu, Layers, Bell, Lock, Globe, TrendingUp, X, Menu,
  Send, Terminal, CalendarClock, ShieldCheck, Zap, Sun, Moon,
} from 'lucide-react'
import { useTheme } from '../hooks/useTheme.js'

/* ─── Data ──────────────────────────────────────────────────────────────────── */

const NAV_LINKS = [
  { label: 'Features', id: 'features' },
  { label: 'Why DeployX', id: 'why' },
  { label: 'Contact', id: 'contact' },
]

const FEATURES = [
  {
    icon: Terminal,
    title: 'Interactive Remote Shell',
    description:
      'Open a live cmd, PowerShell, or bash session on any managed device straight from your browser. Full readline editing, history search, and tab completion included.',
    color: 'text-sky-400',
    bg: 'from-sky-500/15 to-slate-800',
    points: [
      'cmd, PowerShell & bash sessions',
      'Real-time streamed output',
      'Readline keys: Ctrl+R search, Ctrl+L clear',
      'Run commands across device groups at once',
    ],
  },
  {
    icon: Package,
    title: 'Bulk Software Deployment',
    description:
      'Push installers and updates to your entire fleet in one click. DeployX handles transfer, execution, and verification while you watch results roll in live.',
    color: 'text-emerald-400',
    bg: 'from-emerald-500/15 to-slate-800',
    points: [
      'Silent installs across hundreds of devices',
      'Per-device success & failure results',
      'Retry only the targets that failed',
      'Deployment history with full audit trail',
    ],
  },
  {
    icon: FolderOpen,
    title: 'File Management & Transfer',
    description:
      'Browse remote file systems, upload payloads, and pull back logs without ever leaving the dashboard. Snapshots sync to cloud storage automatically.',
    color: 'text-violet-400',
    bg: 'from-violet-500/15 to-slate-800',
    points: [
      'Remote file browser per device',
      'Upload & download with progress tracking',
      'Google Drive snapshot backups',
      'Path bookmarks for quick navigation',
    ],
  },
  {
    icon: Network,
    title: 'Device Groups & Targeting',
    description:
      'Organize machines into labs, departments, or roles. Target deployments, shells, and schedules at whole groups instead of clicking device by device.',
    color: 'text-amber-400',
    bg: 'from-amber-500/15 to-slate-800',
    points: [
      'Flexible grouping by lab, floor, or function',
      'Group-wide shell & command execution',
      'Online status at a glance',
      'Instant re-targeting when fleets change',
    ],
  },
  {
    icon: CalendarClock,
    title: 'Schedules & Automation',
    description:
      'Turn repetitive maintenance into scheduled jobs. Run commands, deploy software, or gather logs at fixed times — even while you sleep.',
    color: 'text-cyan-400',
    bg: 'from-cyan-500/15 to-slate-800',
    points: [
      'One-off and recurring schedules',
      'Command & deployment job types',
      'Run history with outcomes',
      'Pause, edit, or rerun any schedule',
    ],
  },
  {
    icon: ShieldCheck,
    title: 'Secure by Design',
    description:
      'Activation-key enrollment, JWT auth, and destructive-command detection keep your fleet under control. Every action is logged and attributable.',
    color: 'text-rose-400',
    bg: 'from-rose-500/15 to-slate-800',
    points: [
      'Activation-key agent enrollment',
      'Destructive command detection & guard',
      'JWT-based authentication',
      'Complete activity logging',
    ],
  },
]

const ADVANTAGES = [
  {
    icon: Zap,
    title: 'One-Click Rollouts',
    description: 'What used to take a weekend of walking desk-to-desk now takes one click and a coffee break.',
  },
  {
    icon: Cpu,
    title: 'Lightweight Agent',
    description: 'A small Python agent on each machine relays shell, files, and telemetry — no heavy footprint.',
  },
  {
    icon: Terminal,
    title: 'Browser-Native Shell',
    description: 'Fix problems interactively from anywhere with a real terminal in your browser tab.',
  },
  {
    icon: Bell,
    title: 'Live Feedback',
    description: 'Watch output stream as it happens. Know instantly which devices succeeded and which need attention.',
  },
  {
    icon: Lock,
    title: 'Controlled Access',
    description: 'Activation keys, auth tokens, and destructive-command guards keep risky operations in check.',
  },
  {
    icon: Globe,
    title: 'Works Across Networks',
    description: 'Agents connect out to the server, so NATs and firewalls never get in the way of management.',
  },
  {
    icon: TrendingUp,
    title: 'Actionable Insights',
    description: 'Deployment trends, success rates, and fleet health metrics highlight what needs work.',
  },
  {
    icon: Star,
    title: 'Built for Real Fleets',
    description: 'Designed around actual lab and IT workflows: groups, schedules, rollouts, and cleanup.',
  },
]

const COMPARISONS = [
  { label: 'Bulk one-click software rollout', deployx: true, manual: false },
  { label: 'Interactive remote shell in browser', deployx: true, manual: false },
  { label: 'Group-based device targeting', deployx: true, manual: false },
  { label: 'Scheduled & recurring deployments', deployx: true, manual: false },
  { label: 'Real-time output streaming', deployx: true, manual: false },
  { label: 'Remote file browsing & transfer', deployx: true, manual: false },
  { label: 'Activation-key access control', deployx: true, manual: false },
  { label: 'Central activity logs & reports', deployx: true, manual: false },
]

const STATS = [
  { value: '∞', label: 'Fleet Size' },
  { value: '3', label: 'Shell Types' },
  { value: '10+', label: 'Core Modules' },
  { value: '24/7', label: 'Remote Access' },
]

const CONTACT_INFO_CARDS = [
  {
    icon: Mail,
    label: 'Email',
    value: 'contact@deployx.com',
    color: 'text-brand-400',
    bg: 'bg-brand-500/10',
  },
  {
    icon: Phone,
    label: 'Phone',
    value: '+1 (555) 123-4567 · Mon–Fri, 9 AM – 6 PM',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
  },
  {
    icon: MapPin,
    label: 'Address',
    value: 'Don Bosco Institute of Technology, Mumbai',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
  },
]

/* ─── Navbar ────────────────────────────────────────────────────────────────── */

function Navbar() {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const { theme, toggle } = useTheme()

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY >= window.innerHeight * 0.7)
    handler()
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setOpen(false)
  }

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-slate-900/90 backdrop-blur-xl border-b border-slate-700/60 shadow-lg'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        {/* Brand */}
        <div className="flex items-center gap-2.5 shrink-0">
          <img src="/logo.svg" alt="DeployX logo" className="h-8 w-auto" />
          <span className="text-lg font-bold tracking-tight text-slate-100">DeployX</span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((l) => (
            <button
              key={l.id}
              onClick={() => scrollTo(l.id)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                scrolled
                  ? 'text-slate-300 hover:text-white hover:bg-white/5'
                  : 'text-slate-200/90 hover:text-white hover:bg-white/10'
              }`}
            >
              {l.label}
            </button>
          ))}
        </nav>

        {/* CTAs */}
        <div className="hidden md:flex items-center gap-2">
          {/* Theme toggle */}
          <button
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
              scrolled
                ? 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => navigate('/signin')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              scrolled ? 'text-slate-300 hover:text-white' : 'text-slate-100 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/signup')}
            className="px-4 py-2 text-sm font-semibold bg-brand-600 hover:bg-brand-500 text-white rounded-xl transition-all shadow-lg shadow-brand-600/30"
          >
            Get Started
          </button>
        </div>

        {/* Mobile */}
        <div className="md:hidden flex items-center gap-1">
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            className="p-2 text-slate-200 hover:text-white transition-colors"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-slate-900/95 backdrop-blur-xl border-t border-slate-700/60 px-4 pb-4">
          {NAV_LINKS.map((l) => (
            <button
              key={l.id}
              onClick={() => scrollTo(l.id)}
              className="block w-full text-left px-3 py-3 text-sm font-medium text-slate-300 hover:text-white"
            >
              {l.label}
            </button>
          ))}
          <button
            onClick={() => { setOpen(false); navigate('/signup') }}
            className="mt-3 w-full py-2.5 text-sm font-semibold bg-brand-600 hover:bg-brand-500 text-white rounded-xl transition-colors"
          >
            Get Started
          </button>
        </div>
      )}
    </header>
  )
}

/* ─── Hero ──────────────────────────────────────────────────────────────────── */

function Hero() {
  const scrollTo = (id) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950">
      {/* Background video */}
      <video
        className="absolute inset-0 w-full h-full object-cover opacity-40"
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
      >
        <source src="/hero-video.mp4" type="video/mp4" />
      </video>

      {/* Contrast overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/60 to-slate-950" />

      {/* Animated grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(59,130,246,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.05) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-4 pt-16 sm:pt-20 lg:pt-24 text-center">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-100 leading-tight tracking-tight mb-4">
          <span className="block">Deploy Once,</span>
          <span className="block bg-gradient-to-r from-brand-400 via-brand-300 to-cyan-300 bg-clip-text text-transparent">
            Deploy Everywhere,
          </span>
          <span className="block">From One Command Center</span>
        </h1>

        <p className="text-base sm:text-lg text-slate-400 max-w-3xl mx-auto mb-8 leading-relaxed">
          DeployX is a unified fleet-management platform for IT teams and labs. Push software to
          hundreds of machines, open remote shells, transfer files, and automate maintenance —
          all from a single secure dashboard.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
          <button
            onClick={() => navigate('/signup')}
            className="group flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white
                       font-semibold rounded-xl transition-all shadow-xl shadow-brand-600/30 hover:shadow-brand-500/40
                       hover:-translate-y-0.5"
          >
            Start Managing Your Fleet
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </button>
          <button
            onClick={() => scrollTo('features')}
            className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200
                       font-semibold rounded-xl transition-all border border-slate-700 shadow-sm"
          >
            Explore Features
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
          {STATS.map(({ value, label }) => (
            <div key={label} className="bg-slate-900/70 backdrop-blur-sm border border-slate-700/60 rounded-xl p-3 shadow-sm">
              <p className="text-xl font-bold text-slate-100">{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── Features carousel ─────────────────────────────────────────────────────── */

function FeaturesCarousel() {
  const [current, setCurrent] = useState(0)
  const [autoplay, setAutoplay] = useState(true)
  const timerRef = useRef(null)

  useEffect(() => {
    if (!autoplay) return
    timerRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % FEATURES.length)
    }, 5000)
    return () => clearInterval(timerRef.current)
  }, [autoplay])

  const go = (idx) => {
    setCurrent(idx)
    setAutoplay(false)
    clearInterval(timerRef.current)
    timerRef.current = setTimeout(() => setAutoplay(true), 8000)
  }

  const f = FEATURES[current]
  const Icon = f.icon

  return (
    <section id="features" className="bg-slate-950 py-20 px-4 scroll-mt-16">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-slate-100 mb-4">
            Everything You Need to{' '}
            <span className="bg-gradient-to-r from-brand-400 to-cyan-300 bg-clip-text text-transparent">
              Run Your Fleet
            </span>
          </h2>
          <p className="text-slate-500 max-w-2xl mx-auto">
            Six integrated modules cover the full lifecycle — from pushing an installer to fixing
            a problem interactively on a machine three floors down.
          </p>
        </div>

        {/* Tab navigation */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {FEATURES.map((feat, i) => {
            const FIcon = feat.icon
            return (
              <button
                key={i}
                onClick={() => go(i)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  i === current
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30'
                    : 'bg-slate-900 text-slate-500 border border-slate-700/60 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <FIcon className="w-4 h-4" />
                <span className="hidden sm:inline">{feat.title.split(' ')[0]}</span>
              </button>
            )
          })}
        </div>

        {/* Carousel card */}
        <div className="relative">
          <div
            key={current}
            className={`bg-gradient-to-br ${f.bg} dark:from-slate-800 dark:to-slate-800 border border-slate-700/60
                        rounded-3xl overflow-hidden shadow-xl animate-fade-in`}
          >
            <div className="grid lg:grid-cols-2 min-h-[400px]">
              {/* Content */}
              <div className="p-8 sm:p-12 flex flex-col justify-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-900/80 border border-slate-700 flex items-center justify-center mb-6">
                  <Icon className={`w-7 h-7 ${f.color}`} />
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-4">{f.title}</h3>
                <p className="text-slate-400 text-base leading-relaxed mb-8">{f.description}</p>
                <ul className="space-y-3">
                  {f.points.map((pt) => (
                    <li key={pt} className="flex items-start gap-3 text-sm text-slate-300">
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Visual panel */}
              <div className="relative hidden lg:flex items-center justify-center p-6">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-72 h-72 rounded-full border border-slate-700/60" />
                  <div className="absolute w-52 h-52 rounded-full border border-slate-700/60" />
                  <div className="absolute w-32 h-32 rounded-full border border-slate-600" />
                </div>
                <div className="relative w-28 h-28 rounded-3xl bg-slate-900/80 border border-slate-600 flex items-center justify-center shadow-lg">
                  <Icon className={`w-14 h-14 ${f.color}`} />
                </div>
                {f.points.slice(0, 3).map((pt, pi) => (
                  <div
                    key={pi}
                    className="absolute bg-slate-900/90 backdrop-blur-sm border border-slate-600/60 rounded-xl px-3 py-2
                               text-xs text-slate-200 font-medium shadow-xl"
                    style={{
                      top: `${20 + pi * 30}%`,
                      right: pi % 2 === 0 ? '4%' : 'auto',
                      left: pi % 2 !== 0 ? '4%' : 'auto',
                    }}
                  >
                    <CheckCircle className="inline w-3 h-3 text-emerald-400 mr-1.5" />
                    {pt.split(' ').slice(0, 3).join(' ')}…
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Prev / Next */}
          <button
            onClick={() => go((current - 1 + FEATURES.length) % FEATURES.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900 border border-slate-700
                       items-center justify-center text-slate-300 hover:bg-slate-800 transition-colors shadow-lg hidden lg:flex"
            aria-label="Previous feature"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => go((current + 1) % FEATURES.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900 border border-slate-700
                       items-center justify-center text-slate-300 hover:bg-slate-800 transition-colors shadow-lg hidden lg:flex"
            aria-label="Next feature"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mt-8">
          {FEATURES.map((_, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              aria-label={`Go to feature ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === current ? 'w-8 bg-brand-500' : 'w-2 bg-slate-700 hover:bg-slate-600'
              }`}
            />
          ))}
        </div>

        <p className="text-center text-slate-600 text-xs mt-3">
          {current + 1} / {FEATURES.length}
        </p>
      </div>
    </section>
  )
}

/* ─── Why DeployX ───────────────────────────────────────────────────────────── */

function WhyDeployX() {
  return (
    <section id="why" className="bg-slate-900/40 py-24 px-4 scroll-mt-16 border-y border-slate-800/60">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-slate-100 mb-4">
            The Smarter Way to Manage{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-300 bg-clip-text text-transparent">
              Your Machines
            </span>
          </h2>
          <p className="text-slate-500 max-w-2xl mx-auto text-lg">
            USB sticks, spreadsheets, and one-at-a-time RDP sessions don't scale.
            DeployX was purpose-built for managing fleets of machines end-to-end.
          </p>
        </div>

        {/* Advantages grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-20">
          {ADVANTAGES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="group bg-slate-900 hover:bg-slate-800/80 border border-slate-700/60 hover:border-brand-500/40
                         rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg
                         hover:shadow-brand-600/10"
            >
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mb-4
                              group-hover:bg-brand-500/20 transition-colors">
                <Icon className="w-5 h-5 text-brand-400" />
              </div>
              <h3 className="text-sm font-bold text-slate-100 mb-2">{title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>

        {/* Comparison table */}
        <div className="bg-slate-900 border border-slate-700/60 rounded-3xl overflow-hidden shadow-lg">
          <div className="px-8 pt-8 pb-4">
            <h3 className="text-xl font-bold text-slate-100">DeployX vs. Manual Methods</h3>
            <p className="text-slate-500 text-sm mt-1">See what sets us apart at a glance.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/60">
                  <th className="text-left px-8 py-4 text-slate-500 text-sm font-medium">Capability</th>
                  <th className="px-8 py-4 text-center">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-500/10 border border-brand-500/30
                                     rounded-full text-brand-400 text-xs font-bold">
                      DeployX
                    </span>
                  </th>
                  <th className="px-8 py-4 text-center text-slate-500 text-sm font-medium">Manual / Scripts</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISONS.map(({ label, deployx, manual }, i) => (
                  <tr key={label} className={i % 2 === 0 ? 'bg-slate-800/40' : 'bg-slate-900'}>
                    <td className="px-8 py-4 text-slate-300 text-sm">{label}</td>
                    <td className="px-8 py-4 text-center">
                      {deployx
                        ? <CheckCircle className="w-5 h-5 text-emerald-400 mx-auto" />
                        : <X className="w-5 h-5 text-slate-600 mx-auto" />}
                    </td>
                    <td className="px-8 py-4 text-center">
                      {manual
                        ? <CheckCircle className="w-5 h-5 text-slate-500 mx-auto" />
                        : <X className="w-5 h-5 text-rose-500/70 mx-auto" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─── Contact ───────────────────────────────────────────────────────────────── */

function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 5000)
    setForm({ name: '', email: '', subject: '', message: '' })
  }

  const inputCls =
    'w-full px-4 py-3 bg-slate-900/70 border border-slate-700 rounded-xl text-slate-100 ' +
    'placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ' +
    'focus:border-transparent transition-all'

  return (
    <section id="contact" className="bg-slate-950 py-24 px-4 scroll-mt-16">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-slate-100 mb-4">
            We'd Love to{' '}
            <span className="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
              Hear From You
            </span>
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto text-lg">
            Have a question, want a demo, or ready to roll out DeployX across your fleet? Reach out.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-10">
          {/* Form */}
          <div className="bg-slate-900 border border-slate-700/60 rounded-3xl p-8 shadow-lg">
            <h3 className="text-lg font-bold text-slate-100 mb-6 flex items-center gap-2">
              <Mail className="w-5 h-5 text-brand-400" />
              Send a Message
            </h3>

            {submitted && (
              <div className="mb-6 flex items-center gap-3 px-4 py-3 bg-emerald-500/10 border border-emerald-500/30
                              rounded-xl text-emerald-400 text-sm">
                <CheckCircle className="w-4 h-4 shrink-0" />
                Message sent! We'll get back to you within 24 hours.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Full Name *</label>
                  <input name="name" value={form.name} onChange={handleChange} required placeholder="Your Name" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Email Address *</label>
                  <input name="email" type="email" value={form.email} onChange={handleChange} required placeholder="you@company.com" className={inputCls} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Subject</label>
                <select name="subject" value={form.subject} onChange={handleChange} className={`${inputCls} appearance-none`}>
                  <option value="">Select a topic…</option>
                  <option value="demo">Request a Demo</option>
                  <option value="pricing">Pricing / Licensing</option>
                  <option value="support">Technical Support</option>
                  <option value="feature">Feature Request</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Message *</label>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  required
                  rows={5}
                  placeholder="Tell us about your fleet and how we can help…"
                  className={`${inputCls} resize-none`}
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-brand-600 hover:bg-brand-500
                           text-white font-semibold rounded-xl transition-all shadow-lg shadow-brand-600/30
                           hover:shadow-brand-500/40"
              >
                <Send className="w-4 h-4" />
                Send Message
              </button>
            </form>
          </div>

          {/* Info + map */}
          <div className="flex flex-col gap-6">
            <div className="grid sm:grid-cols-3 gap-5">
              {CONTACT_INFO_CARDS.map(({ icon: Icon, label, value, color, bg }) => (
                <div key={label} className="bg-slate-900 border border-slate-700/60 rounded-2xl p-4">
                  <div className={`w-8 h-8 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <p className="text-xs text-slate-500 font-medium mb-1">{label}</p>
                  <p className="text-xs text-slate-300 leading-snug">{value}</p>
                </div>
              ))}
            </div>

            <div className="flex-1 min-h-64 rounded-3xl overflow-hidden border border-slate-700/60 shadow-lg">
              <iframe
                title="DeployX Location - Don Bosco Institute of Technology"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3770.6014441451616!2d72.8860211749775!3d19.0812531821244!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be7c8866a456c9f%3A0x8d1745d15baac575!2sDon%20Bosco%20Institute%20of%20Technology%2C%20Mumbai!5e0!3m2!1sen!2sin!4v1755793214980!5m2!1sen!2sin"
                width="100%"
                height="100%"
                style={{ minHeight: '260px', border: 0 }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─── Footer ────────────────────────────────────────────────────────────────── */

function Footer() {
  return (
    <footer className="bg-slate-900 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="DeployX logo" className="h-6 w-auto" />
            <p className="text-xs text-slate-400">
              © {new Date().getFullYear()} DeployX. Built for reliable deployments, remote operations, and fleet control.
            </p>
          </div>
          <p className="text-xs text-slate-500">Developed by Chetan, Nischay and Parth.</p>
        </div>
      </div>
    </footer>
  )
}

/* ─── Page ──────────────────────────────────────────────────────────────────── */

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 overflow-x-hidden">
      <Navbar />
      <Hero />
      <FeaturesCarousel />
      <WhyDeployX />
      <Contact />
      <Footer />
    </div>
  )
}
