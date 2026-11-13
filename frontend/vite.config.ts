import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // VITE_API_PROXY (frontend/.env) : adresse de l'API si elle n'écoute pas sur le port 8000
  const env = loadEnv(mode, process.cwd(), '')
  const api = env.VITE_API_PROXY || 'http://localhost:8000'
  // VITE_WS_PROXY : serveur Reverb local, exposé sous /reverb (utile derrière un tunnel HTTPS, comme en production)
  const ws = env.VITE_WS_PROXY || 'ws://localhost:8090'
  return {
    plugins: [react(), tailwindcss()],
    server: {
      // Port réservé à Palabre (5173 est souvent pris par d'autres projets)
      port: 5180,
      strictPort: true,
      // VITE_ALLOWED_HOSTS : noms d'hôte supplémentaires acceptés (ex. un tunnel HTTPS pour tester PayTech en local)
      allowedHosts: env.VITE_ALLOWED_HOSTS ? env.VITE_ALLOWED_HOSTS.split(',') : undefined,
      // Les appels /api sont redirigés vers l'API Laravel en développement
      proxy: {
        '/api': api,
        '/sanctum': api,
        '/reverb': { target: ws, ws: true, rewrite: (path) => path.replace(/^\/reverb/, '') },
      },
    },
  }
})
