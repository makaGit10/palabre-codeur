// Temps réel : une seule connexion WebSocket (Laravel Reverb, protocole Pusher) pour toute l'application.
// Le serveur n'envoie jamais de données, seulement « ces rubriques ont changé » ; les écrans rechargent
// ensuite par l'API habituelle. Sans serveur temps réel, tout continue de fonctionner comme avant.
import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import { api } from './api'

export interface LiveSignal {
  topics: string[]
  actorId: number | null
  socketId: string | null
  at: string
}

interface LiveConfig {
  enabled: boolean
  key: string | null
  host: string
  port: number
  scheme: 'http' | 'https'
  path: string
  channel: string
}

type Listener = (signal: LiveSignal) => void

let echo: Echo<'reverb'> | null = null
let starting: Promise<void> | null = null
const listeners = new Set<Listener>()

// Créée à la première demande, puis conservée : la bibliothèque se reconnecte d'elle-même si le serveur coupe
function start(): Promise<void> {
  if (starting) return starting
  starting = (async () => {
    try {
      const { data } = await api.get<LiveConfig>('/live')
      if (!data.enabled || !data.key) return
      ;(window as unknown as { Pusher: typeof Pusher }).Pusher = Pusher
      echo = new Echo({
        broadcaster: 'reverb',
        key: data.key,
        wsHost: data.host,
        wsPort: data.port,
        wssPort: data.port,
        wsPath: data.path ? `/${data.path}` : undefined,
        forceTLS: data.scheme === 'https',
        enabledTransports: ['ws', 'wss'],
      })
      echo.channel(data.channel).listen('.changed', (signal: LiveSignal) => {
        for (const listener of listeners) listener(signal)
      })
      const connection = (echo.connector as { pusher: Pusher }).pusher.connection
      connection.bind('state_change', ({ current }: { current: string }) => {
        window.__palabreLive = { reloads: 0, topics: [], ...window.__palabreLive, connected: current === 'connected' }
      })
      // Chaque requête porte l'identifiant de notre connexion : le serveur le renvoie dans le signal,
      // ce qui permet d'ignorer nos propres modifications (notre écran est déjà à jour)
      api.interceptors.request.use((config) => {
        const id = echo?.socketId()
        if (id) config.headers.set('X-Socket-ID', id)
        return config
      })
    } catch {
      // pas de temps réel disponible : les écrans gardent leur fonctionnement habituel
    }
  })()
  return starting
}

export function subscribeLive(listener: Listener): () => void {
  listeners.add(listener)
  void start()
  return () => {
    listeners.delete(listener)
  }
}

export function liveSocketId(): string | undefined {
  return echo?.socketId()
}
