import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X, ChevronDown } from 'lucide-react'

export default function Navbar({ onOpenAuth }) {
  const items = ['Home','Features','Services','Reviews','Contact Us']
  const [active, setActive] = useState('Home')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  // Update scrolled state for nav background
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const getSectionId = (item) => {
    switch(item) {
      case 'Home': return 'home'
      case 'Features': return 'features'
      case 'Services': return 'services'
      case 'Reviews': return 'reviews'
      case 'Contact Us': return 'contactus'
      default: return item.toLowerCase().replace(/\s+/g,'')
    }
  }

  // Smooth scroll and set active link
  const scrollToSection = (id, item) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActive(item)
    }
  }

  // Close mobile menu and scroll
  const handleNavClick = (item) => {
    const id = getSectionId(item)
    setIsMobileMenuOpen(false)
    scrollToSection(id, item)
  }

  // Scrollspy: observe sections and update active nav item
  useEffect(() => {
    const sectionIds = items.map(getSectionId)
    const observers = []

    const options = {
      root: null,
      rootMargin: '0px 0px -40% 0px', // trigger when section is near top/mid
      threshold: 0
    }

    const callback = (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id
          // find item that maps to this id
          const matched = items.find(it => getSectionId(it) === id)
          if (matched) setActive(matched)
        }
      })
    }

    const io = new IntersectionObserver(callback, options)
    sectionIds.forEach(id => {
      const el = document.getElementById(id)
      if (el) {
        io.observe(el)
        observers.push(el)
      }
    })

    return () => {
      if (io) observers.forEach(el => io.unobserve(el))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <nav className={`w-full fixed top-0 z-50 transition-all duration-300 ${
      isScrolled 
        ? 'bg-gray-900/95 backdrop-blur-md shadow-lg border-b border-gray-800' 
        : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo/Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-accent-cyan rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xl font-display">DX</span>
            </div>
            <div className="text-2xl font-bold font-display bg-gradient-to-r from-primary-400 to-accent-cyan bg-clip-text text-transparent">
              DeployX
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="navbar-desktop">
            <ul className="flex items-center space-x-1">
              {items.map(item => (
                <li key={item} className="relative">
                  <a 
                    href={`#${getSectionId(item)}`}
                    className={`nav-link-dark transition-all duration-200 hover:text-primary-400 ${
                      active === item ? 'text-primary-400 bg-primary-900/30' : 'text-gray-300'
                    }`}
                    onClick={() => setActive(item)}
                  >
                    {item}
                  </a>
                  {active === item && (
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary-400 rounded-full"></div>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Desktop CTA */}
          <div className="navbar-desktop flex items-center space-x-4">
            <button 
              onClick={() => onOpenAuth('signin')}
              className="text-gray-300 hover:text-white font-medium transition-colors"
            >
              Sign In
            </button>
            <button 
              onClick={() => onOpenAuth('signup')}
              className="btn-primary"
            >
              Get Started
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="navbar-mobile">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="navbar-mobile absolute top-full left-0 right-0 bg-gray-900/98 backdrop-blur-md border-t border-gray-800 shadow-xl animate-slide-down">
            <div className="px-6 py-6 space-y-6">
              {/* Mobile Navigation */}
              <div className="space-y-3">
                {items.map(item => (
                  <a 
                    key={item}
                    href={`#${getSectionId(item)}`}
                    className={`block py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                      active === item 
                        ? 'text-primary-400 bg-primary-900/30 border border-primary-500/30' 
                        : 'text-gray-300 hover:text-white hover:bg-gray-800'
                    }`}
                    onClick={() => handleNavClick(item)}
                  >
                    {item}
                  </a>
                ))}
              </div>

              {/* Mobile CTAs */}
              <div className="pt-6 border-t border-gray-800 space-y-4">
                <button 
                  onClick={() => {
                    onOpenAuth('signin');
                    setIsMobileMenuOpen(false);
                  }}
                  className="block w-full text-center py-3 px-4 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg font-medium transition-all duration-200"
                >
                  Sign in
                </button>
                <button 
                  onClick={() => {
                    onOpenAuth('signup');
                    setIsMobileMenuOpen(false);
                  }}
                  className="block w-full text-center btn-primary"
                >
                  Get Started
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
