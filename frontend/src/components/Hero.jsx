import { ArrowRight, Download, Shield, Zap, Globe } from 'lucide-react';

export default function Hero({ onOpenAuth }) {
  const handleVideoError = (e) => {
    e.target.style.display = 'none';
  };

  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute w-full h-full object-cover opacity-50"
          src="/hero-video.mp4"
          poster="/hero-poster.jpg"
          onError={handleVideoError}
        >
          <source src="/hero-video.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/80 via-gray-900/70 to-gray-800/80"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-transparent to-transparent"></div>
        
        <div className="absolute inset-0 grid-pattern opacity-20"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 text-center">
        <div className="max-w-4xl mx-auto">

          <h1 className="text-headline font-display bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent mt-6 mb-6 animate-slide-up">
            DeployX
          </h1>

          <p className="text-subheadline text-gray-300 mb-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Simple deployment management system
          </p>

          <p className="text-body-large text-gray-400 max-w-2xl mx-auto mb-12 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            A student project for managing software deployments across multiple systems. 
            Built to learn about remote access and automation concepts.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <button
              onClick={() => onOpenAuth('signup')}
              className="btn-cta group w-full sm:w-auto min-w-[200px] flex items-center justify-center"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
            </button>
            
            <a 
              href="/downloads/deployx-agent.exe" 
              download
              className="btn-outline group bg-white/5 border-white/20 text-white hover:bg-white hover:text-gray-900 w-full sm:w-auto min-w-[200px] flex items-center justify-center px-6 py-3 rounded-lg font-medium transition-all duration-200"
            >
              <Download className="w-5 h-5 mr-2 transition-transform group-hover:translate-y-1" />
              <span>Download Agent (.exe)</span>
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <div className="glass-panel rounded-xl p-6 text-left hover-lift">
              <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Secure Access</h3>
              <p className="text-gray-400 text-sm">Basic security protocols for safe remote connections.</p>
            </div>

            <div className="glass-panel rounded-xl p-6 text-left hover-lift">
              <div className="w-12 h-12 bg-gradient-to-r from-accent-cyan to-primary-500 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Simple Deployment</h3>
              <p className="text-gray-400 text-sm">Easy-to-use interface for managing multiple systems.</p>
            </div>

            <div className="glass-panel rounded-xl p-6 text-left hover-lift">
              <div className="w-12 h-12 bg-gradient-to-r from-accent-purple to-accent-cyan rounded-lg flex items-center justify-center mb-4">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Remote Management</h3>
              <p className="text-gray-400 text-sm">Connect to and manage remote systems from one place.</p>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-gray-400 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-gradient-to-b from-primary-400 to-transparent rounded-full mt-2 animate-pulse"></div>
          </div>
        </div>
      </div>
    </section>
  )
}
