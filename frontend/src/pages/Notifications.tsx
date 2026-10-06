import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Icon, type IconName } from '../components/Icon'
import { timeAgo } from '../lib/format'
import { listNotifications, markNotificationsRead } from '../services/messaging'
import type { AppNotification } from '../types'

const KIND_ICON: Record<AppNotification['kind'], IconName> = { answer: 'chat', accepted: 'check', bounty: 'coin', message: 'mail', mention: 'user', info: 'bell' }

export default function Notifications() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['notifications'], queryFn: listNotifications })

  // Ouvrir la page marque tout comme lu côté serveur. Dans le cache, seul le compteur passe à zéro :
  // les éléments gardent leur état « non lu » jusqu'au prochain rafraîchissement, le temps d'être vus.
  const { mutate: markRead, isPending, isSuccess } = useMutation({
    mutationFn: markNotificationsRead,
    onSuccess: () =>
      queryClient.setQueryData(['notifications'], (old: { data: AppNotification[]; unreadCount: number } | undefined) => old && { ...old, unreadCount: 0 }),
  })
  useEffect(() => {
    if (data && data.unreadCount > 0 && !isPending && !isSuccess) markRead()
  }, [data, isPending, isSuccess, markRead])

  return (
    <div className="max-w-[760px]">
      <div className="mb-5">
        <h1 className="text-[26px]">Notifications</h1>
        <p className="mt-1 text-sm text-muted">Réponses à vos questions, réponses validées, primes versées et messages reçus.</p>
      </div>

      {isLoading ? (
        <p className="py-10 text-center text-muted">Chargement…</p>
      ) : data?.data.length ? (
        <ol className="overflow-hidden rounded-[14px] border border-line bg-surface">
          {data.data.map((n) => {
            const fresh = !n.readAt
            const inner = (
              <>
                <span className={`grid size-9 flex-none place-items-center rounded-full ${fresh ? 'bg-green text-green-ink' : 'bg-sunk text-muted'}`}>
                  <Icon name={KIND_ICON[n.kind] ?? 'bell'} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm ${fresh ? 'font-bold' : 'font-semibold'}`}>{n.title}</span>
                  {n.body && <span className="block truncate text-[13px] text-muted">{n.body}</span>}
                  <span className="block text-xs text-muted">{timeAgo(n.createdAt)}</span>
                </span>
                {fresh && <span className="mt-2 size-2 flex-none rounded-full bg-green" aria-label="Nouveau" />}
              </>
            )
            const className = `flex items-start gap-3 border-b border-line px-4 py-3 last:border-0 ${fresh ? 'bg-green-soft/50' : ''} ${n.url ? 'hover:bg-sunk' : ''}`
            return (
              <li key={n.id}>
                {n.url ? (
                  <Link to={n.url} className={className}>
                    {inner}
                  </Link>
                ) : (
                  <div className={className}>{inner}</div>
                )}
              </li>
            )
          })}
        </ol>
      ) : (
        <div className="rounded-[14px] border border-dashed border-line bg-surface px-5 py-12 text-center text-muted">
          <Icon name="bell" className="mx-auto size-8" />
          <p className="mt-3">Rien pour l'instant. Posez une question ou aidez quelqu'un, et tout se passera ici.</p>
        </div>
      )}
    </div>
  )
}
