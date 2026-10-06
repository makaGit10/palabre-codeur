import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Port réservé à Palabre (5173 est souvent pris par d'autres projets)
    port: 5180,
    strictPort: true,
    // Les appels /api sont redirigés vers l'API Laravel en développement
    proxy: {
      '/api': 'http://localhost:8000',
      '/sanctum': 'http://localhost:8000',
    },
  },
})
