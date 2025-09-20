import { Mail, MapPin, Phone, Send } from 'lucide-react'
import { motion } from 'framer-motion'
import { useState } from 'react'; // Import useState

export default function Contact() {
  const [isMapActive, setIsMapActive] = useState(false); // Add state for the map

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission logic here
    console.log('Form submitted');
  };

  return (
    <section id="contactus" className="py-24 relative">
      {/* ... (rest of your component code is the same) ... */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 right-10 w-32 h-32 bg-electricBlue/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-40 h-40 bg-neonAqua/10 rounded-full blur-3xl"></div>
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
            Get in <span className="text-electricBlue">Touch</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Ready to revolutionize your deployment process? Let's discuss how DeployX can help your team.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-stretch">
          {/* ... (The entire contact form div is the same) ... */}
          <motion.div
            initial={{ opacity: 0, x: -20 }} 
            whileInView={{ opacity: 1, x: 0 }} 
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="form-container"
          >
            <div className="glass-light border-trace rounded-2xl p-8 h-full">
              <h3 className="text-2xl font-bold text-softWhite mb-6 flex items-center gap-3">
                <Send className="text-electricBlue" size={28} />
                Send us a Message
              </h3>
              
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-2 text-softWhite font-medium">First Name</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-3 rounded-xl bg-cyberBlue/60 border border-neonAqua/40 focus:outline-none focus:ring-2 focus:ring-neonAqua/70 transition-all text-softWhite placeholder-gray-400" 
                      placeholder="John" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2 text-softWhite font-medium">Last Name</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-3 rounded-xl bg-cyberBlue/60 border border-neonAqua/40 focus:outline-none focus:ring-2 focus:ring-neonAqua/70 transition-all text-softWhite placeholder-gray-400" 
                      placeholder="Doe" 
                      required 
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm mb-2 text-softWhite font-medium">Email Address</label>
                  <input 
                    type="email" 
                    className="w-full px-4 py-3 rounded-xl bg-cyberBlue/60 border border-neonAqua/40 focus:outline-none focus:ring-2 focus:ring-neonAqua/70 transition-all text-softWhite placeholder-gray-400" 
                    placeholder="john.doe@company.com" 
                    required 
                  />
                </div>
                
                <div>
                  <label className="block text-sm mb-2 text-softWhite font-medium">Company</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 rounded-xl bg-cyberBlue/60 border border-neonAqua/40 focus:outline-none focus:ring-2 focus:ring-neonAqua/70 transition-all text-softWhite placeholder-gray-400" 
                    placeholder="Your Company Inc." 
                  />
                </div>
                
                <div>
                  <label className="block text-sm mb-2 text-softWhite font-medium">Message</label>
                  <textarea 
                    rows="5" 
                    className="w-full px-4 py-3 rounded-xl bg-cyberBlue/60 border border-neonAqua/40 focus:outline-none focus:ring-2 focus:ring-neonAqua/70 transition-all text-softWhite placeholder-gray-400 resize-none" 
                    placeholder="Tell us about your deployment challenges and how we can help..." 
                    required
                  ></textarea>
                </div>
                
                <button 
                  type="submit" 
                  className="w-full relative overflow-hidden px-6 py-4 rounded-xl bg-gradient-to-r from-electricBlue to-neonAqua text-cyberBlue font-semibold hover:shadow-lg transition-all duration-300 group"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <Send size={20} />
                    Send Message
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-neonAqua to-electricBlue opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </button>
              </form>

              {/* Contact Info */}
              <div className="mt-8 pt-6 border-t border-electricBlue/20 space-y-4">
                <div className="flex items-center gap-3 text-softWhite">
                  <Mail className="text-electricBlue" size={20} />
                  <span>hello@deployx.example</span>
                </div>
                <div className="flex items-center gap-3 text-softWhite">
                  <Phone className="text-electricBlue" size={20} />
                  <span>+1 (555) 123-4567</span>
                </div>
                <div className="flex items-center gap-3 text-softWhite">
                  <MapPin className="text-electricBlue" size={20} />
                  <span>221B Cyber Street, NetCity, NC 12345</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Google Map ✨ UPDATED SECTION ✨ */}
          <motion.div
            initial={{ opacity: 0, x: 20 }} 
            whileInView={{ opacity: 1, x: 0 }} 
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="rounded-2xl overflow-hidden border-trace h-full min-h-[500px]"
          >
            {/* This wrapper div handles the click-to-activate logic */}
            <div 
              className={`map-container ${isMapActive ? 'active' : ''}`}
              onClick={() => setIsMapActive(true)}
            >
              <div className="map-overlay">
                <p>Click to activate map</p>
              </div>
              <iframe
                title="DeployX Headquarters - Google Maps"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3770.6014441451616!2d72.8860211749775!3d19.0812531821244!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be7c8866a456c9f%3A0x8d1745d15baac575!2sDon%20Bosco%20Institute%20of%20Technology%2C%20Mumbai!5e0!3m2!1sen!2sin!4v1755793214980!5m2!1sen!2sin"
                className="w-full h-full"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </div>
          </motion.div>
        </div>

        {/* ... (rest of your component code is the same) ... */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-20"
        >
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 glass-light border-trace rounded-2xl">
              <div className="w-16 h-16 bg-electricBlue/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="text-electricBlue" size={32} />
              </div>
              <h4 className="text-xl font-semibold text-softWhite mb-2">Email Support</h4>
              <p className="text-gray-300 text-sm">Get help via email within 24 hours</p>
            </div>
            
            <div className="text-center p-6 glass-light border-trace rounded-2xl">
              <div className="w-16 h-16 bg-neonAqua/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="text-neonAqua" size={32} />
              </div>
              <h4 className="text-xl font-semibold text-softWhite mb-2">Phone Support</h4>
              <p className="text-gray-300 text-sm">Speak with our experts directly</p>
            </div>
            
            <div className="text-center p-6 glass-light border-trace rounded-2xl">
              <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="text-purple-400" size={32} />
              </div>
              <h4 className="text-xl font-semibold text-softWhite mb-2">Visit Us</h4>
              <p className="text-gray-300 text-sm">Schedule an in-person meeting</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
