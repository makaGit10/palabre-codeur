import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { Flag } from '../components/Brand'
import { ChatComposer, ChatThread, type ChatActions, type ComposerPayload } from '../components/Chat'
import { CreateGroupDialog, GroupMembersDialog } from '../components/GroupDialogs'
import { Icon } from '../components/Icon'
import { useToast } from '../components/toastContext'
import { useAuth } from '../hooks/useAuth'
import { useI18n } from '../i18n'
import { errorMessage } from '../lib/api'
import { timeAgo } from '../lib/format'
import { deleteMessage, editMessage, listRooms, postRoomMessage, reactToMessage, roomMessages } from '../services/messaging'
import type { CountryCode, Room } from '../types'

// Salon par pays → drapeau
const ROOM_COUNTRY: Record<string, CountryCode> = { senegal: 'SN', 'cote-d-ivoire': 'CI', cameroun: 'CM', maroc: 'MA', 'burkina-faso': 'BF', mali: 'ML' }

// Entrée de la liste des salons : drapeau ou cadenas, dernier message, non-lus
function RoomLink({ r, active }: { r: Room; active: boolean }) {
  return (
    <Link
      to={`/app/salons/${r.slug}`}
      className={`flex items-center gap-2.5 rounded-[10px] px-3 py-1.5 transition ${active ? 'bg-green-soft text-green' : 'hover:bg-sunk'}`}
    >
      {ROOM_COUNTRY[r.slug] && <Flag code={ROOM_COUNTRY[r.slug]} />}
      {r.isPrivate && <Icon name="lock" className="size-3.5 text-muted" />}
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-sm ${r.unreadCount ? 'font-bold' : 'font-semibold'}`}>{r.name}</span>
        {r.lastMessage && (
          <span className="block truncate text-xs text-muted">
            {r.lastMessage.authorName.split(' ')[0]} : {r.lastMessage.body}
          </span>
        )}
      </span>
      {r.unreadCount > 0 ? (
        <span className="grid size-5 place-items-center rounded-full bg-green text-[11px] font-bold text-green-ink">{r.unreadCount}</span>
      ) : (
        r.messagesCount > 0 && <span className="text-xs text-muted tabular-nums">{r.messagesCount}</span>
      )}
    </Link>
  )
}

function RoomSection({ title, items, active, action }: { title: string; items: Room[]; active?: string; action?: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-1 flex items-center justify-between px-3 text-[11px] font-bold tracking-wider text-muted uppercase">
        {title}
        {action}
      </h2>
      <div className="flex flex-col gap-0.5">
        {items.map((r) => (
          <RoomLink key={r.id} r={r} active={r.slug === active} />
        ))}
      </div>
    </div>
  )
}

export default function Rooms() {
  const { t } = useI18n()
  const { slug } = useParams()
  const { user } = useAuth()
  const location = useLocation()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [members, setMembers] = useState(false)

  const { data: rooms = [], isLoading: roomsLoading } = useQuery({ queryKey: ['rooms'], queryFn: listRooms, refetchInterval: 30_000 })
  const room = rooms.find((r) => r.slug === slug)
  const { data: messages = [], isLoading, isError } = useQuery({
    queryKey: ['room', slug],
    queryFn: () => roomMessages(slug!),
    enabled: !!slug,
    refetchInterval: 4_000, // la discussion se rafraîchit toutes les 4 secondes
    retry: false,
  })
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['room', slug] })
    queryClient.invalidateQueries({ queryKey: ['rooms'] })
  }
  const fail = (e: unknown) => toast(errorMessage(e), 'bell')
  const send = useMutation({ mutationFn: (p: ComposerPayload) => postRoomMessage(slug!, { body: p.body, mentions: p.mentions }), onSuccess: refresh, onError: fail })
  const edit = useMutation({ mutationFn: (v: { id: number; body: string }) => editMessage('room', v.id, v.body), onSuccess: refresh, onError: fail })
  const remove = useMutation({ mutationFn: (id: number) => deleteMessage('room', id), onSuccess: refresh, onError: fail })
  const react = useMutation({ mutationFn: (v: { id: number; emoji: string }) => reactToMessage('room', v.id, v.emoji), onSuccess: refresh, onError: fail })
  const actions: ChatActions | undefined = user
    ? { onEdit: (id, body) => edit.mutate({ id, body }), onDelete: (id) => remove.mutate(id), onReact: (id, emoji) => react.mutate({ id, emoji }) }
    : undefined

  const topics = rooms.filter((r) => r.kind === 'topic')
  const countries = rooms.filter((r) => r.kind === 'country')
  const groups = rooms.filter((r) => r.isPrivate)

  const list = (
    <nav aria-label={t('nav.rooms')} className="flex flex-col gap-3.5">
      {user && (
        <RoomSection
          title={t('rm.my_groups')}
          items={groups}
          active={slug}
          action={
            <button onClick={() => setCreating(true)} title={t('rm.new_group')} aria-label={t('rm.new_group')} className="grid size-6 place-items-center rounded-md text-green hover:bg-green-soft">
              <Icon name="plus" className="size-4" />
            </button>
          }
        />
      )}
      {user && !groups.length && <p className="-mt-2 px-3 text-xs text-muted">{t('rm.no_groups')}</p>}
      <RoomSection title={t('rm.by_topic')} items={topics} active={slug} />
      <RoomSection title={t('rm.by_country')} items={countries} active={slug} />
    </nav>
  )

  return (
    <div className="max-w-[1180px]">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px]">{t('rm.title')}</h1>
          <p className="mt-1 text-sm text-muted">{t('rm.subtitle')}</p>
        </div>
      </div>

      <div className="grid items-start gap-5 md:grid-cols-[260px_minmax(0,1fr)]">
        <aside className={`rounded-[14px] border border-line bg-surface p-2.5 md:sticky md:top-7 ${slug ? 'hidden md:block' : ''}`}>
          {roomsLoading ? <p className="py-6 text-center text-sm text-muted">{t('rm.loading')}</p> : list}
        </aside>

        {slug ? (
          <section className="flex min-w-0 flex-col rounded-[14px] border border-line bg-bg">
            <header className="flex items-center gap-3 border-b border-line bg-surface px-4 py-2.5">
              <Link to="/app/salons" className="text-muted hover:text-ink md:hidden" aria-label={t('rm.all')}>
                <Icon name="left" />
              </Link>
              {room && ROOM_COUNTRY[room.slug] && <Flag code={ROOM_COUNTRY[room.slug]} />}
              {room?.isPrivate && <Icon name="lock" className="size-4 text-muted" />}
              <div className="min-w-0">
                <h2 className="truncate text-base">{room?.name ?? `#${slug}`}</h2>
                <p className="truncate text-xs text-muted">{room?.isPrivate ? t('rm.private_members', { n: room.membersCount ?? 0 }) : room?.description}</p>
              </div>
              <span className="ml-auto flex items-center gap-1.5">
                {room?.lastMessage && <span className="hidden text-xs whitespace-nowrap text-muted sm:inline">{t('rm.active', { ago: timeAgo(room.lastMessage.createdAt) })}</span>}
                {room?.isPrivate && (
                  <button onClick={() => setMembers(true)} title={t('rm.members')} aria-label={t('rm.members')} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-sunk hover:text-ink">
                    <Icon name="users" />
                  </button>
                )}
              </span>
            </header>
            <div className="h-[calc(100dvh-330px)] min-h-[260px] overflow-y-auto px-3 md:h-[calc(100dvh-290px)]">
              {isError ? (
                <p className="py-10 text-center text-sm text-muted">{t('rm.members_only')}</p>
              ) : (
                <ChatThread items={messages} loading={isLoading} actions={actions} emptyText={t('rm.empty')} />
              )}
            </div>
            <div className="border-t border-line bg-surface p-3">
              <ChatComposer
                onSend={(p) => send.mutate(p)}
                pending={send.isPending}
                placeholder={t('rm.write_in', { name: room?.name ?? t('rm.this_room') })}
                loginFrom={user ? undefined : location.pathname}
                mentions
              />
            </div>
          </section>
        ) : (
          <section className="hidden rounded-[14px] border border-dashed border-line bg-surface px-6 py-16 text-center md:block">
            <Icon name="chat" className="mx-auto size-8 text-muted" />
            <p className="mt-3 font-display text-lg">{t('rm.choose')}</p>
            <p className="mt-1 text-sm text-muted">{t('rm.choose_text')}</p>
          </section>
        )}
      </div>

      {creating && <CreateGroupDialog onClose={() => setCreating(false)} />}
      {members && slug && <GroupMembersDialog slug={slug} onClose={() => setMembers(false)} />}
    </div>
  )
}
