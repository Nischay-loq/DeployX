import { Shield, KeyRound, RefreshCw, Terminal, BellRing, Clock3 } from 'lucide-react'
import { motion } from 'framer-motion'

const data = [
  { 
    title: 'Enterprise Security', 
    subtitle: 'TLS 1.3 & Zero-Trust Architecture',
    icon: Shield, 
    desc: 'Bank-grade encryption with TLS 1.3, certificate pinning, and comprehensive audit logging for complete security assurance.',
    gradient: 'from-green-500 to-emerald-600'
  },
  { 
    title: 'Smart Authentication', 
    subtitle: 'JWT & Multi-Factor Security',
    icon: KeyRound, 
    desc: 'Stateless JWT tokens with refresh rotation, MFA support, and role-based access controls for enterprise compliance.',
    gradient: 'from-blue-500 to-cyan-600'
  },
  { 
    title: 'Auto-Updating Agents', 
    subtitle: 'Zero-Downtime Deployments',
    icon: RefreshCw, 
    desc: 'Intelligent agent updates with staged rollouts, health checks, and automatic rollback capabilities.',
    gradient: 'from-purple-500 to-violet-600'
  },
  { 
    title: 'Real-Time Execution', 
    subtitle: 'Low-Latency Command Processing',
    icon: Terminal, 
    desc: 'Event-driven architecture delivering sub-second command execution with live streaming and progress tracking.',
    gradient: 'from-orange-500 to-red-600'
  },
  { 
    title: 'Intelligent Alerts', 
    subtitle: 'Smart Notification System',
    icon: BellRing, 
    desc: 'AI-powered alerting with customizable thresholds, escalation policies, and multi-channel delivery.',
    gradient: 'from-pink-500 to-rose-600'
  },
  { 
    title: 'Advanced Scheduling', 
    subtitle: 'Cron-Compatible Orchestration',
    icon: Clock3, 
    desc: 'Enterprise-grade task scheduling with dependency management, timezone support, and failure recovery.',
    gradient: 'from-indigo-500 to-blue-600'
  },
]

export default function Features() {
  return (
    <section id="features" className="py-24 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"></div>
      <div className="absolute inset-0 grid-pattern opacity-10"></div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500/20 border border-primary-500/30 rounded-full text-primary-400 text-sm font-medium mb-6">
            <div className="w-2 h-2 bg-primary-400 rounded-full animate-pulse"></div>
            Enterprise Features
          </div>
          <h2 className="text-4xl md:text-5xl font-bold font-display text-white mb-6">
            Professional-Grade Platform
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Deploy with confidence using enterprise security, intelligent automation, and real-time monitoring capabilities.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {data.map(({title, subtitle, icon: Icon, desc, gradient}, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 30 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ y: -8 }}
              className="group"
            >
              <div className="card-dark h-full hover-lift border-glow">
                {/* Icon Header */}
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-16 h-16 bg-gradient-to-r ${gradient} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white group-hover:text-primary-400 transition-colors">
                      {title}
                    </h3>
                    <p className="text-sm text-gray-400 font-medium">{subtitle}</p>
                  </div>
                </div>

                {/* Description */}
                <p className="text-gray-300 leading-relaxed">
                  {desc}
                </p>

                {/* Hover Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Call to Action */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-16"
        >
          <div className="glass-panel rounded-2xl p-8 max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-white mb-4">Ready to Experience Enterprise Deployment?</h3>
            <p className="text-gray-400 mb-6">
              Join thousands of teams who trust DeployX for their critical infrastructure management.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="btn-primary">
                Start Free Trial
              </button>
              <button className="btn-outline bg-white/5 border-white/20 text-white hover:bg-white hover:text-gray-900">
                View Documentation
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
