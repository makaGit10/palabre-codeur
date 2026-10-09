import { useSyncExternalStore } from 'react'

// État global du service, alimenté par le client HTTP : maintenance (503 « maintenance ») ou serveur injoignable.
// Une page élégante remplace alors l'application, et réessaie toute seule.
export type ServiceStatus = 'ok' | 'maintenance'

let status: ServiceStatus = 'ok'
const listeners = new Set<() => void>()

export function setServiceStatus(next: ServiceStatus) {
  if (next === status) return
  status = next
  listeners.forEach((l) => l())
}

export function useServiceStatus(): ServiceStatus {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => status,
  )
}
