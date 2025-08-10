'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Zap, Activity, Bot, Rocket, Settings, Shield, Network, Clock, Star, MapPin, Mail, Github, Twitter, Linkedin, ArrowRight, Play, Bell, Monitor, Users, Smartphone, RotateCcw, ChevronLeft, ChevronRight, X, Eye, EyeOff, Check, AlertCircle } from 'lucide-react'

export default function Component() {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('login')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [currentServiceSlide, setCurrentServiceSlide] = useState(0)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
    rememberMe: false
  })
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [registeredUsers, setRegisteredUsers] = useState([])
  const heroRef = useRef(null)

  // Load registered users from localStorage on component mount
  useEffect(() => {
    const savedUsers = localStorage.getItem('deployxUsers')
    if (savedUsers) {
      setRegisteredUsers(JSON.parse(savedUsers))
    }
  }, [])

  const features = [
    {
      icon: Zap,
      title: "Install Anywhere",
      description: "Instantly deploy across systems with quantum precision",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: Activity,
      title: "Real-time Logs",
      description: "Watch every install as it happens in real-time",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: Bot,
      title: "Auto-Agent",
      description: "AI-powered deployment intelligence that learns",
      color: "from-cyan-500 to-blue-500"
    }
  ]

  const services = [
    {
      icon: Monitor,
      title: "Centralized Web Dashboard",
      description: "Comprehensive web-based control panel for managing all your deployment operations from a single interface.",
      features: ["Real-time Analytics", "Custom Widgets", "Multi-tenant Support"]
    },
    {
      icon: Users,
      title: "Multi-User Role System",
      subtitle: "RBAC",
      description: "Advanced role-based access control system with granular permissions and user management capabilities.",
      features: ["Custom Roles", "Permission Matrix", "Audit Logging"]
    },
    {
      icon: Activity,
      title: "Real-Time Monitoring",
      description: "Live monitoring of all systems with instant alerts, performance metrics, and health status tracking.",
      features: ["Live Metrics", "Custom Alerts", "Performance Graphs"]
    },
    {
      icon: Network,
      title: "Agent Group Management",
      description: "Organize and manage deployment agents in logical groups with batch operations and policy enforcement.",
      features: ["Group Policies", "Batch Operations", "Hierarchical Structure"]
    },
    {
      icon: Smartphone,
      title: "Cross-Platform Support",
      description: "Deploy across Windows, Linux, macOS, and mobile platforms with unified management and monitoring.",
      features: ["Windows/Linux/macOS", "Mobile Support", "Container Ready"]
    }
  ]

  const testimonials = [
    { name: "Alex Chen", role: "DevOps Lead", rating: 5, text: "DeployX revolutionized our deployment process. Absolutely incredible!" },
    { name: "Sarah Kim", role: "IT Director", rating: 5, text: "The AI-powered features are mind-blowing. Best investment we've made." },
    { name: "Marcus Rodriguez", role: "System Admin", rating: 5, text: "Lightning fast deployments across our entire infrastructure." }
  ]

  const nextSlide = () => {
    setCurrentServiceSlide((prev) => (prev + 1) % services.length)
  }

  const prevSlide = () => {
    setCurrentServiceSlide((prev) => (prev - 1 + services.length) % services.length)
  }

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const openModal = (type) => {
    setModalType(type)
    setShowModal(true)
    setMessage({ type: '', text: '' })
  }

  const closeModal = () => {
    setShowModal(false)
    setFormData({
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      agreeToTerms: false,
      rememberMe: false
    })
    setMessage({ type: '', text: '' })
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const validateForm = () => {
    if (modalType === 'signup') {
      if (!formData.fullName.trim()) {
        setMessage({ type: 'error', text: 'Full name is required' })
        return false
      }
      if (formData.password !== formData.confirmPassword) {
        setMessage({ type: 'error', text: 'Passwords do not match' })
        return false
      }
      if (!formData.agreeToTerms) {
        setMessage({ type: 'error', text: 'Please agree to terms and conditions' })
        return false
      }
      // Check if user already exists
      const userExists = registeredUsers.some(user => user.email.toLowerCase() === formData.email.toLowerCase())
      if (userExists) {
        setMessage({ type: 'error', text: 'An account with this email already exists. Please login instead.' })
        return false
      }
    }
    
    if (modalType === 'login') {
      // Check if user exists in registered users
      const userExists = registeredUsers.some(user => user.email.toLowerCase() === formData.email.toLowerCase())
      if (!userExists) {
        setMessage({ type: 'error', text: 'No account found with this email. Please create an account first.' })
        return false
      }
      
      // Validate password for existing user
      const user = registeredUsers.find(user => user.email.toLowerCase() === formData.email.toLowerCase())
      if (user && user.password !== formData.password) {
        setMessage({ type: 'error', text: 'Invalid password. Please try again.' })
        return false
      }
    }
    
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setMessage({ type: 'error', text: 'Valid email is required' })
      return false
    }
    
    if (modalType !== 'forgot' && formData.password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' })
      return false
    }
    
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setIsLoading(true)
    setMessage({ type: '', text: '' })
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      if (modalType === 'forgot') {
        // Simulate sending reset email
        setMessage({ 
          type: 'success', 
          text: `Password reset link sent to ${formData.email}. Check your inbox!` 
        })
      } else if (modalType === 'signup') {
        // Register new user
        const newUser = {
          id: Date.now(),
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
          createdAt: new Date().toISOString()
        }
        
        const updatedUsers = [...registeredUsers, newUser]
        setRegisteredUsers(updatedUsers)
        localStorage.setItem('deployxUsers', JSON.stringify(updatedUsers))
        
        setMessage({ 
          type: 'success', 
          text: 'Account created successfully! Redirecting to login...' 
        })
        
        setTimeout(() => {
          setModalType('login')
          setFormData({
            fullName: '',
            email: formData.email, // Keep email for convenience
            password: '',
            confirmPassword: '',
            agreeToTerms: false,
            rememberMe: false
          })
          setMessage({ type: 'info', text: 'Please enter your credentials to sign in.' })
        }, 2000)
      } else if (modalType === 'login') {
        // Login user
        const user = registeredUsers.find(user => user.email.toLowerCase() === formData.email.toLowerCase())
        
        if (user) {
          // Store user session
          localStorage.setItem('deployxCurrentUser', JSON.stringify({
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            loginTime: new Date().toISOString()
          }))
          
          setMessage({ 
            type: 'success', 
            text: 'Login successful! Redirecting to dashboard...' 
          })
          
          setTimeout(() => {
            closeModal()
            router.push('/dashboard')
          }, 2000)
        }
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Something went wrong. Please try again.' 
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        {/* Space Grid */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 75% 75%, rgba(147, 51, 234, 0.1) 0%, transparent 50%),
              linear-gradient(rgba(34, 211, 238, 0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(34, 211, 238, 0.05) 1px, transparent 1px)
            `,
            backgroundSize: '400px 400px, 400px 400px, 40px 40px, 40px 40px'
          }}></div>
        </div>

        {/* Nebula Effects */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
        </div>

        {/* Natural Floating Particles */}
        <div className="absolute inset-0">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-cyan-400 rounded-full animate-natural-float opacity-60"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 10}s`,
                animationDuration: `${8 + Math.random() * 12}s`
              }}
            ></div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md mx-4">
            {/* Close Button */}
            <button
              onClick={closeModal}
              className="absolute -top-4 -right-4 z-10 w-8 h-8 bg-red-500/20 hover:bg-red-500/40 rounded-full flex items-center justify-center border border-red-400/50 transition-all duration-300"
            >
              <X className="w-4 h-4 text-red-400" />
            </button>

            {/* Modal Container */}
            <div className="relative bg-black/60 backdrop-blur-xl rounded-2xl border border-cyan-400/30 p-8 overflow-hidden">
              {/* Circuit Background */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{
                  backgroundImage: `
                    linear-gradient(rgba(34, 211, 238, 0.3) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(34, 211, 238, 0.3) 1px, transparent 1px)
                  `,
                  backgroundSize: '20px 20px'
                }}></div>
              </div>

              {/* Animated Border */}
              <div className="absolute inset-0 rounded-2xl">
                <div className="absolute inset-0 rounded-2xl border-2 border-transparent bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 bg-clip-border animate-border-trace opacity-50"></div>
              </div>

              {/* Holographic Effects */}
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-2 h-2 bg-cyan-400/30 rounded-full animate-pulse"
                    style={{
                      left: `${20 + Math.random() * 60}%`,
                      top: `${20 + Math.random() * 60}%`,
                      animationDelay: `${i * 0.5}s`,
                      animationDuration: `${2 + Math.random() * 2}s`
                    }}
                  ></div>
                ))}
              </div>

              {/* Content */}
              <div className="relative z-10">
                {/* Logo */}
                <div className="text-center mb-8">
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent animate-pulse mb-2">
                    DeployX
                  </h1>
                  <p className="text-gray-400 text-sm">
                    {modalType === 'signup' && 'Join the future of deployment'}
                    {modalType === 'login' && 'Access your command center'}
                    {modalType === 'forgot' && 'Reset your access credentials'}
                  </p>
                </div>

                {/* Message Display */}
                {message.text && (
                  <div className={`mb-6 p-4 rounded-lg border animate-slide-in ${
                    message.type === 'success' 
                      ? 'bg-green-500/10 border-green-400/50 text-green-400' 
                      : message.type === 'info'
                      ? 'bg-blue-500/10 border-blue-400/50 text-blue-400'
                      : 'bg-red-500/10 border-red-400/50 text-red-400'
                  } flex items-center space-x-2`}>
                    {message.type === 'success' ? (
                      <Check className="w-5 h-5" />
                    ) : message.type === 'info' ? (
                      <AlertCircle className="w-5 h-5" />
                    ) : (
                      <AlertCircle className="w-5 h-5" />
                    )}
                    <span className="text-sm">{message.text}</span>
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  {modalType === 'signup' && (
                    <div className="relative group">
                      <Input
                        type="text"
                        placeholder="Full Name"
                        value={formData.fullName}
                        onChange={(e) => handleInputChange('fullName', e.target.value)}
                        className="w-full bg-black/50 border-gray-600 text-white placeholder-gray-400 focus:border-cyan-400 focus:ring-cyan-400/50 transition-all duration-300 group-hover:border-cyan-400/50"
                        disabled={isLoading}
                      />
                      <div className="absolute inset-0 rounded-md border border-transparent bg-gradient-to-r from-cyan-500/0 via-cyan-500/50 to-cyan-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                    </div>
                  )}

                  <div className="relative group">
                    <Input
                      type="email"
                      placeholder="Email Address"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full bg-black/50 border-gray-600 text-white placeholder-gray-400 focus:border-cyan-400 focus:ring-cyan-400/50 transition-all duration-300 group-hover:border-cyan-400/50"
                      disabled={isLoading}
                    />
                    <div className="absolute inset-0 rounded-md border border-transparent bg-gradient-to-r from-cyan-500/0 via-cyan-500/50 to-cyan-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                  </div>

                  {modalType !== 'forgot' && (
                    <div className="relative group">
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Password"
                          value={formData.password}
                          onChange={(e) => handleInputChange('password', e.target.value)}
                          className="w-full bg-black/50 border-gray-600 text-white placeholder-gray-400 focus:border-cyan-400 focus:ring-cyan-400/50 transition-all duration-300 group-hover:border-cyan-400/50 pr-12"
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-cyan-400 transition-colors duration-300"
                          disabled={isLoading}
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      <div className="absolute inset-0 rounded-md border border-transparent bg-gradient-to-r from-cyan-500/0 via-cyan-500/50 to-cyan-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                    </div>
                  )}

                  {modalType === 'signup' && (
                    <div className="relative group">
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm Password"
                          value={formData.confirmPassword}
                          onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                          className="w-full bg-black/50 border-gray-600 text-white placeholder-gray-400 focus:border-cyan-400 focus:ring-cyan-400/50 transition-all duration-300 group-hover:border-cyan-400/50 pr-12"
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-cyan-400 transition-colors duration-300"
                          disabled={isLoading}
                        >
                          {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      <div className="absolute inset-0 rounded-md border border-transparent bg-gradient-to-r from-cyan-500/0 via-cyan-500/50 to-cyan-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                    </div>
                  )}

                  {/* Checkboxes for Sign Up */}
                  {modalType === 'signup' && (
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <Checkbox
                            id="terms"
                            checked={formData.agreeToTerms}
                            onCheckedChange={(checked) => handleInputChange('agreeToTerms', checked)}
                            className="border-cyan-400/50 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
                            disabled={isLoading}
                          />
                          <div className="absolute inset-0 rounded border border-cyan-400/30 animate-pulse opacity-50"></div>
                        </div>
                        <label htmlFor="terms" className="text-sm text-gray-300 cursor-pointer">
                          I agree to the{' '}
                          <span className="text-cyan-400 hover:text-cyan-300 underline">
                            Terms and Conditions
                          </span>
                        </label>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <Checkbox
                            id="remember"
                            checked={formData.rememberMe}
                            onCheckedChange={(checked) => handleInputChange('rememberMe', checked)}
                            className="border-purple-400/50 data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
                            disabled={isLoading}
                          />
                          <div className="absolute inset-0 rounded border border-purple-400/30 animate-pulse opacity-50"></div>
                        </div>
                        <label htmlFor="remember" className="text-sm text-gray-300 cursor-pointer">
                          Remember Me
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Remember Me for Login */}
                  {modalType === 'login' && (
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <Checkbox
                          id="remember-login"
                          checked={formData.rememberMe}
                          onCheckedChange={(checked) => handleInputChange('rememberMe', checked)}
                          className="border-purple-400/50 data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
                          disabled={isLoading}
                        />
                        <div className="absolute inset-0 rounded border border-purple-400/30 animate-pulse opacity-50"></div>
                      </div>
                      <label htmlFor="remember-login" className="text-sm text-gray-300 cursor-pointer">
                        Remember Me
                      </label>
                    </div>
                  )}

                  {/* Submit Button */}
                  <Button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-500 hover:via-blue-500 hover:to-purple-500 text-white py-3 rounded-full border border-cyan-400/50 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/50 transition-all duration-300 relative overflow-hidden group disabled:opacity-50"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-purple-400/20 animate-pulse"></div>
                    <span className="relative flex items-center justify-center">
                      {isLoading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                      ) : null}
                      {modalType === 'signup' && 'Create Account'}
                      {modalType === 'login' && 'Sign In'}
                      {modalType === 'forgot' && 'Send Reset Link'}
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                  </Button>
                </form>

                {/* Links */}
                <div className="mt-6 text-center space-y-4">
                  {modalType === 'login' && (
                    <button
                      onClick={() => openModal('forgot')}
                      className="text-cyan-400 hover:text-cyan-300 text-sm transition-colors duration-300"
                      disabled={isLoading}
                    >
                      Forgot Password?
                    </button>
                  )}
                  
                  {modalType !== 'forgot' && (
                    <div className="text-gray-400 text-sm">
                      {modalType === 'signup' ? 'Already have an account?' : "Don't have an account?"}
                      <button
                        onClick={() => {
                          const newType = modalType === 'signup' ? 'login' : 'signup'
                          setModalType(newType)
                          setMessage({ type: '', text: '' })
                          setFormData({
                            fullName: '',
                            email: '',
                            password: '',
                            confirmPassword: '',
                            agreeToTerms: false,
                            rememberMe: false
                          })
                        }}
                        className="text-cyan-400 hover:text-cyan-300 ml-2 transition-colors duration-300"
                        disabled={isLoading}
                      >
                        {modalType === 'signup' ? 'Sign In' : 'Sign Up'}
                      </button>
                    </div>
                  )}

                  {modalType === 'forgot' && (
                    <div className="text-gray-400 text-sm">
                      Remember your password?
                      <button
                        onClick={() => openModal('login')}
                        className="text-cyan-400 hover:text-cyan-300 ml-2 transition-colors duration-300"
                        disabled={isLoading}
                      >
                        Back to Login
                      </button>
                    </div>
                  )}
                </div>

                {/* Security Badge */}
                <div className="mt-6 text-center">
                  <div className="inline-flex items-center space-x-2 text-xs text-gray-500">
                    <Shield className="w-4 h-4 text-green-400" />
                    <span>Secured by TLS 1.3 Encryption</span>
                  </div>
                </div>

                {/* Debug Info (Remove in production) */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="mt-4 p-3 bg-gray-800/50 rounded-lg text-xs text-gray-400">
                    <div>Registered Users: {registeredUsers.length}</div>
                    {registeredUsers.length > 0 && (
                      <div className="mt-1">
                        Latest: {registeredUsers[registeredUsers.length - 1]?.email}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="relative z-50 px-6 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent animate-pulse">
            DeployX
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            {[
              { name: 'Home', id: 'home' },
              { name: 'Features', id: 'features' },
              { name: 'Services', id: 'services' },
              { name: 'Reviews', id: 'reviews' },
              { name: 'Contact', id: 'contact' }
            ].map((item) => (
              <button
                key={item.name}
                onClick={() => scrollToSection(item.id)}
                className="relative group cursor-pointer"
              >
                <span className="hover:text-cyan-400 transition-all duration-300">{item.name}</span>
                <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-cyan-400 to-blue-400 group-hover:w-full transition-all duration-300"></div>
              </button>
            ))}
          </div>
          
          <Button 
            onClick={() => openModal('login')}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 border border-cyan-400/50 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/50 transition-all duration-300"
          >
            Login
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" ref={heroRef} className="relative z-40 px-6 py-20 min-h-screen flex items-center">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Hero Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-7xl md:text-8xl font-bold leading-tight">
                <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent animate-pulse">
                  Command.
                </span>
                <br />
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-pulse" style={{ animationDelay: '0.5s' }}>
                  Connect.
                </span>
                <br />
                <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent animate-pulse" style={{ animationDelay: '1s' }}>
                  Deploy.
                </span>
              </h1>
              <p className="text-2xl text-gray-300 max-w-2xl">
                Your intelligent bulk software deployment system powered by quantum AI
              </p>
            </div>
            
            <Button 
              onClick={() => openModal('signup')}
              className="group relative bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-500 hover:via-blue-500 hover:to-purple-500 text-white px-12 py-6 text-xl rounded-full border border-cyan-400/50 shadow-2xl shadow-cyan-500/25 hover:shadow-cyan-500/50 transition-all duration-500 hover:scale-105 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-purple-400/20 animate-pulse"></div>
              <span className="relative flex items-center">
                Get Started
                <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-2 transition-transform duration-300" />
              </span>
            </Button>
          </div>

          {/* Futuristic Server Hub Scene */}
          <div className="relative w-full h-[600px] flex items-center justify-center">
            {/* Professional Circuit Background */}
            <div className="absolute inset-0 overflow-hidden">
              <svg className="absolute inset-0 w-full h-full opacity-15" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="professionalCircuitPattern" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
                    <path d="M15,15 L105,15 L105,60 L60,60 L60,105 L15,105 Z" 
                          fill="none" 
                          stroke="#00A8FF" 
                          strokeWidth="1"
                          opacity="0.4"/>
                    <circle cx="15" cy="15" r="2" fill="#00FFF7" opacity="0.6"/>
                    <circle cx="105" cy="60" r="2" fill="#00A8FF" opacity="0.6"/>
                    <circle cx="60" cy="105" r="2" fill="#00FFF7" opacity="0.6"/>
                  </pattern>
                  <linearGradient id="professionalCircuitGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00A8FF" stopOpacity="0.8"/>
                    <stop offset="50%" stopColor="#00FFF7" stopOpacity="0.6"/>
                    <stop offset="100%" stopColor="#001F3F" stopOpacity="0.4"/>
                  </linearGradient>
                </defs>
                <rect width="100%" height="100%" fill="url(#professionalCircuitPattern)">
                  <animateTransform
                    attributeName="transform"
                    type="translate"
                    values="0,0; 60,30; 0,0"
                    dur="25s"
                    repeatCount="indefinite"
                  />
                </rect>
              </svg>
            </div>

            {/* Professional Digital Particle Effects */}
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(20)].map((_, i) => (
                <div
                  key={`pro-particle-${i}`}
                  className="absolute w-1 h-1 rounded-full animate-professional-float opacity-50"
                  style={{
                    backgroundColor: i % 3 === 0 ? '#00A8FF' : i % 3 === 1 ? '#00FFF7' : '#2E2E2E',
                    left: `${15 + Math.random() * 70}%`,
                    top: `${15 + Math.random() * 70}%`,
                    animationDelay: `${Math.random() * 10}s`,
                    animationDuration: `${8 + Math.random() * 10}s`
                  }}
                />
              ))}
            </div>

            {/* Professional Electric Sparks */}
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(6)].map((_, i) => (
                <div
                  key={`pro-spark-${i}`}
                  className="absolute w-2 h-2 rounded-full animate-ping opacity-30"
                  style={{
                    backgroundColor: '#00FFF7',
                    left: `${25 + Math.random() * 50}%`,
                    top: `${25 + Math.random() * 50}%`,
                    animationDelay: `${i * 2}s`,
                    animationDuration: `${3 + Math.random() * 2}s`
                  }}
                />
              ))}
            </div>

            {/* Central Professional Server Hub */}
            <div className="relative z-20">
              <div className="relative w-32 h-32 professional-server-hub animate-professional-server-pulse">
                {/* Server Core */}
                <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 shadow-2xl border border-blue-400/30">
                  <div className="absolute inset-2 rounded-md bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center animate-spin-slow"
                         style={{ background: 'linear-gradient(45deg, #00A8FF, #00FFF7)' }}>
                      <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                        <div className="w-4 h-4 rounded-full animate-pulse" style={{ backgroundColor: '#00A8FF' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Professional Server Glow Rings */}
                <div className="absolute -inset-4 rounded-xl border-2 animate-pulse" style={{ borderColor: '#00A8FF80' }}></div>
                <div className="absolute -inset-8 rounded-2xl border animate-ping" style={{ borderColor: '#00FFF750' }}></div>
                <div className="absolute -inset-12 rounded-3xl border animate-pulse" 
                     style={{ borderColor: '#001F3F40', animationDelay: '1s' }}></div>
                
                {/* Professional Status Indicators */}
                <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full animate-pulse shadow-lg"
                     style={{ backgroundColor: '#00FFF7', boxShadow: '0 0 10px #00FFF7' }}></div>
                <div className="absolute -bottom-2 -left-2 w-3 h-3 rounded-full animate-ping"
                     style={{ backgroundColor: '#00A8FF' }}></div>
              </div>
            </div>

            {/* Professional Surrounding Laptops in Circular Array */}
            {[...Array(6)].map((_, i) => {
              const angle = (i * 60) * (Math.PI / 180)
              const radius = 220
              const x = Math.cos(angle) * radius
              const y = Math.sin(angle) * radius
              
              return (
                <div
                  key={`pro-laptop-${i}`}
                  className="absolute z-10"
                  style={{
                    left: `calc(50% + ${x}px - 40px)`,
                    top: `calc(50% + ${y}px - 30px)`,
                  }}
                >
                  {/* Professional Laptop Device */}
                  <div className="relative w-20 h-16 rounded-lg border shadow-lg professional-laptop"
                       style={{ 
                         background: 'linear-gradient(135deg, #2E2E2E, #1a1a1a)',
                         borderColor: '#00A8FF50'
                       }}>
                    {/* Professional Laptop Screen */}
                    <div className="absolute inset-1 rounded-md overflow-hidden professional-laptop-screen"
                         style={{ backgroundColor: '#2E2E2E' }}>
                      {/* Professional Screen Glow */}
                      <div className="absolute inset-0 animate-pulse"
                           style={{ background: 'linear-gradient(135deg, #00A8FF10, #00FFF710)' }}></div>
                      
                      {/* Professional Terminal Interface */}
                      <div className="relative z-10 p-1 text-[6px] font-mono leading-tight"
                           style={{ color: '#F5F5F5' }}>
                        <div className="professional-terminal-animation" style={{ animationDelay: `${i * 0.8}s` }}>
                          <div className="professional-terminal-line">$ deployx connect</div>
                          <div className="professional-terminal-line" style={{ animationDelay: `${i * 0.8 + 0.6}s` }}>
                            &gt; Establishing secure link...
                          </div>
                          <div className="professional-terminal-line" style={{ animationDelay: `${i * 0.8 + 1.2}s` }}>
                            &gt; Status: CONNECTED
                          </div>
                          <div className="professional-terminal-line" style={{ animationDelay: `${i * 0.8 + 1.8}s` }}>
                            &gt; Ready for deployment █
                          </div>
                        </div>
                      </div>
                      
                      {/* Professional Screen Scan Effect */}
                      <div className="absolute inset-0 h-1 animate-professional-screen-scan"
                           style={{ background: 'linear-gradient(to bottom, transparent, #00A8FF30, transparent)' }}></div>
                      
                      {/* Professional Screen Flicker */}
                      <div className="absolute inset-0 animate-professional-terminal-flicker"
                           style={{ backgroundColor: '#00A8FF05' }}></div>
                    </div>
                    
                    {/* Professional Activity Indicator */}
                    <div 
                      className="absolute -top-1 -right-1 w-2 h-2 rounded-full animate-pulse"
                      style={{ 
                        backgroundColor: '#00FFF7',
                        animationDelay: `${i * 0.4}s`,
                        boxShadow: '0 0 6px #00FFF7'
                      }}
                    ></div>
                  </div>
                </div>
              )
            })}

            {/* Professional Neon Circuit Connections */}
            <svg className="absolute inset-0 w-full h-full z-15" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="professionalConnectionGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00A8FF" stopOpacity="0.9"/>
                  <stop offset="50%" stopColor="#00FFF7" stopOpacity="0.7"/>
                  <stop offset="100%" stopColor="#00A8FF" stopOpacity="0.5"/>
                </linearGradient>
                <filter id="professionalNeonGlow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge> 
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              
              {[...Array(6)].map((_, i) => {
                const angle = (i * 60) * (Math.PI / 180)
                const radius = 220
                const x = Math.cos(angle) * radius
                const y = Math.sin(angle) * radius
                
                return (
                  <g key={`pro-connection-${i}`}>
                    {/* Professional Main Connection Wire */}
                    <line
                      x1="50%"
                      y1="50%"
                      x2={`calc(50% + ${x}px)`}
                      y2={`calc(50% + ${y}px)`}
                      stroke="url(#professionalConnectionGlow)"
                      strokeWidth="2"
                      filter="url(#professionalNeonGlow)"
                      className="animate-professional-wire-glow"
                      style={{ animationDelay: `${i * 0.3}s` }}
                    />
                    
                    {/* Professional Data Pulse Animation */}
                    <line
                      x1="50%"
                      y1="50%"
                      x2={`calc(50% + ${x}px)`}
                      y2={`calc(50% + ${y}px)`}
                      stroke="#00FFF7"
                      strokeWidth="3"
                      strokeDasharray="25,15"
                      className="animate-professional-electric-arc"
                      filter="url(#professionalNeonGlow)"
                      style={{ animationDelay: `${i * 0.5}s` }}
                    />
                    
                    {/* Professional Traveling Data Packets */}
                    <circle
                      r="3"
                      fill="#00FFF7"
                      filter="url(#professionalNeonGlow)"
                    >
                      <animateMotion
                        dur={`${4 + Math.random() * 2}s`}
                        repeatCount="indefinite"
                        begin={`${i * 0.7}s`}
                      >
                        <mpath>
                          <path d={`M 50% 50% L calc(50% + ${x}px) calc(50% + ${y}px)`} />
                        </mpath>
                      </animateMotion>
                      <animate
                        attributeName="r"
                        values="3;7;3"
                        dur="1.2s"
                        repeatCount="indefinite"
                      />
                    </circle>
                    
                    {/* Professional Connection Nodes */}
                    <circle
                      cx={`calc(50% + ${x * 0.3}px)`}
                      cy={`calc(50% + ${y * 0.3}px)`}
                      r="2"
                      fill="#00A8FF"
                      opacity="0.8"
                      className="animate-pulse"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                    <circle
                      cx={`calc(50% + ${x * 0.7}px)`}
                      cy={`calc(50% + ${y * 0.7}px)`}
                      r="2"
                      fill="#00FFF7"
                      opacity="0.8"
                      className="animate-pulse"
                      style={{ animationDelay: `${i * 0.2}s` }}
                    />
                    
                    {/* Professional Particle Sparks */}
                    <circle
                      cx={`calc(50% + ${x * 0.5}px)`}
                      cy={`calc(50% + ${y * 0.5}px)`}
                      r="1"
                      fill="#00FFF7"
                      className="animate-ping"
                      style={{ animationDelay: `${i * 0.8}s` }}
                    />
                  </g>
                )
              })}
              
              {/* Professional Central Hub Pulse Rings */}
              <circle
                cx="50%"
                cy="50%"
                r="80"
                fill="none"
                stroke="#00A8FF"
                strokeWidth="1"
                opacity="0.3"
                className="animate-professional-data-pulse"
              />
              <circle
                cx="50%"
                cy="50%"
                r="120"
                fill="none"
                stroke="#00FFF7"
                strokeWidth="1"
                opacity="0.2"
                className="animate-professional-data-pulse"
                style={{ animationDelay: '1.5s' }}
              />
              <circle
                cx="50%"
                cy="50%"
                r="160"
                fill="none"
                stroke="#001F3F"
                strokeWidth="1"
                opacity="0.1"
                className="animate-professional-data-pulse"
                style={{ animationDelay: '3s' }}
              />
            </svg>

            {/* Professional Ambient Energy Field */}
            <div className="absolute inset-0 animate-pulse pointer-events-none"
                 style={{ 
                   background: 'radial-gradient(circle, #00A8FF08 0%, #00FFF705 30%, transparent 70%)'
                 }}></div>
            
            {/* Professional System Status Display */}
            <div className="absolute bottom-4 left-4 rounded-lg p-3 border backdrop-blur-sm"
                 style={{ 
                   backgroundColor: '#2E2E2E90',
                   borderColor: '#00A8FF50'
                 }}>
              <div className="flex items-center space-x-2 text-xs" style={{ color: '#00A8FF' }}>
                <div className="w-2 h-2 rounded-full animate-pulse" 
                     style={{ backgroundColor: '#00FFF7' }}></div>
                <span>System Online</span>
              </div>
              <div className="text-xs mt-1" style={{ color: '#F5F5F5' }}>
                6 Nodes Active
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-40 px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-5xl font-bold text-center mb-16 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
            Advanced Security Features
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Shield,
                title: "Secure Communication",
                subtitle: "TLS 1.3",
                description: "End-to-end encrypted communication with the latest TLS 1.3 protocol ensuring maximum security.",
                color: "from-cyan-500 to-blue-500"
              },
              {
                icon: Zap,
                title: "Token-Based Authentication",
                subtitle: "JWT",
                description: "Secure JWT-based authentication system with role-based access control and session management.",
                color: "from-blue-500 to-purple-500"
              },
              {
                icon: RotateCcw,
                title: "Auto-Updating Agents",
                subtitle: "Self-Maintaining",
                description: "Intelligent agents that automatically update themselves with the latest security patches and features.",
                color: "from-purple-500 to-pink-500"
              },
              {
                icon: Activity,
                title: "Real-Time Command Execution",
                subtitle: "Instant Response",
                description: "Execute commands across your infrastructure in real-time with instant feedback and monitoring.",
                color: "from-pink-500 to-cyan-500"
              },
              {
                icon: Bell,
                title: "Alerting & Notification System",
                subtitle: "Smart Alerts",
                description: "Comprehensive alerting system with customizable notifications via email, SMS, and webhooks.",
                color: "from-cyan-500 to-purple-500"
              },
              {
                icon: Clock,
                title: "Task Scheduler",
                subtitle: "Automated Timing",
                description: "Advanced scheduling system with cron-like functionality and dependency management.",
                color: "from-purple-500 to-blue-500"
              }
            ].map((feature, index) => {
              const IconComponent = feature.icon
              return (
                <div 
                  key={index}
                  className="group relative bg-black/40 backdrop-blur-xl rounded-2xl p-8 text-center transition-all duration-500 hover:scale-105 overflow-hidden"
                >
                  {/* Hover Border Tracing Effect */}
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute inset-0 rounded-2xl border-2 border-transparent bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 bg-clip-border animate-border-trace"></div>
                    <div className="absolute inset-[2px] rounded-2xl bg-black/80"></div>
                  </div>
                  
                  {/* Static Border */}
                  <div className="absolute inset-0 rounded-2xl border border-white/10 group-hover:border-transparent transition-colors duration-500"></div>
                  
                  {/* Content */}
                  <div className="relative z-10">
                    <div className={`w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r ${feature.color} p-5 group-hover:animate-pulse shadow-lg`}>
                      <IconComponent className="w-full h-full text-white" />
                    </div>
                    
                    <h3 className="text-2xl font-bold mb-2 text-white group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:bg-clip-text transition-all duration-300"
                        style={{ backgroundImage: `linear-gradient(135deg, var(--tw-gradient-stops))` }}
                        className={`group-hover:${feature.color}`}>
                      {feature.title}
                    </h3>
                    
                    <p className="text-cyan-400 font-semibold mb-4 text-sm uppercase tracking-wider">
                      {feature.subtitle}
                    </p>
                    
                    <p className="text-gray-400 group-hover:text-gray-300 transition-colors duration-300 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                  
                  {/* Glow Effect */}
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${feature.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500 blur-xl`}></div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Enterprise Services Carousel */}
      <section id="services" className="relative z-40 px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-5xl font-bold text-center mb-16 bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Enterprise Services
          </h2>
          
          {/* Carousel Container */}
          <div className="relative">
            {/* Navigation Buttons */}
            <button
              onClick={prevSlide}
              className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 w-12 h-12 bg-black/60 backdrop-blur-xl border border-cyan-400/50 rounded-full flex items-center justify-center hover:bg-cyan-500/20 transition-all duration-300 hover:scale-110"
            >
              <ChevronLeft className="w-6 h-6 text-cyan-400" />
            </button>
            
            <button
              onClick={nextSlide}
              className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 w-12 h-12 bg-black/60 backdrop-blur-xl border border-cyan-400/50 rounded-full flex items-center justify-center hover:bg-cyan-500/20 transition-all duration-300 hover:scale-110"
            >
              <ChevronRight className="w-6 h-6 text-cyan-400" />
            </button>

            {/* Carousel Content */}
            <div className="overflow-hidden rounded-2xl">
              <div 
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${currentServiceSlide * 100}%)` }}
              >
                {services.map((service, index) => {
                  const ServiceIcon = service.icon
                  return (
                    <div key={index} className="w-full flex-shrink-0 px-4">
                      <div className="group relative bg-black/30 backdrop-blur-xl rounded-2xl p-12 transition-all duration-500 hover:scale-105 overflow-hidden max-w-4xl mx-auto">
                        {/* Hover Border Tracing Effect */}
                        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                          <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                              <linearGradient id={`service-gradient-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="rgb(59, 130, 246)" />
                                <stop offset="50%" stopColor="rgb(147, 51, 234)" />
                                <stop offset="100%" stopColor="rgb(34, 211, 238)" />
                              </linearGradient>
                            </defs>
                            <rect 
                              x="2" 
                              y="2" 
                              width="calc(100% - 4px)" 
                              height="calc(100% - 4px)" 
                              rx="14" 
                              fill="none" 
                              stroke={`url(#service-gradient-${index})`} 
                              strokeWidth="2"
                              strokeDasharray="800"
                              strokeDashoffset="800"
                              className="animate-border-draw"
                            />
                          </svg>
                        </div>
                        
                        {/* Static Border */}
                        <div className="absolute inset-0 rounded-2xl border border-white/10 group-hover:border-transparent transition-colors duration-500"></div>
                        
                        {/* Content */}
                        <div className="relative z-10 text-center">
                          <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 p-6 group-hover:animate-pulse shadow-lg">
                            <ServiceIcon className="w-full h-full text-white" />
                          </div>
                          
                          <h3 className="text-4xl font-bold mb-4 text-white group-hover:text-blue-400 transition-colors duration-300">
                            {service.title}
                          </h3>
                          
                          {service.subtitle && (
                            <p className="text-purple-400 font-semibold mb-6 text-lg uppercase tracking-wider">
                              {service.subtitle}
                            </p>
                          )}
                          
                          <p className="text-gray-400 group-hover:text-gray-300 transition-colors duration-300 leading-relaxed mb-8 text-lg max-w-2xl mx-auto">
                            {service.description}
                          </p>
                          
                          {/* Feature List */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {service.features.map((feature, featureIndex) => (
                              <div key={featureIndex} className="flex items-center justify-center space-x-3 bg-black/40 rounded-lg p-4 border border-cyan-400/20">
                                <div className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse"></div>
                                <span className="text-gray-300 font-medium">{feature}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {/* Subtle Glow Effect */}
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Carousel Indicators */}
            <div className="flex justify-center mt-8 space-x-2">
              {services.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentServiceSlide(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index === currentServiceSlide 
                      ? 'bg-cyan-400 shadow-lg shadow-cyan-400/50' 
                      : 'bg-gray-600 hover:bg-gray-500'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section id="reviews" className="relative z-40 px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-5xl font-bold text-center mb-16 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Customer Reviews
          </h2>
          
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-8 border border-cyan-400/30">
              <h3 className="text-2xl font-bold mb-4 text-cyan-400">Deployment Speed</h3>
              <div className="relative w-full h-4 bg-gray-800 rounded-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full animate-pulse" style={{ width: '98%' }}></div>
              </div>
              <p className="text-right mt-2 text-gray-300">98% Faster</p>
            </div>
            
            <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-8 border border-purple-400/30">
              <h3 className="text-2xl font-bold mb-4 text-purple-400">User Satisfaction</h3>
              <div className="relative w-full h-4 bg-gray-800 rounded-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-pulse" style={{ width: '99%' }}></div>
              </div>
              <p className="text-right mt-2 text-gray-300">99% Satisfied</p>
            </div>
          </div>
          
          {/* Testimonials */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card 
                key={index}
                className="group bg-black/40 backdrop-blur-xl border border-white/10 hover:border-cyan-400/50 rounded-2xl transition-all duration-500 hover:scale-105"
              >
                <CardContent className="p-8">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  
                  <p className="text-gray-300 mb-6 italic">"{testimonial.text}"</p>
                  
                  <div>
                    <p className="font-bold text-white">{testimonial.name}</p>
                    <p className="text-cyan-400">{testimonial.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="relative z-40 px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-5xl font-bold text-center mb-16 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Contact Us
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <Card className="bg-black/40 backdrop-blur-xl border border-cyan-400/30 rounded-2xl">
              <CardContent className="p-8">
                <form className="space-y-6">
                  <div>
                    <Input 
                      placeholder="Your Name" 
                      className="bg-black/50 border-cyan-400/50 text-white placeholder-gray-400 focus:border-cyan-400 focus:ring-cyan-400"
                    />
                  </div>
                  
                  <div>
                    <Input 
                      type="email" 
                      placeholder="Your Email" 
                      className="bg-black/50 border-cyan-400/50 text-white placeholder-gray-400 focus:border-cyan-400 focus:ring-cyan-400"
                    />
                  </div>
                  
                  <div>
                    <Textarea 
                      placeholder="Your Message" 
                      rows={5}
                      className="bg-black/50 border-cyan-400/50 text-white placeholder-gray-400 focus:border-cyan-400 focus:ring-cyan-400"
                    />
                  </div>
                  
                  <Button className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white py-3 rounded-full border border-cyan-400/50 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/50 transition-all duration-300">
                    Send Message
                  </Button>
                </form>
              </CardContent>
            </Card>
            
            {/* Contact Info */}
            <div className="space-y-8">
              <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-8 border border-purple-400/30">
                <div className="flex items-center space-x-4 mb-4">
                  <MapPin className="w-8 h-8 text-purple-400" />
                  <div>
                    <h3 className="text-xl font-bold text-white">Location</h3>
                    <p className="text-gray-400">San Francisco, CA</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-8 border border-blue-400/30">
                <div className="flex items-center space-x-4 mb-4">
                  <Mail className="w-8 h-8 text-blue-400" />
                  <div>
                    <h3 className="text-xl font-bold text-white">Email</h3>
                    <p className="text-gray-400">contact@deployx.ai</p>
                  </div>
                </div>
              </div>
              
              {/* Holographic Bot */}
              <div className="relative bg-black/40 backdrop-blur-xl rounded-2xl p-8 border border-cyan-400/30">
                <div className="text-center">
                  <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 p-6 animate-pulse">
                    <Bot className="w-full h-full text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">AI Assistant Ready</h3>
                  <p className="text-gray-400">Our AI is standing by to help</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-40 px-6 py-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between mb-8">
            <div className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent animate-pulse mb-4 md:mb-0">
              DeployX
            </div>
            
            <div className="flex items-center space-x-6">
              <a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors duration-300 hover:scale-110 transform">
                <Github className="w-6 h-6" />
              </a>
              <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors duration-300 hover:scale-110 transform">
                <Twitter className="w-6 h-6" />
              </a>
              <a href="#" className="text-gray-400 hover:text-purple-400 transition-colors duration-300 hover:scale-110 transform">
                <Linkedin className="w-6 h-6" />
              </a>
            </div>
          </div>
          
          <div className="text-center text-gray-500 border-t border-white/10 pt-8">
            <p>Built with ❤️ by Team DeployX &copy; 2024. Powered by Quantum AI.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
