import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React stack loaded once and cached across deploys
          vendor: ['react', 'react-dom', 'react-router-dom'],
          // Heavy libs pulled in by the dashboard / landing page
          charts: ['framer-motion'],
          sheets: ['xlsx'],
          terminal: ['@xterm/xterm', '@xterm/addon-fit', '@xterm/addon-web-links'],
          realtime: ['socket.io-client'],
        },
      },
    },
  },
})
