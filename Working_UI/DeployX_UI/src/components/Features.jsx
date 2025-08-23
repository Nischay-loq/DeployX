import { Shield, KeyRound, RefreshCw, Terminal, BellRing, Clock3 } from 'lucide-react'
import { motion } from 'framer-motion'

const data = [
  { title: 'Secure Communication (TLS 1.3)', icon: Shield, desc: 'All traffic protected with the latest TLS 1.3 ciphers for confidentiality and integrity.' },
  { title: 'Token-Based Authentication (JWT)', icon: KeyRound, desc: 'Stateless, signed JWT tokens to secure API and agent access.' },
  { title: 'Auto-Updating Agents', icon: RefreshCw, desc: 'Agents update seamlessly with staged rollouts and safety checks.' },
  { title: 'Real-Time Command Execution', icon: Terminal, desc: 'Low-latency, event-driven command dispatch with live logs.' },
  { title: 'Alerting & Notification System', icon: BellRing, desc: 'Configurable channels, thresholds, and escalation policies.' },
  { title: 'Task Scheduler', icon: Clock3, desc: 'Cron-like orchestration for periodic maintenance and deploys.' },
]

export default function Features() {
  return (
    <section id="features" className="py-24 bg-[radial-gradient(circle_at_top_left,rgba(0,168,255,0.15),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(0,255,247,0.12),transparent_40%)]">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-bold mb-10 text-softWhite">Features</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.map(({title, icon:Icon, desc}, i)=>(
            <motion.div
              key={title}
              whileHover={{ scale: 1.03 }}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i*0.05 }}
              className="border-trace glass-light p-6 rounded-2xl hover:shadow-glow"
            >
              <div className="flex items-center gap-3 mb-3">
                <Icon className="star-glow" />
                <h3 className="text-xl font-semibold text-softWhite">{title}</h3>
              </div>
              <p className="text-softWhite/80">{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
