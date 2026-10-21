import { useEffect, useRef } from 'react'
import { liveSocketId, subscribeLive, type LiveSignal } from '../lib/live'

// Plusieurs signaux rapprochés ne donnent qu'un seul rechargement
const GROUP_MS = 800

declare global {
  interface Window {
    // Compteur de rechargements déclenchés par le temps réel, lu par les tests de bout en bout
    __palabreLive?: { reloads: number; topics: string[]; connected?: boolean }
  }
}

/**
 * Branche un écran sur le temps réel : quand une autre personne modifie l'une des rubriques,
 * `reload` est appelé avec les rubriques touchées. Le rechargement est silencieux (c'est à l'appelant
 * de garder ce qui est affiché), ignore nos propres modifications, attend que l'onglet soit visible
 * et regroupe les signaux rapprochés.
 */
export function useLiveData(topics: string[], reload: (topics: string[]) => unknown, options: { actorId?: number | null } = {}) {
  const reloadRef = useRef(reload)
  const actorRef = useRef(options.actorId)
  useEffect(() => {
    reloadRef.current = reload
    actorRef.current = options.actorId
  })
  const key = topics.join(',')

  useEffect(() => {
    const wanted = new Set(key.split(',').filter(Boolean))
    let timer: number | undefined
    let pending = new Set<string>()

    const run = () => {
      timer = undefined
      if (pending.size === 0) return
      if (document.visibilityState === 'hidden') return // on attend que l'onglet redevienne visible
      const touched = [...pending]
      pending = new Set()
      window.__palabreLive = { ...window.__palabreLive, reloads: (window.__palabreLive?.reloads ?? 0) + 1, topics: touched }
      void Promise.resolve(reloadRef.current(touched)).catch(() => {
        // en cas d'erreur, on garde ce qui est déjà affiché
      })
    }
    const onSignal = (signal: LiveSignal) => {
      // Nos propres modifications : l'écran est déjà à jour. On reconnaît notre connexion ; si la requête
      // est partie avant qu'elle soit établie, on se rabat sur l'identifiant de l'auteur.
      if (signal.socketId ? signal.socketId === liveSocketId() : signal.actorId != null && signal.actorId === actorRef.current) return
      const touched = signal.topics.filter((t) => wanted.has(t))
      if (touched.length === 0) return
      for (const t of touched) pending.add(t)
      if (timer !== undefined) window.clearTimeout(timer)
      timer = window.setTimeout(run, GROUP_MS)
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible' && pending.size > 0 && timer === undefined) run()
    }

    const unsubscribe = subscribeLive(onSignal)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      unsubscribe()
      document.removeEventListener('visibilitychange', onVisible)
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [key])
}
