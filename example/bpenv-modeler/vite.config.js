import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: [
      '5174-iyshibp2l4h67ue67g6k7-af56deff.manus.computer',
      '.manus.computer'
    ]
  }
})
