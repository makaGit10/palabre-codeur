import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useParams } from 'react-router-dom'
import { Flag } from '../components/Brand'
import { ChatComposer, ChatThread } from '../components/Chat'
import { Icon } from '../components/Icon'
import { useToast } from '../components/toastContext'
import { useAuth } from '../hooks/useAuth'
import { errorMessage } from '../lib/api'
import { timeAgo } from '../lib/format'
import { listRooms, postRoomMessage, roomMessages } from '../services/messaging'
import type { CountryCode, Room } from '../types'

// Salon par pays → drapeau
const ROOM_COUNTRY: Record<string, CountryCode> = { senegal: 'SN', 'cote-d-ivoire': 'CI', cameroun: 'CM', maroc: 'MA', 'burkina-faso': 'BF', mali: 'ML' }

export default function Rooms() {
  const { slug } = useParams()
  const { user } = useAuth()
  const location = useLocation()
  const toast = useToast()
  const queryClient = useQueryClient()

  const { data: rooms = [], isLoading: roomsLoading } = useQuery({ queryKey: ['rooms'], queryFn: listRooms, refetchInterval: 30_000 })
  const room = rooms.find((r) => r.slug === slug)
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['room', slug],
    queryFn: () => roomMessages(slug!),
    enabled: !!slug,
    refetchInterval: 4_000, // la discussion se rafraîchit toutes les 4 secondes
  })
  const send = useMutation({
    mutationFn: (body: string) => postRoomMessage(slug!, { body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room', slug] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
    },
    onError: (e) => toast(errorMessage(e), 'bell'),
  })

  const topics = rooms.filter((r) => r.kind === 'topic')
  const countries = rooms.filter((r) => r.kind === 'country')

  const RoomLink = ({ r }: { r: Room }) => (
    <Link
      to={`/app/salons/${r.slug}`}
      className={`flex items-center gap-2.5 rounded-[10px] px-3 py-2 transition ${r.slug === slug ? 'bg-green-soft text-green' : 'hover:bg-sunk'}`}
    >
      {ROOM_COUNTRY[r.slug] && <Flag code={ROOM_COUNTRY[r.slug]} />}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{r.name}</span>
        {r.lastMessage && (
          <span className="block truncate text-xs text-muted">
            {r.lastMessage.authorName.split(' ')[0]} : {r.lastMessage.body}
          </span>
        )}
      </span>
      {r.messagesCount > 0 && <span className="text-xs text-muted tabular-nums">{r.messagesCount}</span>}
    </Link>
  )

  const list = (
    <nav aria-label="Salons" className="flex flex-col gap-4">
      <div>
        <h2 className="mb-1.5 px-3 text-[11px] font-bold tracking-wider text-muted uppercase">Par sujet</h2>
        <div className="flex flex-col gap-0.5">{topics.map((r) => <RoomLink key={r.id} r={r} />)}</div>
      </div>
      <div>
        <h2 className="mb-1.5 px-3 text-[11px] font-bold tracking-wider text-muted uppercase">Par pays</h2>
        <div className="flex flex-col gap-0.5">{countries.map((r) => <RoomLink key={r.id} r={r} />)}</div>
      </div>
    </nav>
  )

  return (
    <div className="max-w-[1180px]">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px]">Sous l'arbre</h1>
          <p className="mt-1 text-sm text-muted">Les salons de discussion de Palabre, par sujet et par pays. Tout le monde peut lire, les membres écrivent.</p>
        </div>
      </div>

      <div className="grid items-start gap-5 md:grid-cols-[260px_minmax(0,1fr)]">
        {/* Liste des salons : masquée sur téléphone quand un salon est ouvert */}
        <aside className={`rounded-[14px] border border-line bg-surface p-2.5 md:sticky md:top-7 ${slug ? 'hidden md:block' : ''}`}>
          {roomsLoading ? <p className="py-6 text-center text-sm text-muted">Chargement des salons…</p> : list}
        </aside>

        {slug ? (
          <section className="flex min-w-0 flex-col rounded-[14px] border border-line bg-bg">
            <header className="flex items-center gap-3 border-b border-line bg-surface px-4 py-3">
              <Link to="/app/salons" className="text-muted hover:text-ink md:hidden" aria-label="Tous les salons">
                <Icon name="left" />
              </Link>
              {room && ROOM_COUNTRY[room.slug] && <Flag code={ROOM_COUNTRY[room.slug]} />}
              <div className="min-w-0">
                <h2 className="truncate text-base">{room?.name ?? `#${slug}`}</h2>
                {room?.description && <p className="truncate text-xs text-muted">{room.description}</p>}
              </div>
              {room?.lastMessage && <span className="ml-auto text-xs whitespace-nowrap text-muted">actif {timeAgo(room.lastMessage.createdAt)}</span>}
            </header>
            <div className="h-[calc(100dvh-330px)] min-h-[260px] overflow-y-auto px-3 md:h-[calc(100dvh-290px)]">
              <ChatThread items={messages} loading={isLoading} emptyText="Personne n'a encore parlé ici. Lancez la palabre !" />
            </div>
            <div className="border-t border-line bg-surface p-3">
              <ChatComposer
                onSend={(body) => send.mutate(body)}
                pending={send.isPending}
                placeholder={`Écrire dans ${room?.name ?? 'ce salon'}…`}
                loginFrom={user ? undefined : location.pathname}
              />
            </div>
          </section>
        ) : (
          <section className="hidden rounded-[14px] border border-dashed border-line bg-surface px-6 py-16 text-center md:block">
            <Icon name="chat" className="mx-auto size-8 text-muted" />
            <p className="mt-3 font-display text-lg">Choisissez un salon</p>
            <p className="mt-1 text-sm text-muted">Un sujet technique, ou les développeurs de votre pays.</p>
          </section>
        )}
      </div>
    </div>
  )
}
