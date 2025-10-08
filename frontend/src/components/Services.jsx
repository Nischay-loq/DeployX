import { LayoutGrid, Users2, Activity, Boxes, Laptop2, Shield, Zap, Globe, Database, Cpu, ChevronLeft, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

const services = [
  { 
    title: 'Centralized Dashboard', 
    subtitle: 'Unified Control Plane',
    icon: LayoutGrid, 
    desc: 'Comprehensive control center with real-time monitoring, audit trails, and performance analytics.',
    features: ['Real-time monitoring', 'Audit trails', 'Performance metrics', 'Custom dashboards'],
    color: 'blue'
  },
  { 
    title: 'Role-Based Access', 
    subtitle: 'Enterprise Security',
    icon: Users2, 
    desc: 'Granular permission system with SSO integration and least-privilege access controls.',
    features: ['RBAC system', 'SSO integration', 'Permission management', 'Compliance ready'],
    color: 'green'
  },
  { 
    title: 'Real-Time Monitoring', 
    subtitle: 'Live Infrastructure Insights',
    icon: Activity, 
    desc: 'Continuous health monitoring with live logs, metrics, and intelligent alerting.',
    features: ['Health monitoring', 'Live telemetry', 'Smart alerts', 'Historical data'],
    color: 'red'
  },
  { 
    title: 'Agent Management', 
    subtitle: 'Dynamic Group Orchestration',
    icon: Boxes, 
    desc: 'Dynamic grouping with intelligent targeting and progressive deployment strategies.',
    features: ['Dynamic grouping', 'Smart targeting', 'Staged rollouts', 'Blue-green deployments'],
    color: 'purple'
  },
  { 
    title: 'Cross-Platform', 
    subtitle: 'Universal Compatibility',
    icon: Laptop2, 
    desc: 'Native support for Windows, Linux, and macOS with unified API architecture.',
    features: ['Windows native', 'Linux support', 'macOS ready', 'Unified APIs'],
    color: 'yellow'
  },
  { 
    title: 'Advanced Security', 
    subtitle: 'Zero-Trust Architecture',
    icon: Shield, 
    desc: 'Military-grade encryption with comprehensive security protocols and compliance.',
    features: ['TLS 1.3 encryption', 'Zero-trust model', 'Compliance tools', 'Audit logging'],
    color: 'emerald'
  },
  { 
    title: 'High Performance', 
    subtitle: 'Optimized for Scale',
    icon: Zap, 
    desc: 'Lightning-fast execution with minimal resource consumption and elastic scaling.',
    features: ['Sub-second latency', 'Auto-scaling', 'Resource optimization', 'Load balancing'],
    color: 'orange'
  },
  { 
    title: 'Global Distribution', 
    subtitle: 'Worldwide Infrastructure',
    icon: Globe, 
    desc: 'Global CDN with intelligent routing and edge computing capabilities.',
    features: ['Global CDN', 'Edge computing', 'Smart routing', 'Multi-region'],
    color: 'cyan'
  },
  { 
    title: 'Data Analytics', 
    subtitle: 'Business Intelligence',
    icon: Database, 
    desc: 'Comprehensive analytics with custom reporting and data-driven insights.',
    features: ['Real-time analytics', 'Custom reports', 'Data visualization', 'Export tools'],
    color: 'indigo'
  },
  { 
    title: 'AI-Powered Insights', 
    subtitle: 'Machine Learning Platform',
    icon: Cpu, 
    desc: 'Predictive analytics with machine learning for optimization and maintenance.',
    features: ['Predictive analytics', 'ML optimization', 'Anomaly detection', 'Auto-remediation'],
    color: 'pink'
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

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % services.length)
  }

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + services.length) % services.length)
  }

  return (
    <section id="services" className="py-24 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800"></div>
      <div className="absolute inset-0 grid-pattern opacity-5"></div>
      
      {/* Floating Background Elements */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-primary-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-40 h-40 bg-accent-cyan/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-accent-purple/5 rounded-full blur-3xl"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent-cyan/20 border border-accent-cyan/30 rounded-full text-accent-cyan text-sm font-medium mb-6">
            <div className="w-2 h-2 bg-accent-cyan rounded-full animate-pulse"></div>
            Professional Services
          </div>
          <h2 className="text-4xl md:text-5xl font-bold font-display text-white mb-6">
            Complete Platform <span className="bg-gradient-to-r from-primary-400 to-accent-cyan bg-clip-text text-transparent">Solutions</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Enterprise-grade deployment and management solutions designed for modern infrastructure at any scale
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
              {services.map(({title, subtitle, icon: Icon, desc, features, color}, i) => (
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
          <div className="flex items-center justify-center gap-4 sm:gap-8 mt-10">
            <button
              onClick={prevSlide}
              className="w-12 h-12 sm:w-14 sm:h-14 bg-gray-800/80 hover:bg-gray-700/80 border border-gray-600/30 rounded-full flex items-center justify-center transition-all duration-300 hover:border-primary-400/70 hover:scale-110 backdrop-blur-sm hover:shadow-[0_0_20px_rgba(99,102,241,0.4)]"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-300 hover:text-primary-400 transition-colors" />
            </button>

            {/* Progress Indicators */}
            <div className="flex items-center gap-2 sm:gap-3">
              {services.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`transition-all duration-300 ${
                    idx === currentIndex 
                      ? 'w-6 h-2 sm:w-8 sm:h-3 bg-primary-400 rounded-full' 
                      : 'w-2 h-2 sm:w-3 sm:h-3 bg-gray-600 hover:bg-gray-500 rounded-full'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={nextSlide}
              className="w-12 h-12 sm:w-14 sm:h-14 bg-gray-800/80 hover:bg-gray-700/80 border border-gray-600/30 rounded-full flex items-center justify-center transition-all duration-300 hover:border-primary-400/70 hover:scale-110 backdrop-blur-sm hover:shadow-[0_0_20px_rgba(99,102,241,0.4)]"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-gray-300 hover:text-primary-400 transition-colors" />
            </button>
          </div>
        </div>

        {/* Bottom CTA Section */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-20"
        >
        </motion.div>
      </div>
    </section>
  )
}
