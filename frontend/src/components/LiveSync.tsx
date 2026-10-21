import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../hooks/useAuth'
import { useLiveData } from '../hooks/useLiveData'

// Rubriques du signal temps réel → clés React Query à recharger. Le rechargement est silencieux :
// les listes affichées restent à l'écran (y compris les pages déjà chargées), les filtres, la recherche
// et les fenêtres ouvertes sont conservés, et un formulaire en cours de saisie n'est jamais touché.
// La messagerie et les notifications gardent leur propre rafraîchissement.
const QUERY_KEYS: Record<string, string[]> = {
  questions: ['questions', 'question', 'stats'],
  snippets: ['snippets', 'stats'],
  rooms: ['rooms', 'room'],
  wallet: ['wallet', 'me'],
  members: ['leaderboard', 'stats', 'profile', 'members', 'me'],
  moderation: ['moderation'],
}

/** À placer une fois dans la mise en page : tous les écrans affichant des données en profitent */
export function LiveSync() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  useLiveData(
    Object.keys(QUERY_KEYS),
    (topics) => {
      const keys = new Set(topics.flatMap((topic) => QUERY_KEYS[topic] ?? []))
      return Promise.all([...keys].map((key) => queryClient.invalidateQueries({ queryKey: [key] })))
    },
    { actorId: user?.id },
  )
  return null
}
