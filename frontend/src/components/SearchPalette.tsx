import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { SearchPaletteContext } from '../hooks/useSearchPalette'
import { useI18n, type Key } from '../i18n'
import { globalSearch } from '../services/search'
import type { SearchSectionId } from '../types'
import { Icon, type IconName } from './Icon'

// Recherche globale : une seule barre (Ctrl K) qui cherche partout pendant la frappe et groupe les résultats
// par section, pour choisir où aller. Avant de taper : les dernières recherches et quelques raccourcis.
const RECENT_KEY = 'palabre-recent-searches'
const RECENT_MAX = 4
const MIN_CHARS = 2
const SECTION_ICON: Record<SearchSectionId, IconName> = { questions: 'home', snippets: 'code', rooms: 'chat', users: 'user', messages: 'mail' }
const SHORTCUTS: { title: Key; url: string; icon: IconName }[] = [
  { title: 'sp.sc_ask', url: '/app/poser', icon: 'plus' },
  { title: 'sp.sc_snippet', url: '/app/snippets/nouveau', icon: 'code' },
  { title: 'sp.sc_bounties', url: '/app/primes', icon: 'coin' },
]

function readRecent(): string[] {
  try {
    const list: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string').slice(0, RECENT_MAX) : []
  } catch {
    return []
  }
}

function rememberSearch(q: string) {
  const next = [q, ...readRecent().filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, RECENT_MAX)
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    // stockage indisponible (navigation privée…) : on ne mémorise pas
  }
}

// Une ligne de la liste : soit on y va, soit elle relance une recherche
type Row = { key: string; index: number; title: string; subtitle?: string; icon: IconName; action: { go: string } | { query: string }; country?: string }
type Group = { id: string; label: string; rows: Row[] }

function Highlight({ text, q }: { text: string; q: string }) {
  const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1
  if (i < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded bg-gold-soft text-ink">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  )
}

function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded-md border border-line bg-bg px-1.5 py-px font-sans text-[11px] text-muted">{children}</kbd>
}

function SearchPalette({ onClose }: { onClose: () => void }) {
  const { t } = useI18n()
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const [recent] = useState(readRecent)
  const navigate = useNavigate()
  const listRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const term = q.trim()
  const debounced = useDebouncedValue(term, 250)
  const searching = term.length >= MIN_CHARS
  const { data: sections, isFetching, isError } = useQuery({
    queryKey: ['search', debounced],
    queryFn: ({ signal }) => globalSearch(debounced, signal),
    enabled: debounced.length >= MIN_CHARS,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })
  const settled = searching && !isFetching && debounced === term
  const noResult = settled && (sections?.length ?? 0) === 0

  // Ce que la liste affiche : résultats groupés, ou (avant de taper) dernières recherches et raccourcis
  let n = 0
  const row = (r: Omit<Row, 'index'>): Row => ({ ...r, index: n++ })
  const groups: Group[] = searching
    ? [
        ...(sections ?? []).map((s) => ({
          id: s.id,
          label: s.label,
          rows: s.items.map((it) => row({ key: `${s.id}-${it.id}`, title: it.title, subtitle: it.subtitle, icon: SECTION_ICON[s.id], action: { go: it.url }, country: it.country })),
        })),
        noResult
          ? { id: 'ask', label: t('sp.and_now'), rows: [row({ key: 'ask', title: t('sp.ask_community'), icon: 'plus', action: { go: '/app/poser' } })] }
          : { id: 'all', label: t('sp.also'), rows: [row({ key: 'all', title: t('sp.all_questions', { q: term }), icon: 'search', action: { go: `/app?q=${encodeURIComponent(term)}` } })] },
      ]
    : [
        ...(recent.length ? [{ id: 'recent', label: t('sp.recent'), rows: recent.map((r) => row({ key: `recent-${r}`, title: r, icon: 'search', action: { query: r } })) }] : []),
        { id: 'shortcuts', label: t('sp.shortcuts'), rows: SHORTCUTS.map((s) => row({ key: s.url, title: t(s.title), icon: s.icon, action: { go: s.url } })) },
      ]
  const rows = groups.flatMap((g) => g.rows)
  const current = Math.min(active, Math.max(rows.length - 1, 0))

  const run = (r: Row) => {
    if ('query' in r.action) {
      setQ(r.action.query)
      setActive(0)
      return
    }
    if (searching) rememberSearch(term)
    navigate(r.action.go)
    onClose()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (rows.length) setActive((e.key === 'ArrowDown' ? current + 1 : current - 1 + rows.length) % rows.length)
    } else if (e.key === 'Enter' && rows[current]) {
      e.preventDefault()
      run(rows[current])
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  // La ligne active reste visible au clavier ; la page derrière ne défile plus tant que la recherche est ouverte
  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [current])
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 p-3 pt-[8vh] sm:p-4 sm:pt-[14vh]" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('sp.dialog')}
        className="mx-auto flex max-h-[74dvh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b border-line px-3.5">
          <Icon name="search" className="size-5 flex-none text-muted" />
          <input
            id="global-search"
            autoFocus
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={rows[current] ? `${listId}-${rows[current].key}` : undefined}
            aria-autocomplete="list"
            autoComplete="off"
            spellCheck={false}
            placeholder={t('sp.placeholder')}
            className="h-12 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted"
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setActive(0)
            }}
            onKeyDown={onKeyDown}
          />
          {isFetching ? (
            <span aria-label={t('sp.searching')} className="size-4 flex-none animate-spin rounded-full border-2 border-line border-t-green" />
          ) : (
            <button onClick={onClose} aria-label={t('common.close')} className="flex-none rounded-md text-muted hover:text-ink">
              <Kbd>{t('sp.esc')}</Kbd>
            </button>
          )}
        </div>

        <div ref={listRef} id={listId} role="listbox" aria-label={t('sp.results')} className="overflow-y-auto p-2">
          {noResult && <p className="px-3 pt-4 pb-2 text-center text-sm text-muted">{t('sp.no_result', { q: term })}</p>}
          {isError && <p className="px-3 py-4 text-center text-sm text-red">{t('sp.unavailable')}</p>}
          {groups.map((g) => (
            <div key={g.id} role="group" aria-label={g.label}>
              <h3 className="px-3 pt-2 pb-1 font-sans text-[11px] font-bold tracking-wide text-muted uppercase">{g.label}</h3>
              {g.rows.map((r) => {
                const selected = r.index === current
                return (
                  <button
                    key={r.key}
                    id={`${listId}-${r.key}`}
                    role="option"
                    aria-selected={selected}
                    onMouseMove={() => setActive(r.index)}
                    onClick={() => run(r)}
                    className={`flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-left ${selected ? 'bg-green-soft text-green' : 'hover:bg-sunk'}`}
                  >
                    <span className={`grid size-8 flex-none place-items-center rounded-lg ${selected ? 'bg-surface' : 'bg-sunk'}`}>
                      <Icon name={r.icon} className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        <Highlight text={r.title} q={searching ? term : ''} />
                      </span>
                      {r.subtitle && <span className="block truncate text-xs text-muted">{r.subtitle}</span>}
                    </span>
                    {r.country && <span className={`flag flag-${r.country}`} />}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        <footer className="hidden items-center gap-4 border-t border-line px-3.5 py-1.5 text-[11px] text-muted sm:flex">
          <span>
            <Kbd>↑</Kbd> <Kbd>↓</Kbd> {t('sp.navigate')}
          </span>
          <span>
            <Kbd>↵</Kbd> {t('sp.open')}
          </span>
          <span>
            <Kbd>{t('sp.esc')}</Kbd> {t('sp.close')}
          </span>
        </footer>
      </div>
    </div>
  )
}

// Fournit « ouvrir la recherche » à toute l'application, et écoute Ctrl K / ⌘ K
export function SearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const show = useCallback(() => setOpen(true), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <SearchPaletteContext.Provider value={show}>
      {children}
      {open && <SearchPalette onClose={() => setOpen(false)} />}
    </SearchPaletteContext.Provider>
  )
}
