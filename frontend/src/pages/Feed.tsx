import { useInfiniteQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TopBounties, TopContributors } from '../components/CommunityAside'
import { Icon } from '../components/Icon'
import { LoadMore } from '../components/LoadMore'
import { QuestionCard } from '../components/QuestionCard'
import { SearchInput } from '../components/SearchSuggestions'
import { useAuth } from '../hooks/useAuth'
import { useI18n, type Key } from '../i18n'
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
  // Le serveur filtre (onglet, étiquette, recherche) et renvoie 20 questions à la fois ; la suite arrive au défilement
  const filters = { tab: tab === 'sans' || tab === 'primes' ? tab : undefined, tag: tag ?? undefined, q: search || undefined }
  const feed = useInfiniteQuery({
    queryKey: ['questions', 'feed', filters],
    queryFn: ({ pageParam }) => listQuestions({ ...filters, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.lastPage ? last.page + 1 : undefined),
  })
  const list = feed.data?.pages.flatMap((p) => p.data) ?? []
  const isLoading = feed.isLoading

  const { user } = useAuth()

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
        {list.length > 0 && <LoadMore hasMore={!!feed.hasNextPage} loading={feed.isFetchingNextPage} onLoad={() => feed.fetchNextPage()} />}
      </div>

      <aside className="sticky top-7 hidden flex-col gap-4 xl:flex">
        <TopContributors />
        <TopBounties />
      </aside>
    </div>
  )
}
