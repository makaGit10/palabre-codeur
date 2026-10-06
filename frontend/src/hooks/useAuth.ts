import { useQuery } from '@tanstack/react-query'
import { getMe } from '../services/auth'

// Personne connectée (ou null). Partagé par toute l'application via le cache de React Query.
export function useAuth() {
  const { data, isLoading } = useQuery({ queryKey: ['me'], queryFn: getMe, staleTime: 5 * 60_000 })
  return { user: data ?? null, isLoading }
}
