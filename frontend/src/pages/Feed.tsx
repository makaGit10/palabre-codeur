import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Avatar, Flag } from '../components/Brand'
import { Icon } from '../components/Icon'
import { QuestionCard } from '../components/QuestionCard'
import { SearchInput } from '../components/SearchSuggestions'
import { useAuth } from '../hooks/useAuth'
import { useI18n, type Key } from '../i18n'
import { formatFcfa, formatNumber } from '../lib/format'
import { getLeaderboard } from '../services/community'
import { listQuestions } from '../services/questions'

const TABS: { id: 'pour' | 'recentes' | 'sans' | 'primes'; label: Key }[] = [
  { id: 'pour', label: 'feed.tab_for_you' },
  { id: 'recentes', label: 'feed.tab_recent' },
  { id: 'sans', label: 'feed.tab_unanswered' },
  { id: 'primes', label: 'feed.tab_bounty' },
]
type Tab = (typeof TABS)[number]['id']

export default function Feed() {
  const { t } = useI18n()
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState<Tab>('pour')
  const tag = params.get('tag')
  const search = params.get('q') ?? ''
  const { data: questions = [], isLoading } = useQuery({ queryKey: ['questions'], queryFn: listQuestions })

  const list = useMemo(() => {
    let l = questions
    if (tab === 'recentes') l = [...l].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    if (tab === 'sans') l = l.filter((q) => q.answersCount === 0)
    if (tab === 'primes') l = l.filter((q) => q.bounty && !q.solved)
    if (tag) l = l.filter((q) => q.tags.includes(tag))
    if (search) {
      const s = search.toLowerCase()
      l = l.filter((q) => `${q.title} ${q.tags.join(' ')}`.toLowerCase().includes(s))
    }
    return l
  }, [questions, tab, tag, search])

  const { user } = useAuth()
  const { data: leaderboard } = useQuery({ queryKey: ['leaderboard'], queryFn: getLeaderboard })
  const topUsers = leaderboard?.developers.slice(0, 5) ?? []
  const topBounties = questions
    .filter((q) => q.bounty && !q.solved)
    .sort((a, b) => b.bounty!.amount - a.bounty!.amount)
    .slice(0, 3)

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_360px] 2xl:gap-8">
      <div className="min-w-0">
        <div className="mb-4">
          <h1 className="text-[26px]">{user ? t('feed.hello', { name: user.name.split(' ')[0] }) : t('feed.welcome')}</h1>
          <p className="mt-1 text-sm text-muted">{t('feed.subtitle')}</p>
        </div>

        <form
          className="relative mb-3.5 flex items-center gap-2 rounded-[10px] border border-line bg-surface px-3 py-2 text-muted"
          onSubmit={(e) => {
            e.preventDefault()
            const q = new FormData(e.currentTarget).get('q')?.toString().trim() ?? ''
            setParams(q ? { q } : {})
          }}
        >
          <Icon name="search" />
          <SearchInput id="feed-search" defaultValue={search} placeholder={t('feed.search_placeholder')} className="min-w-0 flex-1 bg-transparent text-ink outline-none" />
        </form>

        <div role="tablist" className="mb-3.5 flex gap-1 overflow-x-auto border-b border-line">
          {TABS.map((tabItem) => (
            <button
              key={tabItem.id}
              role="tab"
              aria-selected={tab === tabItem.id}
              onClick={() => setTab(tabItem.id)}
              className={`-mb-px border-b-2 px-2.5 py-2 sm:px-3 text-sm font-semibold whitespace-nowrap ${
                tab === tabItem.id ? 'border-green text-ink' : 'border-transparent text-muted'
              }`}
            >
              {t(tabItem.label)}
            </button>
          ))}
        </div>

        {(tag || search) && (
          <p className="mb-3 text-[13.5px] text-muted">
            {t('feed.filter')} <b className="text-ink">{tag ?? `« ${search} »`}</b> ·{' '}
            <button className="font-semibold text-green" onClick={() => setParams({})}>
              {t('feed.clear')}
            </button>
          </p>
        )}

        {isLoading ? (
          <p className="py-10 text-center text-muted">{t('feed.loading')}</p>
        ) : list.length ? (
          <div className="flex flex-col gap-2.5">
            {list.map((q) => (
              <QuestionCard key={q.id} question={q} />
            ))}
          </div>
        ) : (
          <div className="rounded-[14px] border border-dashed border-line bg-surface px-5 py-10 text-center text-muted">{t('feed.empty')}</div>
        )}
      </div>

      <aside className="sticky top-7 hidden flex-col gap-4 xl:flex">
        <section className="rounded-[14px] border border-line bg-surface p-4">
          <h3 className="mb-3 flex items-center gap-2 text-[15px]">
            <Icon name="trophy" />
            {t('feed.top_contributors')}
          </h3>
          {topUsers.map((u, i) => (
            <div key={u.id} className="flex items-center gap-2.5 border-line py-1.5 text-sm not-first-of-type:border-t">
              <span className="w-4 font-bold text-muted tabular-nums">{i + 1}</span>
              <Avatar user={u} size="sm" />
              <Link to={`/app/profil/${u.id}`} className="min-w-0 flex-1 truncate">
                {u.name}
              </Link>
              <Flag code={u.country} />
              <span className="text-[13px] font-bold tabular-nums">{formatNumber(u.reputation)}</span>
            </div>
          ))}
        </section>
        <section className="rounded-[14px] border border-line bg-surface p-4">
          <h3 className="mb-3 flex items-center gap-2 text-[15px]">
            <Icon name="coin" />
            {t('feed.top_bounties')}
          </h3>
          {topBounties.map((q) => (
            <Link key={q.id} to={`/app/questions/${q.id}`} className="flex flex-col gap-1 border-line py-2 not-first-of-type:border-t">
              <span className="text-[13.5px] leading-snug font-semibold">{q.title}</span>
              <span className="inline-flex w-fit items-center gap-1 rounded-full bg-gold-soft px-2.5 py-0.5 text-xs font-bold text-gold">
                <Icon name="coin" className="size-3.5" />
                {formatFcfa(q.bounty!.amount)}
              </span>
            </Link>
          ))}
        </section>
      </aside>
    </div>
  )
}
