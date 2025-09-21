import { useState } from 'react'
import Navbar from '../components/Navbar.jsx'
import Hero from '../components/Hero.jsx'
import Features from '../components/Features.jsx'
import Services from '../components/Services.jsx'
import Ratings from '../components/Ratings.jsx'
import Contact from '../components/Contact.jsx'
import Footer from '../components/Footer.jsx'
import ParticlesBackground from '../components/ParticlesBackground.jsx'
import AuthModal from '../components/AuthModal.jsx'

export default function Home() {
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState('signin')

  const openAuthModal = (mode = 'signin') => {
    setAuthMode(mode)
    setAuthModalOpen(true)
  }

  const closeAuthModal = () => {
    setAuthModalOpen(false)
  }

  return (
    <div className="relative bg-gray-900 overflow-hidden transition-colors duration-300">
      {/* Navigation */}
      <Navbar onOpenAuth={openAuthModal} />
      
      {/* Hero Section */}
      <Hero onOpenAuth={openAuthModal} />
      
      {/* Particles Background - Only for sections below hero */}
      <div className="relative">
        <ParticlesBackground />
        
        {/* Main Content Sections */}
        <main className="relative z-10 space-y-20">
          <Features />
          <Services />
          <Ratings />
          <Contact />
        </main>
      </div>
      
      {/* Footer */}
      <Footer />
      
      {/* Auth Modal */}
      <AuthModal 
        isOpen={authModalOpen}
        onClose={closeAuthModal}
        initialMode={authMode}
      />
      
      {/* Background Effects */}
      <div className="fixed inset-0 -z-10">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"></div>
        
        {/* Subtle Grid Pattern */}
        <div className="absolute inset-0 grid-pattern opacity-5"></div>
        
        {/* Radial Gradients for Depth */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-cyan/10 rounded-full blur-3xl"></div>
      </div>
    </div>
  )
}
