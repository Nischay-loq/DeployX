/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        electricBlue: '#00A8FF',
        cyberBlue: '#001F3F',
        neonAqua: '#00FFF7',
        steelGrey: '#2E2E2E',
        softWhite: '#F5F5F5',
      },
      boxShadow: {
        glow: '0 0 15px #00FFF7, 0 0 30px #00A8FF',
      },
      backgroundImage: {
        'grid-circuit': 'radial-gradient(circle at center, rgba(0,168,255,0.08) 0 1px, transparent 1px), radial-gradient(circle at center, rgba(0,255,247,0.06) 0 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
}
