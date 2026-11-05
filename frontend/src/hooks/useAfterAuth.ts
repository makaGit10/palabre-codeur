import { useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import type { Me } from '../types'

// Après connexion ou inscription : retour à la page demandée, sinon le fil ; vérification de l'e-mail d'abord si besoin
export function useAfterAuth() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const from = (location.state as { from?: string } | null)?.from ?? '/app'
  return (me: Me) => {
    queryClient.setQueryData(['me'], me)
    queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'me' })
    if (!me.emailVerified) navigate('/verification', { replace: true, state: { from } })
    else navigate(from, { replace: true })
  }
}
