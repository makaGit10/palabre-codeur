import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useI18n } from '../i18n'

// Pages réservées aux membres : sinon, direction la connexion, puis retour à la page demandée
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()
  const location = useLocation()
  const { t } = useI18n()

  if (isLoading) return <p className="py-16 text-center text-muted">{t('common.loading')}</p>
  if (!user) return <Navigate to="/connexion" replace state={{ from: location.pathname }} />
  return children
}
