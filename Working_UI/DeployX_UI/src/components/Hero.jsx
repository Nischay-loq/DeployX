import { useNavigate } from 'react-router-dom';

export default function Hero() {
  const navigate = useNavigate();

  return (
    <section id="home" className="relative w-full h-screen flex items-center justify-center overflow-hidden">
      <video
        autoPlay
        loop
        muted
        className="absolute w-full h-full object-cover"
        src="/hero-video.mp4"  // replace with your uploaded video file in /public
      />
      <div className="absolute inset-0 bg-black/40"></div>

      <div className="relative z-10 flex flex-col items-center justify-center text-center text-softWhite px-6">
        <h1 style={{
          fontSize: 'clamp(2.5rem, 8vw, 7rem)',
          fontWeight: 'bold',
          marginBottom: '1.5rem',
          fontFamily: 'Orbitron, monospace',
          textShadow: '0 0 10px #00A8FF, 0 0 20px #00A8FF, 0 0 30px #00A8FF'
        }}>
          DeployX
        </h1>
        <p className="text-2xl text-electricBlue italic mb-2">"Command. Connect. Deploy."</p>
        <p className="max-w-2xl mb-8 opacity-90">"Your intelligent bulk software deployment system"</p>
        <button
          onClick={() => navigate('/signup')}
          className="glass btn-pulse px-8 py-3 rounded-2xl text-neonAqua font-semibold hover:shadow-glow transition-all border-light-animate"
        >
          Get Started
        </button>
      </div>
    </section>
  )
}
