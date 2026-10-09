import type { ReactNode } from 'react'
import { useServiceStatus } from '../lib/status'
import { MaintenancePage } from '../pages/StatusPage'

// Pendant une maintenance de l'API, toute l'application laisse place à une page dédiée qui réessaie seule
export function MaintenanceGate({ children }: { children: ReactNode }) {
  return useServiceStatus() === 'maintenance' ? <MaintenancePage /> : children
}
