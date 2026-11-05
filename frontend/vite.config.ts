import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // VITE_API_PROXY (frontend/.env) : adresse de l'API si elle n'écoute pas sur le port 8000
  const api = loadEnv(mode, process.cwd(), '').VITE_API_PROXY || 'http://localhost:8000'
  return {
  plugins: [react(), tailwindcss()],
  server: {
    // Port réservé à Palabre (5173 est souvent pris par d'autres projets)
    port: 5180,
    strictPort: true,
    // Les appels /api sont redirigés vers l'API Laravel en développement
    proxy: {
      '/api': api,
      '/sanctum': api,
    },
  },
  }
})
