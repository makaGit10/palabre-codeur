import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

// Pages réservées aux membres : sinon, direction la connexion, puis retour à la page demandée
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <p className="py-16 text-center text-muted">Chargement…</p>
  if (!user) return <Navigate to="/connexion" replace state={{ from: location.pathname }} />
  return children
}
