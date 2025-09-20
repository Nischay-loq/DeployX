import Navbar from '../components/Navbar.jsx'
import Hero from '../components/Hero.jsx'
import Features from '../components/Features.jsx'
import Services from '../components/Services.jsx'
import Ratings from '../components/Ratings.jsx'
import Contact from '../components/Contact.jsx'
import Footer from '../components/Footer.jsx'
import ParticlesBackground from '../components/ParticlesBackground.jsx'

export default function Home() {
  return (
    <div className="relative bg-cyberBlue">
      <Navbar />
      <Hero />
      {/* Particles excluded from hero by respawning below viewport */}
      <ParticlesBackground />
      <main className="relative z-10">
        <div className="pt-20">
          <Features />
          <Services />
          <Ratings />
          <Contact />
        </div>
      </main>
      <Footer />
    </div>
  )
}
