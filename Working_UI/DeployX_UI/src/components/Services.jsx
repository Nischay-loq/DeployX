import { LayoutGrid, Users2, Activity, Boxes, Laptop2, Shield, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

const services = [
  {
    icon: LayoutGrid,
    title: "Device Management",
    subtitle: "Centralized Control Platform",
    desc: "Comprehensive device control and monitoring system with real-time insights across all your network infrastructure.",
    color: "blue",
    features: [
      "Real-time device status monitoring",
      "Automated device discovery & onboarding",
      "Cross-platform compatibility support", 
      "Advanced device grouping & filtering"
    ]
  },
  {
    icon: Users2,
    title: "User Management",
    subtitle: "Enterprise Access Control",
    desc: "Advanced role-based access control system with multi-factor authentication and comprehensive user management.",
    color: "purple",
    features: [
      "Multi-factor authentication support",
      "Granular permission management",
      "Active Directory integration",
      "Session management & audit logs"
    ]
  },
  {
    icon: Activity,
    title: "System Monitoring",
    subtitle: "Real-Time Analytics",
    desc: "Comprehensive monitoring and performance analytics platform for all connected devices with predictive insights.",
    color: "emerald",
    features: [
      "Live performance metrics dashboard",
      "Customizable alert & notification system",
      "Historical data analysis & reporting",
      "Predictive maintenance insights"
    ]
  },
  {
    icon: Boxes,
    title: "Package Deployment",
    subtitle: "Automated Distribution",
    desc: "Advanced software deployment and package management system with batch processing and rollback capabilities.",
    color: "orange",
    features: [
      "Batch deployment across multiple devices",
      "Rollback capabilities for failed deployments",
      "Scheduled deployment automation",
      "Version control & dependency management"
    ]
  },
  {
    icon: Laptop2,
    title: "Remote Control",
    subtitle: "Secure Access Gateway",
    desc: "Enterprise-grade remote access and control platform with end-to-end encryption and cross-platform support.",
    color: "cyan",
    features: [
      "End-to-end encrypted connections",
      "Cross-platform remote desktop access",
      "File transfer & synchronization",
      "Remote command execution & scripting"
    ]
  },
  {
    icon: Shield,
    title: "Security Center",
    subtitle: "Zero-Trust Architecture",
    desc: "Advanced security platform with military-grade encryption, compliance monitoring, and threat detection capabilities.",
    color: "pink",
    features: [
      "Zero-trust security architecture",
      "Compliance reporting & audit trails",
      "Threat detection & prevention",
      "Data encryption at rest & in transit"
    ]
  }
]

const colorMap = {
  blue: 'from-blue-500 to-blue-600',
  green: 'from-green-500 to-green-600',
  red: 'from-red-500 to-red-600',
  purple: 'from-purple-500 to-purple-600',
  yellow: 'from-yellow-500 to-yellow-600',
  emerald: 'from-emerald-500 to-emerald-600',
  orange: 'from-orange-500 to-orange-600',
  cyan: 'from-cyan-500 to-cyan-600',
  indigo: 'from-indigo-500 to-indigo-600',
  pink: 'from-pink-500 to-pink-600'
}

export default function Services() {
  const [currentIndex, setCurrentIndex] = useState(0)

  // Auto-advance slides
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % services.length)
    }, 5000)
    
    return () => clearInterval(interval)
  }, [])

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % services.length)
  }

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + services.length) % services.length)
  }

  return (
    <section id="services" className="py-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500/20 border border-primary-500/30 rounded-full text-primary-400 text-sm font-medium mb-6">
            <div className="w-2 h-2 bg-primary-400 rounded-full animate-pulse"></div>
            Our Services
          </div>
          <h2 className="text-4xl md:text-5xl font-bold font-display text-white mb-6">
            Complete <span className="bg-gradient-to-r from-primary-400 to-accent-cyan bg-clip-text text-transparent">Infrastructure Management</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Comprehensive solutions for modern deployment and device management needs
          </p>
        </motion.div>

        {/* Single Card Carousel */}
        <div className="relative max-w-4xl mx-auto">
          {/* Carousel Container */}
          <div className="overflow-hidden rounded-2xl">
            <motion.div
              className="flex"
              animate={{
                x: `-${currentIndex * 100}%`
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30
              }}
            >
              {services.map(({icon: Icon, title, subtitle, desc, color, features}, i) => (
                <motion.div
                  key={i}
                  className="w-full flex-shrink-0 group"
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="card-dark hover-lift border-glow relative overflow-hidden p-8 md:p-10">
                    {/* Main Content Layout */}
                    <div className="flex flex-col md:flex-row items-center gap-8">
                      
                      {/* Left Side - Icon and Title */}
                      <div className="flex-shrink-0 text-center md:text-left">
                        <motion.div 
                          className={`inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r ${colorMap[color]} rounded-3xl mb-6 shadow-2xl group-hover:scale-110 transition-all duration-300`}
                          whileHover={{ rotate: 5 }}
                        >
                          <Icon className="w-12 h-12 text-white" />
                        </motion.div>
                        
                        <div className="mb-6">
                          <h3 className="text-3xl md:text-4xl font-bold text-white group-hover:text-primary-400 transition-colors mb-2 leading-tight">
                            {title}
                          </h3>
                          <p className="text-sm text-gray-400 font-medium uppercase tracking-wider">{subtitle}</p>
                        </div>
                      </div>

                      {/* Right Side - Content */}
                      <div className="flex-1 space-y-6">
                        {/* Description */}
                        <div>
                          <p className="text-gray-300 text-lg leading-relaxed">
                            {desc}
                          </p>
                        </div>

                        {/* Features Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {features.map((feature, idx) => (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, x: 20 }}
                              whileInView={{ opacity: 1, x: 0 }}
                              viewport={{ once: true }}
                              transition={{ duration: 0.4, delay: idx * 0.1 }}
                              className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50 hover:border-gray-600/50 transition-colors"
                            >
                              <div className={`w-3 h-3 bg-gradient-to-r ${colorMap[color]} rounded-full flex-shrink-0`}></div>
                              <span className="text-gray-300 font-medium">{feature}</span>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary-500/10 to-transparent rounded-bl-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-accent-cyan/10 to-transparent rounded-tr-3xl"></div>
                    
                    {/* Hover Gradient Overlay */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${colorMap[color]} opacity-0 group-hover:opacity-5 transition-opacity duration-300 rounded-xl pointer-events-none`}></div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-center gap-8 mt-10">
            <button
              onClick={prevSlide}
              className="w-14 h-14 bg-gray-800/80 hover:bg-gray-700/80 border border-gray-600/30 rounded-full flex items-center justify-center transition-all duration-300 hover:border-primary-400/70 hover:scale-110 backdrop-blur-sm hover:shadow-[0_0_20px_rgba(99,102,241,0.4)]"
            >
              <ChevronLeft className="w-6 h-6 text-gray-300 hover:text-primary-400 transition-colors" />
            </button>

            {/* Progress Indicators */}
            <div className="flex items-center gap-3">
              {services.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`transition-all duration-300 ${
                    idx === currentIndex 
                      ? 'w-8 h-3 bg-primary-400 rounded-full' 
                      : 'w-3 h-3 bg-gray-600 hover:bg-gray-500 rounded-full'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={nextSlide}
              className="w-14 h-14 bg-gray-800/80 hover:bg-gray-700/80 border border-gray-600/30 rounded-full flex items-center justify-center transition-all duration-300 hover:border-primary-400/70 hover:scale-110 backdrop-blur-sm hover:shadow-[0_0_20px_rgba(99,102,241,0.4)]"
            >
              <ChevronRight className="w-6 h-6 text-gray-300 hover:text-primary-400 transition-colors" />
            </button>
          </div>

          {/* Current Service Info */}
          <div className="text-center mt-8 space-y-2">
            <div className="flex items-center justify-center gap-2">
              <span className="text-primary-400 font-semibold">
                {String(currentIndex + 1).padStart(2, '0')}
              </span>
              <span className="text-gray-500">/</span>
              <span className="text-gray-400">
                {String(services.length).padStart(2, '0')}
              </span>
            </div>
            <p className="text-gray-500 text-sm">
              {services[currentIndex]?.title} - {services[currentIndex]?.subtitle}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}