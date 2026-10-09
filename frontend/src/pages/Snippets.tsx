import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Avatar } from '../components/Brand'
import { Icon } from '../components/Icon'
import { Markdown } from '../components/Markdown'
import { ReportButton } from '../components/ReportButton'
import { ShareButton } from '../components/ShareDialog'
import { useToast } from '../components/toastContext'
import { useAuth } from '../hooks/useAuth'
import { useI18n } from '../i18n'
import { errorMessage } from '../lib/api'
import { listSnippets, toggleTested, type Snippet } from '../services/community'

// Filtres par API (noms de marques, identiques dans toutes les langues)
const API_FILTERS = [
  { id: 'wave', label: 'Wave' },
  { id: 'orange-money', label: 'Orange Money' },
  { id: 'mtn-momo', label: 'MTN MoMo' },
  { id: 'paytech', label: 'PayTech' },
]

export default function Snippets() {
  const { t } = useI18n()
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const { data: snippets = [], isLoading } = useQuery({ queryKey: ['snippets'], queryFn: listSnippets })
  const filters = [{ id: 'all', label: t('common.all') }, ...API_FILTERS]

  const list = useMemo(() => {
    const s = search.trim().toLowerCase()
    return snippets.filter(
      (sn) =>
        (filter === 'all' || sn.tags.includes(filter)) &&
        (!s || `${sn.title} ${sn.description} ${sn.language}`.toLowerCase().includes(s)),
    )
  }, [snippets, filter, search])

  return (
    <div className="max-w-[1100px]">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px]">{t('sn.title')}</h1>
          <p className="mt-1 text-sm text-muted">{t('sn.subtitle')}</p>
        </div>
        <Link
          to="/app/snippets/nouveau"
          className="inline-flex items-center gap-2 rounded-[10px] bg-green px-4 py-2.5 text-sm font-semibold text-green-ink hover:brightness-110"
        >
          <Icon name="plus" />
          {t('sn.new')}
        </Link>
      </div>

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.id}
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={`rounded-[10px] border px-3.5 py-2 text-[13.5px] font-semibold ${
                filter === f.id ? 'border-green bg-green-soft text-green' : 'border-line bg-surface'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <label className="flex flex-1 items-center gap-2 rounded-[10px] border border-line bg-surface px-3 py-2 text-muted lg:max-w-sm lg:ml-auto">
          <Icon name="search" />
          <input
            id="snippet-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('sn.search')}
            className="min-w-0 flex-1 bg-transparent text-ink outline-none"
          />
        </label>
      </div>

      {isLoading ? (
        <p className="py-10 text-center text-muted">{t('sn.loading')}</p>
      ) : list.length ? (
        <div className="grid gap-4 2xl:grid-cols-2">
          {list.map((s) => (
            <SnippetCard key={s.id} snippet={s} />
          ))}
        </div>
      ) : (
        <div className="rounded-[14px] border border-dashed border-line bg-surface px-5 py-10 text-center text-muted">{t('sn.empty')}</div>
      )}
    </div>
  )
}

function SnippetCard({ snippet: s }: { snippet: Snippet }) {
  const { t } = useI18n()
  const toast = useToast()
  const { user, isLoading: authLoading } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const tested = useMutation({
    mutationFn: () => toggleTested(s.id),
    onError: (e) => toast(errorMessage(e), 'bell'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['snippets'] }),
  })

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(s.code)
      toast(t('sn.copied'))
    } catch {
      toast(t('sn.copy_failed'), 'bell')
    }
  }

  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-[14px] border border-line bg-surface">
      <header className="flex flex-wrap items-start justify-between gap-3 px-4 pt-4 pb-3">
        <div className="min-w-0">
          <h2 className="text-base">{s.title}</h2>
          <p className="mt-1 text-[13px] text-muted">{s.description}</p>
        </div>
        <span className="rounded-md bg-sunk px-2 py-[3px] font-mono text-[11.5px]">{s.language}</span>
      </header>
      {/* Le code est rendu comme un bloc Markdown pour profiter de la coloration */}
      <div className="flex-1 [&_.md_pre]:rounded-none">
        <Markdown>{'```' + s.fence + '\n' + s.code + '\n```'}</Markdown>
      </div>
      <footer className="flex flex-wrap items-center gap-2.5 px-4 py-3 text-[12.5px] text-muted">
        <button
          onClick={() => {
            if (user) tested.mutate()
            else if (!authLoading) navigate('/connexion', { state: { from: '/app/snippets' } })
          }}
          aria-pressed={s.testedByMe}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-semibold ${
            s.testedByMe ? 'border-green bg-green-soft text-green' : 'border-line text-muted hover:text-ink'
          }`}
        >
          <Icon name="check" className="size-3.5" />
          {t('sn.tested_by', { n: s.testedBy })}
        </button>
        <span>▲ {s.votes}</span>
        <span className="flex-1" />
        <Link to={`/app/profil/${s.author.id}`} className="inline-flex items-center gap-1.5 font-semibold text-ink">
          <Avatar user={s.author} size="sm" />
          {s.author.name}
        </Link>
        <ShareButton item={{ type: 'snippet', id: s.id, title: s.title }} compact />
        <ReportButton type="snippet" id={s.id} authorId={s.author.id} />
        <button onClick={copy} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 font-semibold text-ink hover:border-green">
          <Icon name="copy" className="size-4" />
          {t('common.copy')}
        </button>
      </footer>
    </article>
  )
}
