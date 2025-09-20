import { LayoutGrid, Users2, Activity, Boxes, Laptop2, Shield, Zap, Globe, Database, Cpu } from 'lucide-react'
import { motion } from 'framer-motion'

const services = [
  { 
    title: 'Centralized Web Dashboard', 
    icon: LayoutGrid, 
    desc: 'Unified control plane with audit trails and metrics.',
    features: ['Real-time monitoring', 'Audit logs', 'Performance metrics']
  },
  { 
    title: 'Multi-User Role System (RBAC)', 
    icon: Users2, 
    desc: 'Granular roles, SSO integration, and least-privilege access.',
    features: ['Role-based access', 'SSO integration', 'Permission management']
  },
  { 
    title: 'Real-Time Monitoring', 
    icon: Activity, 
    desc: 'Live health, logs, and telemetry across all agents.',
    features: ['Health checks', 'Live logs', 'Telemetry data']
  },
  { 
    title: 'Agent Group Management', 
    icon: Boxes, 
    desc: 'Dynamic grouping, targeting, and staged rollouts.',
    features: ['Dynamic grouping', 'Targeted deployment', 'Staged rollouts']
  },
  { 
    title: 'Cross-Platform Support', 
    icon: Laptop2, 
    desc: 'Windows, Linux, and macOS agents with unified APIs.',
    features: ['Windows support', 'Linux support', 'macOS support']
  },
  { 
    title: 'Advanced Security', 
    icon: Shield, 
    desc: 'End-to-end encryption and secure communication protocols.',
    features: ['TLS encryption', 'Secure protocols', 'Access control']
  },
  { 
    title: 'High Performance', 
    icon: Zap, 
    desc: 'Optimized for speed with minimal resource consumption.',
    features: ['Fast execution', 'Low overhead', 'Scalable architecture']
  },
  { 
    title: 'Global Distribution', 
    icon: Globe, 
    desc: 'Distribute agents worldwide with intelligent routing.',
    features: ['Global CDN', 'Smart routing', 'Edge computing']
  },
  { 
    title: 'Data Analytics', 
    icon: Database, 
    desc: 'Comprehensive analytics and reporting capabilities.',
    features: ['Real-time analytics', 'Custom reports', 'Data insights']
  },
  { 
    title: 'AI-Powered Insights', 
    icon: Cpu, 
    desc: 'Machine learning for predictive maintenance and optimization.',
    features: ['Predictive analytics', 'ML insights', 'Auto-optimization']
  }
]

export default function Services() {
  return (
    <section id="services" className="py-24 relative">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 left-10 w-32 h-32 bg-electricBlue/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-neonAqua/10 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-softWhite mb-6">
            Our <span className="text-electricBlue">Services</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Comprehensive deployment and management solutions designed for modern infrastructure needs
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map(({title, icon: Icon, desc, features}, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ y: -5, scale: 1.02 }}
              className="group relative"
            >
              <div className="glass-light border-trace rounded-2xl p-6 h-full transition-all duration-300 hover:border-electricBlue/60 hover:shadow-lg hover:shadow-electricBlue/20">
                {/* Icon with glow effect */}
                <div className="relative mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-electricBlue/20 to-neonAqua/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Icon size={32} className="text-electricBlue group-hover:text-neonAqua transition-colors duration-300" />
                  </div>
                  <div className="absolute inset-0 w-16 h-16 bg-electricBlue/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold mb-3 text-softWhite group-hover:text-electricBlue transition-colors duration-300">
                  {title}
                </h3>
                <p className="text-gray-300 mb-4 text-sm leading-relaxed">
                  {desc}
                </p>

                {/* Features list */}
                <ul className="space-y-2">
                  {features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-gray-400">
                      <div className="w-1.5 h-1.5 bg-neonAqua rounded-full"></div>
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* Hover effect overlay */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-electricBlue/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Call to action */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center mt-16"
        >
        </motion.div>
      </div>
    </section>
  )
}
