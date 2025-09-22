import { Star, Zap, Users, TrendingUp, Award, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { useState } from 'react'

const reviews = [
  { user: 'cyber_ops', text: 'DeployX cut our rollout time by 60%. Rock-solid.', rating: 5 },
  { user: 'dev_automation', text: 'RBAC and live monitoring are top-notch.', rating: 4 },
  { user: 'netadmin42', text: 'Agent updates are painless and safe.', rating: 5 },
  { user: 'sre_alpha', text: 'Alerting + scheduler = zero missed windows.', rating: 4 },
  { user: 'cloud_ninja', text: 'Cross-platform deployment made simple.', rating: 5 },
  { user: 'devops_pro', text: 'AI insights help us prevent issues before they happen.', rating: 5 },
  { user: 'sec_analyst', text: 'Zero-trust architecture gives us peace of mind.', rating: 4 },
  { user: 'platform_eng', text: 'Global distribution handles our worldwide operations.', rating: 5 },
  { user: 'infrastructure_lead', text: 'Monitoring and analytics are game-changing.', rating: 5 },
  { user: 'release_manager', text: 'Deployment scheduling has never been easier.', rating: 4 },
  { user: 'sys_admin', text: 'Agent management is intuitive and powerful.', rating: 5 },
  { user: 'tech_lead', text: 'Performance optimization is incredible.', rating: 5 },
]

// Split reviews into 3 columns and triple them for smooth infinite scroll
const column1Reviews = [
  ...reviews.filter((_, i) => i % 3 === 0), 
  ...reviews.filter((_, i) => i % 3 === 0),
  ...reviews.filter((_, i) => i % 3 === 0)
]
const column2Reviews = [
  ...reviews.filter((_, i) => i % 3 === 1), 
  ...reviews.filter((_, i) => i % 3 === 1),
  ...reviews.filter((_, i) => i % 3 === 1)
]
const column3Reviews = [
  ...reviews.filter((_, i) => i % 3 === 2), 
  ...reviews.filter((_, i) => i % 3 === 2),
  ...reviews.filter((_, i) => i % 3 === 2)
]

export default function Ratings() {
  const [hoveredColumn, setHoveredColumn] = useState(null)

  const ReviewCard = ({ review, idx, columnId }) => (
    <motion.div
      key={`${review.user}-${idx}`}
      onHoverStart={() => setHoveredColumn(columnId)}
      onHoverEnd={() => setHoveredColumn(null)}
      whileHover={{ 
        scale: 1.05,
        zIndex: 10,
        transition: { duration: 0.2 }
      }}
      className="min-h-[200px] mb-6 glass-light border-trace rounded-2xl p-5 hover:shadow-2xl hover:shadow-neonAqua/20 transition-all duration-300 cursor-pointer backdrop-blur-sm relative"
    >
      <div className="flex items-center gap-2 mb-3">
        {[...Array(5)].map((_, i) => (
          <Star 
            key={i} 
            size={18} 
            className={`star-glow transition-all duration-300 ${
              i < review.rating ? 'text-neonAqua fill-neonAqua' : 'text-softWhite/30'
            }`} 
          />
        ))}
      </div>
      <div className="text-electricBlue font-semibold mb-2 flex items-center gap-2">
        <div className="w-2 h-2 bg-neonAqua rounded-full animate-pulse"></div>
        @{review.user}
      </div>
      <p className="text-softWhite/85 leading-relaxed">{review.text}</p>
      
      {/* Glowing border effect on hover */}
      <div className="absolute inset-0 rounded-2xl border border-neonAqua/0 hover:border-neonAqua/50 transition-all duration-300 pointer-events-none"></div>
    </motion.div>
  )

  return (
    <section id="reviews" className="py-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        {/* Enhanced Heading Section */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-[2px] bg-gradient-to-r from-transparent via-neonAqua to-transparent"></div>
            <span className="text-sm uppercase tracking-[0.2em] text-electricBlue font-semibold">
              Customer Reviews
            </span>
            <div className="w-12 h-[2px] bg-gradient-to-r from-transparent via-neonAqua to-transparent"></div>
          </div>
          
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-softWhite via-electricBlue to-neonAqua bg-clip-text text-transparent leading-tight">
            What Our Community 
            <span className="block bg-gradient-to-r from-neonAqua to-electricBlue bg-clip-text text-transparent">
              Says About Us
            </span>
          </h2>
          
          <p className="text-lg text-softWhite/70 max-w-2xl mx-auto leading-relaxed">
            Real feedback from developers, DevOps engineers, and system administrators 
            who trust DeployX for their mission-critical deployments
          </p>
          
          {/* Decorative Elements */}
          <div className="flex justify-center items-center gap-4 mt-8">
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  size={20} 
                  className="text-neonAqua fill-neonAqua animate-pulse" 
                  style={{animationDelay: `${i * 0.1}s`}}
                />
              ))}
            </div>
            <span className="text-softWhite/60 text-sm font-medium">4.9 out of 5</span>
          </div>
        </motion.div>

        {/* 3 Vertical Columns - All Moving Together Synchronized */}
        <div className="grid grid-cols-3 gap-6 h-[600px] overflow-hidden relative">
          {/* Column 1 - Moving UP */}
          <div className="relative overflow-hidden">
            <motion.div
              className="flex flex-col"
              animate={hoveredColumn === 'col1' ? {} : {
                y: [0, `-${33.33}%`]
              }}
              transition={{
                y: {
                  duration: 25,
                  repeat: hoveredColumn === 'col1' ? 0 : Infinity,
                  ease: "linear",
                  repeatType: "loop"
                }
              }}
            >
              {column1Reviews.map((review, idx) => (
                <ReviewCard key={`col1-${idx}`} review={review} idx={idx} columnId="col1" />
              ))}
            </motion.div>
            {/* Gradient fade edges */}
            <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-gray-900 to-transparent pointer-events-none z-10"></div>
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-gray-900 to-transparent pointer-events-none z-10"></div>
          </div>

          {/* Column 2 - Moving DOWN */}
          <div className="relative overflow-hidden">
            <motion.div
              className="flex flex-col"
              animate={hoveredColumn === 'col2' ? {} : {
                y: [`-${33.33}%`, 0]
              }}
              transition={{
                y: {
                  duration: 25,
                  repeat: hoveredColumn === 'col2' ? 0 : Infinity,
                  ease: "linear",
                  repeatType: "loop"
                }
              }}
            >
              {column2Reviews.map((review, idx) => (
                <ReviewCard key={`col2-${idx}`} review={review} idx={idx} columnId="col2" />
              ))}
            </motion.div>
            {/* Gradient fade edges */}
            <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-gray-900 to-transparent pointer-events-none z-10"></div>
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-gray-900 to-transparent pointer-events-none z-10"></div>
          </div>

          {/* Column 3 - Moving UP */}
          <div className="relative overflow-hidden">
            <motion.div
              className="flex flex-col"
              animate={hoveredColumn === 'col3' ? {} : {
                y: [0, `-${33.33}%`]
              }}
              transition={{
                y: {
                  duration: 25,
                  repeat: hoveredColumn === 'col3' ? 0 : Infinity,
                  ease: "linear",
                  repeatType: "loop"
                }
              }}
            >
              {column3Reviews.map((review, idx) => (
                <ReviewCard key={`col3-${idx}`} review={review} idx={idx} columnId="col3" />
              ))}
            </motion.div>
            {/* Gradient fade edges */}
            <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-gray-900 to-transparent pointer-events-none z-10"></div>
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-gray-900 to-transparent pointer-events-none z-10"></div>
          </div>
        </div>

        {/* Mesmerizing Stats Section */}
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-20"
        >
          {/* Section Header */}
          <div className="text-center mb-12">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-neonAqua/20 border border-neonAqua/30 rounded-full text-neonAqua text-sm font-medium mb-4"
            >
              <Sparkles className="w-4 h-4" />
              Performance Metrics
            </motion.div>
            <motion.h3 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-3xl font-bold bg-gradient-to-r from-softWhite via-electricBlue to-neonAqua bg-clip-text text-transparent"
            >
              Trusted by Industry Leaders
            </motion.h3>
          </div>

          {/* Animated Stats Grid */}
          <div className="grid md:grid-cols-3 gap-8">
            {/* Deployment Speed */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.5 }}
              whileHover={{ y: -10, scale: 1.02 }}
              className="relative group"
            >
              <div className="glass-light border-trace rounded-2xl p-8 relative overflow-hidden">
                {/* Animated Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-electricBlue/5 to-neonAqua/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                {/* Icon */}
                <motion.div 
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ type: "spring", delay: 0.7, duration: 0.8 }}
                  className="w-16 h-16 bg-gradient-to-r from-electricBlue to-neonAqua rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 relative z-10"
                >
                  <Zap className="w-8 h-8 text-white" />
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 border-2 border-electricBlue/30 rounded-2xl"
                  ></motion.div>
                </motion.div>

                {/* Content */}
                <div className="relative z-10">
                  <h4 className="text-2xl font-bold text-softWhite mb-2 group-hover:text-electricBlue transition-colors">
                    88% Faster
                  </h4>
                  <p className="text-softWhite/70 mb-4">Deployment Speed</p>
                  
                  {/* Animated Progress Bar */}
                  <div className="relative">
                    <div className="w-full h-2 bg-softWhite/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: "88%" }}
                        viewport={{ once: true }}
                        transition={{ duration: 2, delay: 1, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-electricBlue to-neonAqua rounded-full relative"
                      >
                        <motion.div
                          animate={{ x: ["-100%", "100%"] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                        ></motion.div>
                      </motion.div>
                    </div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 2.5 }}
                      className="absolute -top-8 right-0 text-xs text-neonAqua font-medium"
                    >
                      vs Traditional Methods
                    </motion.div>
                  </div>
                </div>

                {/* Floating Particles */}
                <motion.div
                  animate={{ y: [0, -20, 0], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 3, repeat: Infinity, delay: 1 }}
                  className="absolute top-4 right-4 w-2 h-2 bg-electricBlue rounded-full"
                ></motion.div>
                <motion.div
                  animate={{ y: [0, -15, 0], opacity: [0.3, 0.8, 0.3] }}
                  transition={{ duration: 4, repeat: Infinity, delay: 2 }}
                  className="absolute bottom-6 left-6 w-1 h-1 bg-neonAqua rounded-full"
                ></motion.div>
              </div>
            </motion.div>

            {/* User Satisfaction */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.7 }}
              whileHover={{ y: -10, scale: 1.02 }}
              className="relative group"
            >
              <div className="glass-light border-trace rounded-2xl p-8 relative overflow-hidden">
                {/* Animated Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-neonAqua/5 to-electricBlue/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                {/* Icon */}
                <motion.div 
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ type: "spring", delay: 0.9, duration: 0.8 }}
                  className="w-16 h-16 bg-gradient-to-r from-neonAqua to-electricBlue rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 relative z-10"
                >
                  <Users className="w-8 h-8 text-white" />
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="absolute inset-0 border-2 border-neonAqua/20 rounded-2xl"
                  ></motion.div>
                </motion.div>

                {/* Content */}
                <div className="relative z-10">
                  <h4 className="text-2xl font-bold text-softWhite mb-2 group-hover:text-neonAqua transition-colors">
                    4.9/5.0
                  </h4>
                  <p className="text-softWhite/70 mb-4">User Satisfaction</p>
                  
                  {/* Star Rating Animation */}
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 1.2 + i * 0.1, type: "spring" }}
                      >
                        <Star 
                          size={20} 
                          className="text-neonAqua fill-neonAqua" 
                        />
                      </motion.div>
                    ))}
                  </div>
                  
                  {/* Progress Circle */}
                  <div className="relative w-20 h-20 mx-auto">
                    <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
                      <circle
                        cx="40"
                        cy="40"
                        r="35"
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="6"
                        fill="none"
                      />
                      <motion.circle
                        cx="40"
                        cy="40"
                        r="35"
                        stroke="url(#gradient2)"
                        strokeWidth="6"
                        fill="none"
                        strokeDasharray={219.9}
                        initial={{ strokeDashoffset: 219.9 }}
                        whileInView={{ strokeDashoffset: 219.9 * (1 - 0.91) }}
                        viewport={{ once: true }}
                        transition={{ duration: 2, delay: 1.5, ease: "easeOut" }}
                        strokeLinecap="round"
                      />
                      <defs>
                        <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#00F5FF" />
                          <stop offset="100%" stopColor="#0080FF" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <motion.div
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 2 }}
                      className="absolute inset-0 flex items-center justify-center text-sm font-bold text-neonAqua"
                    >
                      91%
                    </motion.div>
                  </div>
                </div>

                {/* Floating Elements */}
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                  className="absolute top-4 right-4 w-3 h-3 border border-neonAqua rounded-full opacity-60"
                ></motion.div>
              </div>
            </motion.div>

            {/* Achievement Badge */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.9 }}
              whileHover={{ y: -10, scale: 1.02 }}
              className="relative group"
            >
              <div className="glass-light border-trace rounded-2xl p-8 relative overflow-hidden">
                {/* Animated Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                {/* Icon */}
                <motion.div 
                  initial={{ scale: 0, rotate: -180 }}
                  whileInView={{ scale: 1, rotate: 0 }}
                  viewport={{ once: true }}
                  transition={{ type: "spring", delay: 1.1, duration: 1 }}
                  className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 relative z-10"
                >
                  <Award className="w-8 h-8 text-white" />
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                    className="absolute -inset-2 border-2 border-yellow-500/30 rounded-3xl"
                  ></motion.div>
                </motion.div>

                {/* Content */}
                <div className="relative z-10">
                  <h4 className="text-2xl font-bold text-softWhite mb-2 group-hover:text-yellow-400 transition-colors">
                    #1 Choice
                  </h4>
                  <p className="text-softWhite/70 mb-4">Industry Leader</p>
                  
                  {/* Trending Chart */}
                  <div className="flex items-end gap-1 h-12 mb-4">
                    {[3, 7, 5, 9, 6, 11, 8, 12].map((height, i) => (
                      <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        whileInView={{ height: `${height * 8}%` }}
                        viewport={{ once: true }}
                        transition={{ delay: 1.5 + i * 0.1, duration: 0.5 }}
                        className="flex-1 bg-gradient-to-t from-yellow-500 to-orange-400 rounded-sm opacity-80"
                      ></motion.div>
                    ))}
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-yellow-400">
                    <TrendingUp className="w-4 h-4" />
                    <span>Growth Rate: +156%</span>
                  </div>
                </div>

                {/* Sparkle Effects */}
                <motion.div
                  animate={{ 
                    scale: [0, 1, 0],
                    rotate: [0, 180, 360],
                    opacity: [0, 1, 0]
                  }}
                  transition={{ duration: 2, repeat: Infinity, delay: 2 }}
                  className="absolute top-6 left-6 text-yellow-400"
                >
                  <Sparkles className="w-4 h-4" />
                </motion.div>
                <motion.div
                  animate={{ 
                    scale: [0, 1, 0],
                    rotate: [360, 180, 0],
                    opacity: [0, 1, 0]
                  }}
                  transition={{ duration: 2, repeat: Infinity, delay: 3 }}
                  className="absolute bottom-6 right-6 text-yellow-400"
                >
                  <Sparkles className="w-3 h-3" />
                </motion.div>
              </div>
            </motion.div>
          </div>
        </motion.div>

      </div>
    </section>
  )
}
