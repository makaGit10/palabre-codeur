import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { Icon } from '../components/Icon'
import { QuestionCard } from '../components/QuestionCard'
import { useI18n, type Key } from '../i18n'
import { formatFcfa } from '../lib/format'
import { getStats } from '../services/community'
import { listQuestions } from '../services/questions'
import { LoadMore } from '../components/LoadMore'

const STEPS = [1, 2, 3] as const

export default function Bounties() {
  const { t, tn } = useI18n()
  // Primes ouvertes, les plus élevées d'abord, 20 par page ; total et nombre viennent des chiffres du serveur
  const openQuery = useInfiniteQuery({
    queryKey: ['questions', 'bounties-open'],
    queryFn: ({ pageParam }) => listQuestions({ tab: 'primes', sort: 'bounty', page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.lastPage ? last.page + 1 : undefined),
  })
  const { data: paidPage } = useQuery({ queryKey: ['questions', 'bounties-paid'], queryFn: () => listQuestions({ tab: 'payees', perPage: 5 }) })
  const { data: stats } = useQuery({ queryKey: ['stats'], queryFn: getStats })
  const open = openQuery.data?.pages.flatMap((p) => p.data) ?? []
  const paid = paidPage?.data ?? []
  const total = stats?.openBountiesTotal ?? 0
  const openCount = stats?.openBounties ?? open.length
  const isLoading = openQuery.isLoading

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        <h1 className="text-[26px]">{t('bt.title')}</h1>
        <p className="mt-1 mb-5 text-sm text-muted">{t('bt.subtitle')}</p>

        <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-[14px] border border-line bg-line">
          <div className="bg-surface p-4">
            <b className="block font-display text-[28px] text-gold tabular-nums">{formatFcfa(total)}</b>
            <span className="text-[13px] text-muted">{t('bt.at_stake')}</span>
          </div>
          <div className="bg-surface p-4">
            <b className="block font-display text-[28px] tabular-nums">{openCount}</b>
            <span className="text-[13px] text-muted">{tn('bt.with_bounty', openCount)}</span>
          </div>
        </div>

        {isLoading ? (
          <p className="py-10 text-center text-muted">{t('bt.loading')}</p>
        ) : open.length ? (
          <div className="flex flex-col gap-2.5">
            {open.map((q) => (
              <QuestionCard key={q.id} question={q} />
            ))}
            <LoadMore hasMore={!!openQuery.hasNextPage} loading={openQuery.isFetchingNextPage} onLoad={() => openQuery.fetchNextPage()} />
          </div>
        ) : (
          <div className="rounded-[14px] border border-dashed border-line bg-surface px-5 py-10 text-center text-muted">{t('bt.empty')}</div>
        )}

        {paid.length > 0 && (
          <>
            <h2 className="mt-8 mb-3 text-lg">{t('bt.recent')}</h2>
            <div className="flex flex-col gap-2.5">
              {paid.map((q) => (
                <QuestionCard key={q.id} question={q} />
              ))}
            </div>
          </>
        )}
      </div>

      <aside className="sticky top-7 rounded-[14px] border border-line bg-surface p-5">
        <h2 className="mb-4 flex items-center gap-2 text-base">
          <Icon name="coin" />
          {t('bt.how')}
        </h2>
        <ol className="flex flex-col gap-4">
          {STEPS.map((i) => (
            <li key={i} className="grid grid-cols-[28px_1fr] gap-3">
              <span className="grid size-7 place-items-center rounded-full bg-gold-soft font-display text-sm font-extrabold text-gold">{i}</span>
              <span>
                <b className="block text-sm">{t(`bt.step${i}_title` as Key)}</b>
                <span className="text-[13px] text-muted">{t(`bt.step${i}` as Key)}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-5 rounded-lg bg-sunk p-3 text-xs text-muted">{t('bt.note')}</p>
      </aside>
    </div>
  )
}
