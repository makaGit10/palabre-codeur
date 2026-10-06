import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Avatar, Flag } from '../components/Brand'
import { ChatComposer, ChatThread } from '../components/Chat'
import { Icon } from '../components/Icon'
import { useToast } from '../components/toastContext'
import { errorMessage } from '../lib/api'
import { COUNTRY_NAMES, timeAgo } from '../lib/format'
import { listConversations, sendDirectMessage, thread } from '../services/messaging'

export default function Messages() {
  const userId = Number(useParams().userId) || null
  const toast = useToast()
  const queryClient = useQueryClient()

  const { data: conversations, isLoading: listLoading } = useQuery({ queryKey: ['conversations'], queryFn: listConversations, refetchInterval: 8_000 })
  const { data: current, isLoading, isError, isSuccess } = useQuery({
    queryKey: ['thread', userId],
    queryFn: () => thread(userId!),
    enabled: !!userId,
    refetchInterval: 4_000,
  })

  // Ouvrir un fil marque les messages reçus comme lus côté serveur : on rafraîchit les compteurs une fois le fil chargé
  useEffect(() => {
    if (isSuccess) {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
  }, [userId, isSuccess, queryClient])

  const send = useMutation({
    mutationFn: (body: string) => sendDirectMessage(userId!, { body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['thread', userId] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
    onError: (e) => toast(errorMessage(e), 'bell'),
  })

  const list = conversations?.data ?? []
  const other = current?.user

  return (
    <div className="max-w-[1180px]">
      <div className="mb-4">
        <h1 className="text-[26px]">Messages</h1>
        <p className="mt-1 text-sm text-muted">Vos conversations privées avec les autres développeurs.</p>
      </div>

      <div className="grid items-start gap-5 md:grid-cols-[300px_minmax(0,1fr)]">
        <aside className={`rounded-[14px] border border-line bg-surface p-2 md:sticky md:top-7 ${userId ? 'hidden md:block' : ''}`}>
          {listLoading ? (
            <p className="py-6 text-center text-sm text-muted">Chargement…</p>
          ) : list.length ? (
            <nav aria-label="Conversations" className="flex flex-col gap-0.5">
              {list.map((c) => (
                <Link
                  key={c.id}
                  to={`/app/messages/${c.user.id}`}
                  className={`flex items-center gap-3 rounded-[10px] px-2.5 py-2 transition ${c.user.id === userId ? 'bg-green-soft' : 'hover:bg-sunk'}`}
                >
                  <Avatar user={c.user} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 truncate text-sm font-semibold">
                        {c.user.name} <Flag code={c.user.country} />
                      </span>
                      {c.lastMessage && <span className="text-[11px] whitespace-nowrap text-muted">{timeAgo(c.lastMessage.createdAt)}</span>}
                    </span>
                    {c.lastMessage && (
                      <span className={`block truncate text-xs ${c.unreadCount ? 'font-semibold text-ink' : 'text-muted'}`}>
                        {c.lastMessage.mine ? 'Vous : ' : ''}
                        {c.lastMessage.body}
                      </span>
                    )}
                  </span>
                  {c.unreadCount > 0 && (
                    <span className="grid size-5 flex-none place-items-center rounded-full bg-green text-[11px] font-bold text-green-ink">{c.unreadCount}</span>
                  )}
                </Link>
              ))}
            </nav>
          ) : (
            <p className="px-3 py-6 text-center text-sm text-muted">Pas encore de conversation. Écrivez à quelqu'un depuis son profil.</p>
          )}
        </aside>

        {userId ? (
          <section className="flex min-w-0 flex-col rounded-[14px] border border-line bg-bg">
            <header className="flex items-center gap-3 border-b border-line bg-surface px-4 py-3">
              <Link to="/app/messages" className="text-muted hover:text-ink md:hidden" aria-label="Toutes les conversations">
                <Icon name="left" />
              </Link>
              {other ? (
                <>
                  <Avatar user={other} size="sm" />
                  <div className="min-w-0">
                    <Link to={`/app/profil/${other.id}`} className="inline-flex items-center gap-1.5 text-sm font-bold hover:text-green">
                      {other.name} <Flag code={other.country} />
                    </Link>
                    <p className="text-xs text-muted">
                      {other.city}, {COUNTRY_NAMES[other.country]}
                    </p>
                  </div>
                </>
              ) : (
                <span className="text-sm text-muted">{isError ? 'Conversation introuvable' : 'Chargement…'}</span>
              )}
            </header>
            <div className="h-[calc(100dvh-330px)] min-h-[260px] overflow-y-auto px-3 md:h-[calc(100dvh-290px)]">
              <ChatThread
                items={current?.messages ?? []}
                loading={isLoading}
                emptyText={other ? `Dites bonjour à ${other.name.split(' ')[0]} !` : ''}
              />
            </div>
            <div className="border-t border-line bg-surface p-3">
              <ChatComposer onSend={(body) => send.mutate(body)} pending={send.isPending || !other} placeholder="Écrire un message…" />
            </div>
          </section>
        ) : (
          <section className="hidden rounded-[14px] border border-dashed border-line bg-surface px-6 py-16 text-center md:block">
            <Icon name="mail" className="mx-auto size-8 text-muted" />
            <p className="mt-3 font-display text-lg">Choisissez une conversation</p>
            <p className="mt-1 text-sm text-muted">Ou écrivez à un développeur depuis son profil.</p>
          </section>
        )}
      </div>
    </div>
  )
}
