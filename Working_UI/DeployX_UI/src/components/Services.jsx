import { LayoutGrid, Users2, Activity, Boxes, Laptop2, Shield, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

const services = [
  {
    icon: LayoutGrid,
    title: "Device Management",
    desc: "Centralized control and monitoring of all your devices across networks.",
    color: "blue",
    leftPoints: [
      "Real-time device status monitoring",
      "Automated device discovery & onboarding"
    ],
    rightPoints: [
      "Cross-platform compatibility support", 
      "Advanced device grouping & filtering"
    ]
  },
  {
    icon: Users2,
    title: "User Management",  
    desc: "Role-based access control and user authentication system.",
    color: "purple",
    leftPoints: [
      "Multi-factor authentication support",
      "Granular permission management"
    ],
    rightPoints: [
      "Active Directory integration",
      "Session management & audit logs"
    ]
  },
  {
    icon: Activity,
    title: "System Monitoring",
    desc: "Real-time monitoring and performance analytics for all connected devices.",
    color: "emerald",
    leftPoints: [
      "Live performance metrics dashboard",
      "Customizable alert & notification system"
    ],
    rightPoints: [
      "Historical data analysis & reporting",
      "Predictive maintenance insights"
    ]
  },
  {
    icon: Boxes,
    title: "Package Deployment",
    desc: "Automated software deployment and package management across devices.",
    color: "orange",
    leftPoints: [
      "Batch deployment across multiple devices",
      "Rollback capabilities for failed deployments"
    ],
    rightPoints: [
      "Scheduled deployment automation",
      "Version control & dependency management"
    ]
  },
  {
    icon: Laptop2,
    title: "Remote Control",
    desc: "Secure remote access and control of devices from anywhere.",
    color: "cyan",
    leftPoints: [
      "End-to-end encrypted connections",
      "Cross-platform remote desktop access"
    ],
    rightPoints: [
      "File transfer & synchronization",
      "Remote command execution & scripting"
    ]
  },
  {
    icon: Shield,
    title: "Security Center",
    desc: "Advanced security features with encryption and compliance monitoring.",
    color: "pink",
    leftPoints: [
      "Zero-trust security architecture",
      "Compliance reporting & audit trails"
    ],
    rightPoints: [
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

        {/* Horizontal Carousel */}
        <div className="relative">
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
              {services.map(({icon: Icon, title, desc, color, leftPoints, rightPoints}, i) => (
                <div
                  key={i}
                  className="w-full flex-shrink-0"
                  style={{ minWidth: '100%' }}
                >
                  <motion.div
                    className="group relative"
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* Main Card */}
                    <div className="relative card-dark border-glow hover-lift p-6 md:p-8 rounded-2xl overflow-hidden flex flex-col md:flex-row items-center gap-8 border border-gray-700/50 transition-all duration-500 hover:border-primary-400/60 hover:shadow-[0_0_20px_rgba(99,102,241,0.3),0_0_40px_rgba(99,102,241,0.1),inset_0_1px_0_rgba(255,255,255,0.1)] hover:shadow-primary-400/20 bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-sm">
                      
                      {/* Left Side - Description Points */}
                      <div className="flex-1">
                        <motion.div
                          initial={{ opacity: 0, x: -50 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.6, delay: 0.2 }}
                          className="space-y-6"
                        >
                          {leftPoints.map((point, idx) => (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, x: -30 }}
                              whileInView={{ opacity: 1, x: 0 }}
                              viewport={{ once: true }}
                              transition={{ duration: 0.5, delay: 0.3 + idx * 0.1 }}
                              className="flex items-start gap-4"
                            >
                              <div className="w-6 h-6 bg-primary-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                <CheckCircle className="w-4 h-4 text-primary-400" />
                              </div>
                              <p className="text-gray-300 text-base leading-relaxed">{point}</p>
                            </motion.div>
                          ))}
                        </motion.div>
                      </div>

                      {/* Center - Icon & Title */}
                      <div className="flex-shrink-0 text-center">
                        <motion.div 
                          className={`inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r ${colorMap[color]} rounded-2xl mb-6 shadow-lg transition-all duration-300 group-hover:shadow-[0_0_25px_rgba(99,102,241,0.5)] group-hover:shadow-primary-400/40`}
                          whileHover={{ rotate: 5, scale: 1.1 }}
                          initial={{ scale: 0 }}
                          whileInView={{ scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ type: "spring", duration: 0.8 }}
                        >
                          <Icon className="w-10 h-10 text-white" />
                        </motion.div>

                        <motion.h3 
                          className="text-2xl md:text-3xl font-bold text-white mb-4"
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.6, delay: 0.1 }}
                        >
                          {title}
                        </motion.h3>
                        
                        <motion.p 
                          className="text-lg text-gray-300 leading-relaxed max-w-md"
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.6, delay: 0.2 }}
                        >
                          {desc}
                        </motion.p>
                      </div>

                      {/* Right Side - Description Points */}
                      <div className="flex-1">
                        <motion.div
                          initial={{ opacity: 0, x: 50 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.6, delay: 0.2 }}
                          className="space-y-6"
                        >
                          {rightPoints.map((point, idx) => (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, x: 30 }}
                              whileInView={{ opacity: 1, x: 0 }}
                              viewport={{ once: true }}
                              transition={{ duration: 0.5, delay: 0.3 + idx * 0.1 }}
                              className="flex items-start gap-4"
                            >
                              <div className="w-6 h-6 bg-primary-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                <CheckCircle className="w-4 h-4 text-primary-400" />
                              </div>
                              <p className="text-gray-300 text-base leading-relaxed">{point}</p>
                            </motion.div>
                          ))}
                        </motion.div>
                      </div>

                      {/* Decorative Elements */}
                      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-primary-500/10 to-transparent rounded-bl-2xl"></div>
                      <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-accent-cyan/10 to-transparent rounded-tr-2xl"></div>
                    </div>
                  </motion.div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-center gap-6 mt-8">
            <button
              onClick={prevSlide}
              className="w-12 h-12 bg-gray-800/80 hover:bg-gray-700/80 border border-gray-600/30 rounded-full flex items-center justify-center transition-all duration-300 hover:border-primary-400/70 hover:scale-110 backdrop-blur-sm hover:shadow-[0_0_15px_rgba(99,102,241,0.4)] hover:shadow-primary-400/30"
            >
              <ChevronLeft className="w-5 h-5 text-gray-300 hover:text-primary-400 transition-colors" />
            </button>

            {/* Progress Indicators */}
            <div className="flex items-center gap-2">
              {services.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    idx === currentIndex 
                      ? 'bg-primary-400 scale-125' 
                      : 'bg-gray-600 hover:bg-gray-500'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={nextSlide}
              className="w-12 h-12 bg-gray-800/80 hover:bg-gray-700/80 border border-gray-600/30 rounded-full flex items-center justify-center transition-all duration-300 hover:border-primary-400/70 hover:scale-110 backdrop-blur-sm hover:shadow-[0_0_15px_rgba(99,102,241,0.4)] hover:shadow-primary-400/30"
            >
              <ChevronRight className="w-5 h-5 text-gray-300 hover:text-primary-400 transition-colors" />
            </button>
          </div>

          {/* Current Slide Info */}
          <div className="text-center mt-6">
            <span className="text-gray-400 text-sm">
              {currentIndex + 1} of {services.length}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}