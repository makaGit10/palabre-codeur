import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Avatar, Flag } from '../components/Brand'
import { ChatComposer, ChatThread, type ChatActions, type ComposerPayload } from '../components/Chat'
import { Icon } from '../components/Icon'
import { useToast } from '../components/toastContext'
import { useAuth } from '../hooks/useAuth'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useI18n } from '../i18n'
import { errorMessage } from '../lib/api'
import { timeAgo } from '../lib/format'
import { deleteMessage, editMessage, listConversations, listRooms, reactToMessage, searchUsers, sendDirectMessage, thread } from '../services/messaging'
import type { CountryCode, Room, User } from '../types'

export default function Messages() {
  const { t, country } = useI18n()
  const { user: me } = useAuth()
  const userId = Number(useParams().userId) || null
  const [search, setSearch] = useState('')
  const searching = search.trim().length >= 2
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

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['thread', userId] })
    queryClient.invalidateQueries({ queryKey: ['conversations'] })
  }
  const fail = (e: unknown) => toast(errorMessage(e), 'bell')
  const send = useMutation({ mutationFn: (p: ComposerPayload) => sendDirectMessage(userId!, { body: p.body }), onSuccess: refresh, onError: fail })
  const edit = useMutation({ mutationFn: (v: { id: number; body: string }) => editMessage('direct', v.id, v.body), onSuccess: refresh, onError: fail })
  const remove = useMutation({ mutationFn: (id: number) => deleteMessage('direct', id), onSuccess: refresh, onError: fail })
  const react = useMutation({ mutationFn: (v: { id: number; emoji: string }) => reactToMessage('direct', v.id, v.emoji), onSuccess: refresh, onError: fail })
  const actions: ChatActions = {
    onEdit: (id, body) => edit.mutate({ id, body }),
    onDelete: (id) => remove.mutate(id),
    onReact: (id, emoji) => react.mutate({ id, emoji }),
  }

  const list = conversations?.data ?? []
  const other = current?.user

  return (
    <div className="max-w-[1180px]">
      <div className="mb-4">
        <h1 className="text-[26px]">{t('msg.title')}</h1>
        <p className="mt-1 text-sm text-muted">{t('msg.subtitle')}</p>
      </div>

      <div className="grid items-start gap-5 md:grid-cols-[300px_minmax(0,1fr)]">
        <aside className={`rounded-[14px] border border-line bg-surface p-2 md:sticky md:top-7 ${userId ? 'hidden md:block' : ''}`}>
          <MemberSearch q={search} onChange={setSearch} />
          {listLoading ? (
            <p className="py-6 text-center text-sm text-muted">{t('common.loading')}</p>
          ) : list.length ? (
            <nav aria-label={t('msg.nav')} className="flex flex-col gap-0.5">
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
                        {c.lastMessage.mine ? t('msg.you') : ''}
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
            <p className="px-3 py-6 text-center text-sm text-muted">{t('msg.empty_list')}</p>
          )}
          {!searching && <Suggestions country={me?.country} />}
        </aside>

        {userId ? (
          <section className="flex min-w-0 flex-col rounded-[14px] border border-line bg-bg">
            <header className="flex items-center gap-3 border-b border-line bg-surface px-4 py-2.5">
              <Link to="/app/messages" className="text-muted hover:text-ink md:hidden" aria-label={t('msg.all')}>
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
                      {other.city}, {country(other.country)}
                    </p>
                  </div>
                </>
              ) : (
                <span className="text-sm text-muted">{isError ? t('msg.not_found') : t('common.loading')}</span>
              )}
            </header>
            <div className="h-[calc(100dvh-330px)] min-h-[260px] overflow-y-auto px-3 md:h-[calc(100dvh-290px)]">
              <ChatThread
                items={current?.messages ?? []}
                loading={isLoading}
                actions={actions}
                emptyText={other ? t('msg.say_hi', { name: other.name.split(' ')[0] }) : ''}
              />
            </div>
            <div className="border-t border-line bg-surface p-3">
              <ChatComposer onSend={(p) => send.mutate(p)} pending={send.isPending || !other} placeholder={t('msg.placeholder')} />
            </div>
          </section>
        ) : (
          <section className="hidden rounded-[14px] border border-dashed border-line bg-surface px-6 py-16 text-center md:block">
            <Icon name="mail" className="mx-auto size-8 text-muted" />
            <p className="mt-3 font-display text-lg">{t('msg.choose')}</p>
            <p className="mt-1 text-sm text-muted">{t('msg.choose_text')}</p>
          </section>
        )}
      </div>
    </div>
  )
}

// En tête de la liste : chercher un développeur par son nom pour lui écrire (les résultats s'affichent dessous)
function MemberSearch({ q, onChange }: { q: string; onChange: (q: string) => void }) {
  const { t } = useI18n()
  const debounced = useDebouncedValue(q.trim(), 250)
  const searching = debounced.length >= 2
  const { data: found = [], isFetching } = useQuery({ queryKey: ['users-search', debounced, ''], queryFn: () => searchUsers(debounced), enabled: searching, staleTime: 30_000 })

  return (
    <div className="mb-2 border-b border-line pb-2">
      <label className="flex items-center gap-2 rounded-[10px] border border-line bg-bg px-3 py-1.5">
        <Icon name="search" className="size-4 text-muted" />
        <input
          type="search"
          value={q}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t('msg.find')}
          aria-label={t('msg.find')}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
        />
      </label>
      {searching &&
        (found.length ? (
          <div className="mt-1 flex flex-col gap-0.5">
            {found.map((u) => (
              <PersonLink key={u.id} user={u} onClick={() => onChange('')} />
            ))}
          </div>
        ) : (
          <p className="px-2.5 py-2 text-sm text-muted">{isFetching ? t('common.loading') : t('msg.nobody')}</p>
        ))}
    </div>
  )
}

function PersonLink({ user, onClick }: { user: User; onClick?: () => void }) {
  return (
    <Link to={`/app/messages/${user.id}`} onClick={onClick} className="flex items-center gap-2.5 rounded-[10px] px-2.5 py-1.5 hover:bg-sunk">
      <Avatar user={user} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 truncate text-sm font-semibold">
          {user.name} <Flag code={user.country} />
        </span>
        {user.city && <span className="block truncate text-xs text-muted">{user.city}</span>}
      </span>
    </Link>
  )
}

// Sous les conversations : les développeurs les plus actifs de son pays (« d'ici ») et ses groupes privés
function Suggestions({ country }: { country?: CountryCode }) {
  const { t } = useI18n()
  const { data: nearby = [] } = useQuery({ queryKey: ['users-search', '', country], queryFn: () => searchUsers('', country), enabled: !!country, staleTime: 60_000 })
  const { data: rooms = [] } = useQuery({ queryKey: ['rooms'], queryFn: listRooms, staleTime: 60_000 })
  const groups = rooms.filter((r: Room) => r.isPrivate)
  if (!nearby.length && !groups.length) return null
  const heading = (text: string) => <h2 className="mt-3 mb-1 px-2.5 text-[11px] font-bold tracking-wider text-muted uppercase">{text}</h2>

  return (
    <div className="mt-2 border-t border-line pt-1">
      {nearby.length > 0 && (
        <>
          {heading(t('msg.nearby'))}
          <div className="flex flex-col gap-0.5">
            {nearby.slice(0, 5).map((u) => (
              <PersonLink key={u.id} user={u} />
            ))}
          </div>
        </>
      )}
      {groups.length > 0 && (
        <>
          {heading(t('msg.groups'))}
          <div className="flex flex-col gap-0.5">
            {groups.map((g: Room) => (
              <Link key={g.id} to={`/app/salons/${g.slug}`} className="flex items-center gap-2.5 rounded-[10px] px-2.5 py-1.5 text-sm font-semibold hover:bg-sunk">
                <Icon name="lock" className="size-3.5 text-muted" />
                <span className="min-w-0 flex-1 truncate">{g.name}</span>
                {g.unreadCount > 0 && <span className="grid size-5 place-items-center rounded-full bg-green text-[11px] font-bold text-green-ink">{g.unreadCount}</span>}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
