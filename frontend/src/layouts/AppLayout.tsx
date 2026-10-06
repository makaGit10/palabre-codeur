import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Avatar, Logo } from '../components/Brand'
import { Icon, type IconName } from '../components/Icon'
import { SearchProvider } from '../components/SearchPalette'
import { useAuth } from '../hooks/useAuth'
import { usePersistentState, useTheme } from '../hooks/usePersistentState'
import { useSearchPalette } from '../hooks/useSearchPalette'
import { formatNumber } from '../lib/format'
import { logout } from '../services/auth'
import { listConversations, listNotifications } from '../services/messaging'
import { listQuestions } from '../services/questions'

type NavItem = { to: string; icon: IconName; label: string; end?: boolean; count?: 'bounties' | 'messages' }

const NAV: NavItem[] = [
  { to: '/app', icon: 'home', label: 'Fil', end: true },
  { to: '/app/salons', icon: 'chat', label: "Sous l'arbre" },
  { to: '/app/messages', icon: 'mail', label: 'Messages', count: 'messages' },
  { to: '/app/snippets', icon: 'code', label: 'Snippets' },
  { to: '/app/primes', icon: 'coin', label: 'Primes', count: 'bounties' },
  { to: '/app/classement', icon: 'trophy', label: 'Classement' },
  { to: '/app/portefeuille', icon: 'wallet', label: 'Portefeuille' },
]

// Compteurs de la navigation : primes ouvertes, messages et notifications non lus (rafraîchis régulièrement)
function useCounts(loggedIn: boolean) {
  const { data: questions = [] } = useQuery({ queryKey: ['questions'], queryFn: listQuestions })
  const { data: conversations } = useQuery({ queryKey: ['conversations'], queryFn: listConversations, enabled: loggedIn, refetchInterval: 10_000 })
  const { data: notifications } = useQuery({ queryKey: ['notifications'], queryFn: listNotifications, enabled: loggedIn, refetchInterval: 15_000 })
  return {
    bounties: questions.filter((q) => q.bounty && !q.solved).length,
    messages: conversations?.unreadCount ?? 0,
    notifications: notifications?.unreadCount ?? 0,
  }
}

function useLogout() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(['me'], null)
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'me' })
      navigate('/')
    },
  })
}

function CountBadge({ n, gold, floating }: { n: number; gold?: boolean; floating?: boolean }) {
  if (!n) return null
  return (
    <span
      className={`rounded-full text-[11px] font-bold tabular-nums ${gold ? 'bg-gold-soft text-gold' : 'bg-green text-green-ink'} ${
        floating ? 'absolute top-0.5 right-0.5 px-1.5 text-[10px]' : 'ml-auto px-2'
      }`}
    >
      {n}
    </span>
  )
}

// Boutons-outils du bas de la barre (icône seule, nom au survol)
const toolClass = (active = false) =>
  `relative grid size-10 place-items-center rounded-[10px] transition ${active ? 'bg-green-soft text-green' : 'text-muted hover:bg-sunk hover:text-ink'}`

const itemClass = (collapsed: boolean, active = false) =>
  `relative flex w-full items-center gap-2.5 rounded-[10px] py-2.5 font-medium transition ${
    collapsed ? 'justify-center px-0' : 'px-3'
  } ${active ? 'bg-green-soft font-bold text-green' : 'text-muted hover:bg-sunk hover:text-ink'}`

// Barre latérale pleine hauteur : en-tête en haut, navigation au milieu, compte fixé en bas
function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { toggle: toggleTheme, isDark } = useTheme()
  const { user } = useAuth()
  const counts = useCounts(!!user)
  const logoutMutation = useLogout()
  const openSearch = useSearchPalette()
  const label = collapsed ? 'Déplier le menu' : 'Replier le menu'

  return (
    <aside aria-label="Navigation" className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-surface md:flex">
      <div className="px-3 pt-4">
        <div className={`flex items-center justify-between gap-2 pb-4 ${collapsed ? 'flex-col gap-3' : ''}`}>
          <Logo to="/" showName={!collapsed} />
          <button
            onClick={onToggle}
            aria-expanded={!collapsed}
            aria-label={label}
            title={label}
            className="grid size-8 place-items-center rounded-lg border border-line text-muted hover:text-ink"
          >
            <Icon name="left" className={`size-[18px] transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>
        {/* Recherche globale : partout dans l'application, aussi par Ctrl K */}
        <button
          onClick={openSearch}
          title="Rechercher (Ctrl K)"
          aria-label="Rechercher"
          aria-keyshortcuts="Control+K"
          className={`mb-2 flex w-full items-center gap-2.5 rounded-[10px] border border-line bg-bg py-2 text-muted transition hover:border-green hover:text-ink ${
            collapsed ? 'justify-center px-0' : 'px-3'
          }`}
        >
          <Icon name="search" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left text-sm">Rechercher…</span>
              <kbd className="rounded-md border border-line px-1.5 font-sans text-[11px]">Ctrl K</kbd>
            </>
          )}
        </button>
        <Link
          to="/app/poser"
          title="Poser une question"
          className="mb-3 flex items-center justify-center gap-2 rounded-[10px] bg-green py-2.5 font-bold text-green-ink hover:brightness-110"
        >
          <Icon name="plus" />
          {!collapsed && 'Poser une question'}
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} title={n.label} className={({ isActive }) => itemClass(collapsed, isActive)}>
            <Icon name={n.icon} />
            {!collapsed && n.label}
            {n.count && <CountBadge n={counts[n.count]} gold={n.count === 'bounties'} floating={collapsed} />}
          </NavLink>
        ))}
        {!collapsed && (
          <div className="mt-4 rounded-xl border border-line bg-bg p-3.5 text-[13px] text-muted">
            <b className="mb-1 block font-display text-ink">Le principe</b>
            Aidez un dev, gagnez de la réputation, et parfois des FCFA.
          </div>
        )}
      </nav>

      <div className="border-t border-line px-3 pt-3 pb-4">
        {/* Outils : icônes seules, nom au survol ; en ligne quand la barre est dépliée, en colonne quand elle est repliée */}
        <div className={`flex gap-1 ${collapsed ? 'flex-col items-center' : 'justify-around'}`}>
          {user && (
            <NavLink to="/app/notifications" title="Notifications" aria-label="Notifications" className={({ isActive }) => toolClass(isActive)}>
              <Icon name="bell" />
              <CountBadge n={counts.notifications} floating />
            </NavLink>
          )}
          <button onClick={toggleTheme} title={isDark ? 'Mode clair' : 'Mode sombre'} aria-label={isDark ? 'Mode clair' : 'Mode sombre'} className={toolClass()}>
            <Icon name="moon" />
          </button>
          {user && (
            <button
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              title="Se déconnecter"
              aria-label="Se déconnecter"
              className={toolClass()}
            >
              <Icon name="logout" />
            </button>
          )}
        </div>
        {user ? (
            <NavLink
              to={`/app/profil/${user.id}`}
              title={user.name}
              className={({ isActive }) =>
                `mt-2 flex items-center gap-2.5 rounded-xl border p-2 transition ${collapsed ? 'justify-center border-transparent' : ''} ${
                  isActive ? 'border-green bg-green-soft' : 'border-line hover:bg-sunk'
                }`
              }
            >
              <Avatar user={user} />
              {!collapsed && (
                <span className="flex min-w-0 flex-col leading-tight">
                  <b className="truncate">{user.name}</b>
                  <small className="text-xs text-muted">
                    {formatNumber(user.reputation)} {user.reputation > 1 ? 'pts' : 'pt'}
                  </small>
                </span>
              )}
            </NavLink>
        ) : (
          <div className="mt-2 flex flex-col gap-2">
            <Link
              to="/connexion"
              title="Se connecter"
              className="flex items-center justify-center gap-2 rounded-[10px] border border-line py-2.5 text-sm font-semibold whitespace-nowrap hover:border-green"
            >
              <Icon name="user" />
              {!collapsed && 'Se connecter'}
            </Link>
            {!collapsed && (
              <Link to="/inscription" className="flex items-center justify-center rounded-[10px] bg-green py-2.5 text-sm font-semibold text-green-ink hover:brightness-110">
                Rejoindre
              </Link>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}

const TABS: NavItem[] = [
  { to: '/app', icon: 'home', label: 'Fil', end: true },
  { to: '/app/salons', icon: 'chat', label: 'Salons' },
  { to: '/app/poser', icon: 'plus', label: 'Poser' },
  { to: '/app/messages', icon: 'mail', label: 'Messages', count: 'messages' },
]

// Sur téléphone : barre d'onglets en bas, et un menu « Plus » pour le reste
function MobileTabbar() {
  const { user } = useAuth()
  const counts = useCounts(!!user)
  const { toggle: toggleTheme, isDark } = useTheme()
  const logoutMutation = useLogout()
  const openSearch = useSearchPalette()
  const [open, setOpen] = useState(false)
  const tab = ({ isActive }: { isActive: boolean }) =>
    `relative flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10.5px] ${isActive ? 'font-bold text-green' : 'text-muted'}`
  const row = 'flex items-center gap-3 rounded-[10px] px-3 py-3 text-[15px] font-medium hover:bg-sunk'
  const close = () => setOpen(false)

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={close}>
          <div className="absolute inset-0 bg-ink/40" />
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-line bg-surface p-3 pb-[calc(12px+env(safe-area-inset-bottom,0px))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-line" />
            <nav className="grid gap-0.5">
              <button
                onClick={() => {
                  close()
                  openSearch()
                }}
                className={row}
              >
                <Icon name="search" /> Rechercher
              </button>
              <Link to="/app/snippets" onClick={close} className={row}>
                <Icon name="code" /> Snippets
              </Link>
              <Link to="/app/primes" onClick={close} className={row}>
                <Icon name="coin" /> Primes <CountBadge n={counts.bounties} gold />
              </Link>
              <Link to="/app/classement" onClick={close} className={row}>
                <Icon name="trophy" /> Classement
              </Link>
              {user ? (
                <>
                  <Link to="/app/portefeuille" onClick={close} className={row}>
                    <Icon name="wallet" /> Portefeuille
                  </Link>
                  <Link to="/app/notifications" onClick={close} className={row}>
                    <Icon name="bell" /> Notifications <CountBadge n={counts.notifications} />
                  </Link>
                  <Link to={`/app/profil/${user.id}`} onClick={close} className={row}>
                    <Avatar user={user} size="sm" /> Mon profil
                  </Link>
                </>
              ) : (
                <Link to="/connexion" onClick={close} className={row}>
                  <Icon name="user" /> Se connecter
                </Link>
              )}
              <button onClick={toggleTheme} className={row}>
                <Icon name="moon" /> {isDark ? 'Mode clair' : 'Mode sombre'}
              </button>
              {user && (
                <button
                  onClick={() => {
                    close()
                    logoutMutation.mutate()
                  }}
                  className={`${row} text-red`}
                >
                  <Icon name="logout" /> Se déconnecter
                </button>
              )}
            </nav>
          </div>
        </div>
      )}
      <nav
        aria-label="Navigation"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface px-1 pt-1.5 pb-[calc(6px+env(safe-area-inset-bottom,0px))] md:hidden"
      >
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className={tab}>
            <Icon name={t.icon} />
            {t.label}
            {t.count && counts[t.count] > 0 && (
              <span className="absolute top-0 right-1/2 -mr-5 rounded-full bg-green px-1.5 text-[10px] font-bold text-green-ink">{counts[t.count]}</span>
            )}
          </NavLink>
        ))}
        <button onClick={() => setOpen(true)} className={tab({ isActive: open })} aria-label="Plus d'options" aria-expanded={open}>
          {user ? <Avatar user={user} size="sm" /> : <Icon name="more" />}
          Plus
          {counts.notifications > 0 && <span className="absolute top-0 right-1/2 -mr-5 size-2 rounded-full bg-red" />}
        </button>
      </nav>
    </>
  )
}

export default function AppLayout() {
  const [collapsed, setCollapsed] = usePersistentState('palabre-nav-collapsed', false)

  return (
    <SearchProvider>
      <div
        className={`min-h-dvh md:grid md:transition-[grid-template-columns] ${
          collapsed ? 'md:grid-cols-[72px_minmax(0,1fr)]' : 'md:grid-cols-[256px_minmax(0,1fr)]'
        }`}
      >
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
        <main className="min-w-0 px-4 pt-5 pb-28 md:px-8 md:pt-7 md:pb-10 2xl:px-12">
          <Outlet />
        </main>
        <MobileTabbar />
      </div>
    </SearchProvider>
  )
}
