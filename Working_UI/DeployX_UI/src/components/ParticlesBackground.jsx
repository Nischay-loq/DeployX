import { useEffect, useRef } from 'react'

export default function ParticlesBackground() {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    let w = canvas.width = window.innerWidth
    let h = canvas.height = document.body.scrollHeight // cover entire page height
    const count = Math.min(140, Math.floor(w/12))
    const particles = Array.from({length: count}).map(()=> ({
      x: Math.random()*w,
      y: (Math.random()*h) + window.innerHeight, // start below hero (hides in hero view)
      r: Math.random()*1.8 + 0.4,
      vx: (Math.random()-0.5)*0.2,
      vy: - (Math.random()*0.3 + 0.15)
    }))

    const resize = () => {
      w = canvas.width = window.innerWidth
      h = canvas.height = document.body.scrollHeight
    }
    window.addEventListener('resize', resize)

    let raf
    const draw = () => {
      ctx.clearRect(0,0,w,h)
      for (const p of particles) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI*2)
        ctx.fillStyle = 'rgba(0,255,247,0.6)'
        ctx.shadowBlur = 8
        ctx.shadowColor = '#00A8FF'
        ctx.fill()
        p.x += p.vx
        p.y += p.vy
        if (p.y < window.innerHeight) { // don't render inside hero; respawn below
          p.y = window.innerHeight + Math.random()*(h-window.innerHeight)
          p.x = Math.random()*w
        }
        if (p.x<0) p.x = w
        if (p.x>w) p.x = 0
      }
      raf = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(raf)
    }
  }, [])

  return <canvas ref={ref} className="fixed top-0 left-0 particles -z-10"></canvas>
}
