import { Mail, MapPin, Phone, Send, MessageSquare, Clock, Users } from 'lucide-react'
import { motion } from 'framer-motion'
import { useState } from 'react'

export default function Contact() {
  const [isMapActive, setIsMapActive] = useState(false)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    subject: '',
    message: ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
  }

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <section id="contactus" className="py-24 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"></div>
      <div className="absolute inset-0 grid-pattern opacity-5"></div>
      
      {/* Floating Background Elements */}
      <div className="absolute top-20 right-10 w-32 h-32 bg-primary-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 left-10 w-40 h-40 bg-accent-cyan/10 rounded-full blur-3xl animate-pulse"></div>

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
            Get In Touch
          </div>
          <h2 className="text-4xl md:text-5xl font-bold font-display text-white mb-6">
            Let's Build Something <span className="bg-gradient-to-r from-primary-400 to-accent-cyan bg-clip-text text-transparent">Amazing</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Ready to transform your deployment process? Our team is here to help you get started with DeployX.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-5 gap-12 items-start">
          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: -30 }} 
            whileInView={{ opacity: 1, x: 0 }} 
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-3"
          >
            <div className="card-dark h-full">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-accent-cyan rounded-xl flex items-center justify-center">
                  <Send className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">Send us a Message</h3>
                  <p className="text-gray-400">We'll get back to you within 24 hours</p>
                </div>
              </div>
              
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="form-label-dark">First Name *</label>
                    <input 
                      type="text" 
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className="form-input-dark focus-ring-dark" 
                      placeholder="John" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="form-label-dark">Last Name *</label>
                    <input 
                      type="text" 
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className="form-input-dark focus-ring-dark" 
                      placeholder="Doe" 
                      required 
                    />
                  </div>
                </div>
                
                <div>
                  <label className="form-label-dark">Email Address *</label>
                  <input 
                    type="email" 
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="form-input-dark focus-ring-dark" 
                    placeholder="john.doe@company.com" 
                    required 
                  />
                </div>
                
                <div>
                  <label className="form-label-dark">Company</label>
                  <input 
                    type="text" 
                    name="company"
                    value={formData.company}
                    onChange={handleInputChange}
                    className="form-input-dark focus-ring-dark" 
                    placeholder="Your Company Inc." 
                  />
                </div>

                <div>
                  <label className="form-label-dark">Subject</label>
                  <select 
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    className="form-input-dark focus-ring-dark"
                  >
                    <option value="">Select a topic</option>
                    <option value="sales">Sales Inquiry</option>
                    <option value="support">Technical Support</option>
                    <option value="partnership">Partnership</option>
                    <option value="demo">Request Demo</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="form-label-dark">Message *</label>
                  <textarea 
                    rows="6" 
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    className="form-input-dark focus-ring-dark resize-none" 
                    placeholder="Tell us about your deployment challenges and how we can help transform your infrastructure..."
                    required
                  ></textarea>
                </div>
                
                <button 
                  type="submit" 
                  className="w-full btn-cta group flex items-center justify-center gap-3"
                >
                  <Send className="w-5 h-5 transition-transform group-hover:translate-x-1 group-hover:rotate-[-10deg]" />
                  <span>Send Message</span>
                </button>
              </form>
            </div>
          </motion.div>

          {/* Contact Info & Map */}
          <motion.div
            initial={{ opacity: 0, x: 30 }} 
            whileInView={{ opacity: 1, x: 0 }} 
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-2 space-y-8"
          >
            {/* Contact Information */}
            <div className="card-dark">
              <h3 className="text-xl font-bold text-white mb-6">Contact Information</h3>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-primary-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-white mb-1">Email</h4>
                    <p className="text-gray-400 text-sm">contact@deployx.com</p>
                    <p className="text-gray-400 text-sm">support@deployx.com</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-accent-cyan/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5 text-accent-cyan" />
                  </div>
                  <div>
                    <h4 className="font-medium text-white mb-1">Phone</h4>
                    <p className="text-gray-400 text-sm">+91 82919 35109</p>
                    <p className="text-gray-500 text-xs">Mon-Fri, 9 AM - 6 PM IST</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-accent-purple/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-accent-purple" />
                  </div>
                  <div>
                    <h4 className="font-medium text-white mb-1">Address</h4>
                    <p className="text-gray-400 text-sm">Don Bosco Institute of Technology</p>
                    <p className="text-gray-400 text-sm">Kurla West, Mumbai - 400070</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Map */}
            <div className="bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-700">
              <div className="p-6 border-b border-gray-700">
                <h3 className="text-xl font-bold text-white">Visit Our College</h3>
                <p className="text-gray-400 text-sm mt-1">Don Bosco Institute of Technology, Mumbai</p>
              </div>
              <div className="h-64">
                <iframe
                  title="DeployX Location - Don Bosco Institute of Technology"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3770.6014441451616!2d72.8860211749775!3d19.0812531821244!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be7c8866a456c9f%3A0x8d1745d15baac575!2sDon%20Bosco%20Institute%20of%20Technology%2C%20Mumbai!5e0!3m2!1sen!2sin!4v1755793214980!5m2!1sen!2sin"
                  className="w-full h-full"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Support Options */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-20"
        >
          <h3 className="text-2xl font-bold text-white text-center mb-12">How We Can Help</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="card-dark text-center hover-lift group">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <MessageSquare className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-xl font-semibold text-white mb-3">24/7 Support</h4>
              <p className="text-gray-400 mb-4">Get instant help through our support portal with guaranteed response times.</p>
              <div className="text-sm text-green-400 font-medium">Average response: 2 hours</div>
            </div>
            
            <div className="card-dark text-center hover-lift group">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-xl font-semibold text-white mb-3">Expert Consultation</h4>
              <p className="text-gray-400 mb-4">Schedule a call with our deployment experts to optimize your infrastructure.</p>
              <div className="text-sm text-blue-400 font-medium">Free 30-min consultation</div>
            </div>
            
            <div className="card-dark text-center hover-lift group">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-xl font-semibold text-white mb-3">Implementation</h4>
              <p className="text-gray-400 mb-4">Get hands-on assistance with setup and migration from our engineering team.</p>
              <div className="text-sm text-purple-400 font-medium">Custom implementation plan</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
