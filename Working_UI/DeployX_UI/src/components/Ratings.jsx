import { Star } from 'lucide-react'
import { motion } from 'framer-motion'

const reviews = [
  { user: 'cyber_ops', text: 'DeployX cut our rollout time by 60%. Rock-solid.', rating: 5 },
  { user: 'dev_automation', text: 'RBAC and live monitoring are top-notch.', rating: 4 },
  { user: 'netadmin42', text: 'Agent updates are painless and safe.', rating: 5 },
  { user: 'sre_alpha', text: 'Alerting + scheduler = zero missed windows.', rating: 4 },
]

export default function Ratings() {
  return (
    <section id="reviews" className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-bold mb-6 text-softWhite">Customer Ratings</h2>

        <div className="flex overflow-x-auto gap-4 pb-2">
          {reviews.map((r, idx)=>(
            <motion.div
              key={idx}
              whileHover={{ y: -4 }}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx*0.05 }}
              className="min-w-[280px] glass-light border-trace rounded-2xl p-5"
            >
              <div className="flex items-center gap-2 mb-2">
                {[...Array(5)].map((_,i)=>(
                  <Star key={i} size={18} className={`star-glow ${i<r.rating?'text-neonAqua':'text-softWhite/30'}`} />
                ))}
              </div>
              <div className="text-electricBlue font-semibold">@{r.user}</div>
              <p className="text-softWhite/85">{r.text}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-6 mt-10">
          <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="glass-light border-trace rounded-2xl p-6 flex items-center gap-6">
            <div className="ring" style={{'--p': 0.88}}></div>
            <div>
              <h4 className="text-xl font-semibold mb-1 text-softWhite">Deployment Speed</h4>
              <div className="w-full h-3 bg-softWhite/10 rounded-full overflow-hidden">
                <div className="h-full bg-electricBlue rounded-full" style={{ width: '88%', transition: 'width 1s' }}></div>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="glass-light border-trace rounded-2xl p-6 flex items-center gap-6">
            <div className="ring" style={{'--p': 0.91}}></div>
            <div>
              <h4 className="text-xl font-semibold mb-1 text-softWhite">User Satisfaction</h4>
              <div className="w-full h-3 bg-softWhite/10 rounded-full overflow-hidden">
                <div className="h-full bg-neonAqua rounded-full" style={{ width: '91%', transition: 'width 1s' }}></div>
              </div>
            </div>
          </motion.div>
        </div>

      </div>
    </section>
  )
}
