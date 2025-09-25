import { LayoutGrid, Users2, Activity, Boxes, Laptop2, Shield, Zap, Globe, Database, Cpu, ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'

const services = [
  {
    icon: LayoutGrid,
    title: "Device Management",
    desc: "Centralized control and monitoring of all your devices across networks.",
    color: "blue"
  },
  {
    icon: Users2,
    title: "User Management",
    desc: "Role-based access control and user authentication system.",
    color: "purple"
  },
  {
    icon: Activity,
    title: "System Monitoring",
    desc: "Real-time monitoring and performance analytics for all connected devices.",
    color: "emerald"
  },
  {
    icon: Boxes,
    title: "Package Deployment",
    desc: "Automated software deployment and package management across devices.",
    color: "orange"
  },
  {
    icon: Laptop2,
    title: "Remote Control",
    desc: "Secure remote access and control of devices from anywhere.",
    color: "cyan"
  },
  {
    icon: Shield,
    title: "Security Center",
    desc: "Advanced security features with encryption and compliance monitoring.",
    color: "pink"
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
  const [isPlaying, setIsPlaying] = useState(true)

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % services.length)
  }

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + services.length) % services.length)
  }

  // Auto-play functionality
  useEffect(() => {
    if (!isPlaying) return
    
    const interval = setInterval(() => {
      nextSlide()
    }, 4000)

    return () => clearInterval(interval)
  }, [isPlaying, currentIndex])

  return (
    <section id="services" className="py-24 bg-gradient-to-b from-gray-900 to-gray-950 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-32 h-32 bg-primary-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-accent-cyan/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-accent-purple/5 rounded-full blur-3xl"></div>
      </div>

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
            Trusted by <span className="bg-gradient-to-r from-primary-400 to-accent-cyan bg-clip-text text-transparent">Industry Leaders</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            See why companies worldwide choose DeployX for their mission-critical infrastructure
          </p>
        </motion.div>

        {/* Professional Horizontal Carousel */}
        <div className="relative">
          {/* Carousel Container */}
          <div 
            className="overflow-hidden rounded-2xl"
            onMouseEnter={() => setIsPlaying(false)}
            onMouseLeave={() => setIsPlaying(true)}
          >
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
              {services.map(({icon: Icon, title, desc, stats, testimonial, client, rating, color}, i) => (
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
                    <div className={`relative bg-gradient-to-br ${colorMap[color]} p-8 md:p-12 rounded-2xl overflow-hidden min-h-[500px] flex flex-col md:flex-row items-center gap-8`}>
                      {/* Left Content */}
                      <div className="flex-1 text-center md:text-left">
                        {/* Icon */}
                        <motion.div 
                          className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl mb-6"
                          whileHover={{ rotate: 5, scale: 1.1 }}
                        >
                          <Icon className="w-10 h-10 text-white" />
                        </motion.div>

                        {/* Title & Description */}
                        <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
                          {title}
                        </h3>
                        <p className="text-xl text-white/90 mb-6 leading-relaxed">
                          {desc}
                        </p>

                        {/* Stats */}
                        <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/20 backdrop-blur-md rounded-full mb-8">
                          <TrendingUp className="w-5 h-5 text-white" />
                          <span className="text-white font-semibold text-lg">{stats}</span>
                        </div>
                      </div>

                      {/* Right Content - Testimonial Card */}
                      <div className="flex-1 max-w-md">
                        <motion.div 
                          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6"
                          whileHover={{ y: -5 }}
                        >
                          {/* Stars */}
                          <div className="flex gap-1 mb-4">
                            {[...Array(rating)].map((_, idx) => (
                              <Star key={idx} className="w-5 h-5 text-yellow-400 fill-current" />
                            ))}
                          </div>

                          {/* Testimonial */}
                          <blockquote className="text-white/90 text-lg mb-4 font-medium">
                            "{testimonial}"
                          </blockquote>

                          {/* Client */}
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                              <Building2 className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <div className="text-white font-semibold">{client}</div>
                              <div className="text-white/70 text-sm">Verified Client</div>
                            </div>
                          </div>

                          {/* Success Badge */}
                          <div className="flex items-center gap-2 mt-4 text-green-300">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="text-sm font-medium">Verified Success Story</span>
                          </div>
                        </motion.div>
                      </div>

                      {/* Decorative Elements */}
                      <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
                      <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
                    </div>
                  </motion.div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between mt-8">
            {/* Left Side - Play/Pause & Navigation */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-12 h-12 bg-gray-800/80 hover:bg-gray-700/80 border border-gray-600/30 rounded-full flex items-center justify-center transition-all duration-300 hover:border-primary-400/50 backdrop-blur-sm"
              >
                {isPlaying ? 
                  <Pause className="w-5 h-5 text-gray-300" /> : 
                  <Play className="w-5 h-5 text-gray-300" />
                }
              </button>

              <button
                onClick={prevSlide}
                className="w-12 h-12 bg-gray-800/80 hover:bg-gray-700/80 border border-gray-600/30 rounded-full flex items-center justify-center transition-all duration-300 hover:border-primary-400/50 hover:scale-110 backdrop-blur-sm"
              >
                <ChevronLeft className="w-5 h-5 text-gray-300 hover:text-primary-400 transition-colors" />
              </button>

              <button
                onClick={nextSlide}
                className="w-12 h-12 bg-gray-800/80 hover:bg-gray-700/80 border border-gray-600/30 rounded-full flex items-center justify-center transition-all duration-300 hover:border-primary-400/50 hover:scale-110 backdrop-blur-sm"
              >
                <ChevronRight className="w-5 h-5 text-gray-300 hover:text-primary-400 transition-colors" />
              </button>
            </div>

            {/* Right Side - Progress Indicators */}
            <div className="flex items-center gap-3">
              {services.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className="group relative"
                >
                  {/* Progress Bar */}
                  <div className="w-12 h-1 bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full bg-gradient-to-r ${colorMap[services[idx].color]} rounded-full`}
                      initial={{ width: "0%" }}
                      animate={{ 
                        width: idx === currentIndex ? "100%" : "0%" 
                      }}
                      transition={{ 
                        duration: idx === currentIndex && isPlaying ? 4 : 0.3,
                        ease: "linear"
                      }}
                    />
                  </div>
                  
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                      {services[idx].title}
                    </div>
                  </div>
                </button>
              ))}
            </div>
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