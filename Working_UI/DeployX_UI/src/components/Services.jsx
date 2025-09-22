import { LayoutGrid, Users2, Activity, Boxes, Laptop2, Shield, Zap, Globe, Database, Cpu, ChevronLeft, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { useState } from 'react'

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
  const itemsPerView = 1 // Show one service card at a time in center
  const maxIndex = Math.max(0, services.length - 1)

  const nextSlide = () => {
    setCurrentIndex(prev => (prev >= maxIndex ? 0 : prev + 1))
  }

  const prevSlide = () => {
    setCurrentIndex(prev => (prev <= 0 ? maxIndex : prev - 1))
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

        {/* Services Carousel */}
        <div className="relative flex items-center">
          {/* Left Navigation */}
          <button
            onClick={prevSlide}
            className="absolute left-0 z-10 w-16 h-16 bg-gray-800/80 hover:bg-gray-700/80 border border-gray-600/30 rounded-full flex items-center justify-center transition-all duration-300 hover:border-primary-400/50 hover:scale-110 backdrop-blur-sm"
          >
            <ChevronLeft className="w-6 h-6 text-gray-300 hover:text-primary-400 transition-colors" />
          </button>

          {/* Right Navigation */}
          <button
            onClick={nextSlide}
            className="absolute right-0 z-10 w-16 h-16 bg-gray-800/80 hover:bg-gray-700/80 border border-gray-600/30 rounded-full flex items-center justify-center transition-all duration-300 hover:border-primary-400/50 hover:scale-110 backdrop-blur-sm"
          >
            <ChevronRight className="w-6 h-6 text-gray-300 hover:text-primary-400 transition-colors" />
          </button>

          {/* Carousel Container - Centered */}
          <div className="w-full flex justify-center px-20">
            <div className="max-w-md w-full overflow-hidden">
              <div className="relative">
                <motion.div
                  className="flex"
                  animate={{
                    x: `-${currentIndex * 100}%`
                  }}
                  transition={{
                    type: "tween",
                    ease: "easeInOut",
                    duration: 0.5
                  }}
                >
                  {services.map(({title, subtitle, icon: Icon, desc, features, color}, i) => (
                    <div
                      key={i}
                      className="w-full flex-shrink-0"
                      style={{ minWidth: '100%' }}
                    >
                      <motion.div
                        whileHover={{ y: -8, scale: 1.05 }}
                        className="group w-full px-2"
                      >
                        <div className="card-dark h-full hover-lift border-glow relative overflow-hidden">
                          {/* Icon Header */}
                          <div className="flex flex-col items-center text-center gap-4 mb-6">
                            <div className={`w-16 h-16 bg-gradient-to-r ${colorMap[color]} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                              <Icon className="w-8 h-8 text-white" />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-white group-hover:text-primary-400 transition-colors mb-2">
                                {title}
                              </h3>
                              <p className="text-sm text-gray-400 font-medium uppercase tracking-wide">{subtitle}</p>
                            </div>
                          </div>

                          {/* Description */}
                          <p className="text-gray-300 text-center leading-relaxed mb-6">
                            {desc}
                          </p>

                          {/* Features List */}
                          <div className="space-y-3">
                            {features.map((feature, idx) => (
                              <div key={idx} className="flex items-center gap-3 text-sm text-gray-400">
                                <div className={`w-2 h-2 bg-gradient-to-r ${colorMap[color]} rounded-full`}></div>
                                <span>{feature}</span>
                              </div>
                            ))}
                          </div>

                          {/* Hover Gradient Overlay */}
                          <div className={`absolute inset-0 bg-gradient-to-br ${colorMap[color]} opacity-0 group-hover:opacity-5 transition-opacity duration-300 rounded-xl pointer-events-none`}></div>
                        </div>
                      </motion.div>
                    </div>
                  ))}
                </motion.div>
              </div>
            </div>
          </div>

          {/* Dots Indicator - Bottom Center */}
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-16 flex gap-2">
            {services.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  idx === currentIndex ? 'bg-primary-400 w-6' : 'bg-gray-600 hover:bg-gray-500'
                }`}
              />
            ))}
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
