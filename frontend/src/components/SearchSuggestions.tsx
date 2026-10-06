import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useI18n } from '../i18n'
import { globalSearch } from '../services/search'
import type { SearchItem, SearchSectionId } from '../types'
import { Icon, type IconName } from './Icon'

// Champ de recherche avec suggestions pendant la frappe : les résultats de la recherche globale
// (questions, extraits, salons, membres, messages) s'affichent sous le champ, groupés par section.
// Entrée sans sélection soumet le formulaire parent (recherche dans le fil) ; flèches puis Entrée ouvrent un résultat.
// Le formulaire parent doit être en position relative : la liste se place juste en dessous, sur toute sa largeur.
const MIN_CHARS = 2
const SECTION_ICON: Record<SearchSectionId, IconName> = { questions: 'home', snippets: 'code', rooms: 'chat', users: 'user', messages: 'mail' }

type Row = SearchItem & { key: string; section: SearchSectionId }

function Highlight({ text, q }: { text: string; q: string }) {
  const i = text.toLowerCase().indexOf(q.toLowerCase())
  if (i < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded bg-gold-soft text-ink">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  )
}

export function SearchInput({ id, placeholder, defaultValue = '', className }: { id: string; placeholder: string; defaultValue?: string; className: string }) {
  const { t } = useI18n()
  const [value, setValue] = useState(defaultValue)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  const term = value.trim()
  const debounced = useDebouncedValue(term, 250)
  const { data: sections, isFetching } = useQuery({
    queryKey: ['search', debounced],
    queryFn: ({ signal }) => globalSearch(debounced, signal),
    enabled: open && debounced.length >= MIN_CHARS,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })

  const rows: Row[] = (sections ?? []).flatMap((s) => s.items.map((item) => ({ ...item, key: `${s.id}-${item.id}`, section: s.id })))
  const groups = (sections ?? []).filter((s) => s.items.length > 0)
  const visible = open && term.length >= MIN_CHARS
  const settled = !isFetching && debounced === term
  const current = Math.min(active, rows.length - 1)

  // Un clic hors du formulaire referme la liste
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!inputRef.current?.form?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const go = (row: Row) => {
    setOpen(false)
    navigate(row.url)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!visible || rows.length === 0) {
      if (e.key === 'Escape') setOpen(false)
      return
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((e.key === 'ArrowDown' ? current + 1 : current - 1 + rows.length + 1) % (rows.length + 1) || 0)
      if (e.key === 'ArrowUp' && current <= 0) setActive(rows.length - 1)
    } else if (e.key === 'Enter' && current >= 0 && rows[current]) {
      e.preventDefault()
      go(rows[current])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        id={id}
        name="q"
        role="combobox"
        aria-expanded={visible}
        aria-controls={listId}
        aria-activedescendant={current >= 0 && rows[current] ? `${listId}-${rows[current].key}` : undefined}
        aria-autocomplete="list"
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        className={className}
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          setActive(-1)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />

      {visible && (
        <div className="absolute inset-x-0 top-[calc(100%+8px)] z-30 max-h-[60vh] overflow-y-auto rounded-2xl border border-line bg-surface p-2 text-ink shadow-[0_24px_60px_-24px_rgb(0_0_0/.45)]">
          <div id={listId} role="listbox" aria-label={t('sp.suggestions')}>
            {groups.map((s) => (
              <div key={s.id} role="group" aria-label={s.label}>
                <h3 className="px-3 pt-2 pb-1 font-sans text-[11px] font-bold tracking-wide text-muted uppercase">{s.label}</h3>
                {s.items.map((item) => {
                  const index = rows.findIndex((r) => r.section === s.id && r.id === item.id)
                  const selected = index === current
                  return (
                    <button
                      key={item.id}
                      id={`${listId}-${s.id}-${item.id}`}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onMouseDown={(e) => e.preventDefault()} // le champ garde le focus
                      onMouseMove={() => setActive(index)}
                      onClick={() => go(rows[index])}
                      className={`flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-left ${selected ? 'bg-green-soft text-green' : 'hover:bg-sunk'}`}
                    >
                      <span className={`grid size-8 flex-none place-items-center rounded-lg ${selected ? 'bg-surface' : 'bg-sunk'}`}>
                        <Icon name={SECTION_ICON[s.id]} className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium">
                          <Highlight text={item.title} q={term} />
                        </span>
                        {item.subtitle && <span className="block truncate text-xs text-muted">{item.subtitle}</span>}
                      </span>
                      {item.country && <span className={`flag flag-${item.country}`} aria-hidden="true" />}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          {settled && rows.length === 0 && <p className="px-3 pt-3 pb-2 text-center text-sm text-muted">{t('sp.no_result', { q: term })}</p>}
          {!settled && rows.length === 0 && <p className="px-3 py-3 text-center text-sm text-muted">{t('sp.searching_short')}</p>}

          <button type="submit" className="mt-1 flex w-full items-center gap-3 rounded-[10px] border-t border-line px-3 py-2.5 text-left text-[13.5px] font-semibold text-green hover:bg-sunk">
            <Icon name="search" className="size-4" />
            {t('sp.all_questions', { q: term })}
          </button>
        </div>
      )}
    </>
  )
}
