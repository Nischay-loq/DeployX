import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'

export default function Navbar() {
  const items = ['Home','Features','Services','Reviews','Contact Us']
  const [active, setActive] = useState('Home')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

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

  const handleNavClick = (item) => {
    setActive(item)
    setIsMobileMenuOpen(false)
  }

  return (
    <nav className="w-full fixed top-0 z-50 bg-cyberBlue/60 backdrop-blur-md text-softWhite px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo/Brand */}
        <div className="text-xl font-bold text-electricBlue">DeployX</div>

        {/* Desktop Navigation */}
        <div className="navbar-desktop">
          <ul className="flex gap-8">
            {items.map(i => (
              <li key={i}
                className={`relative cursor-pointer ${active===i?'text-electricBlue':''}`}
                onClick={()=>setActive(i)}
              >
                <a href={`#${getSectionId(i)}`}>{i}</a>
                <span className="absolute left-0 -bottom-1 h-[2px] w-0 bg-electricBlue transition-all duration-300 group-hover:w-full hover:w-full"></span>
              </li>
            ))}
          </ul>
        </div>

        {/* Login Button */}
        <div className="navbar-desktop">
          <Link 
            to="/login"
            className="px-4 py-2 border border-electricBlue rounded-lg text-electricBlue hover:bg-electricBlue hover:text-cyberBlue transition-all"
          >
            Login
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <div className="navbar-mobile">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-electricBlue hover:bg-electricBlue/20 rounded-lg transition-all"
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="navbar-mobile absolute top-full left-0 w-full bg-cyberBlue/95 backdrop-blur-md border-t border-electricBlue/20">
          <ul className="px-6 py-4 space-y-4">
            {items.map(i => (
              <li key={i}>
                <a 
                  href={`#${getSectionId(i)}`}
                  className={`block py-2 px-4 rounded-lg transition-all ${
                    active === i 
                      ? 'text-electricBlue bg-electricBlue/20' 
                      : 'text-softWhite hover:bg-electricBlue/10'
                  }`}
                  onClick={() => handleNavClick(i)}
                >
                  {i}
                </a>
              </li>
            ))}
            <li className="pt-4 border-t border-electricBlue/20">
              <Link 
                to="/login"
                className="block w-full text-center px-4 py-2 border border-electricBlue rounded-lg text-electricBlue hover:bg-electricBlue hover:text-cyberBlue transition-all"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Login
              </Link>
            </li>
          </ul>
        </div>
      )}
    </nav>
  )
}
