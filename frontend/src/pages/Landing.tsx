import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { Flag } from '../components/Brand'
import { CodeTree } from '../components/CodeTree'
import { DemoButton } from '../components/DemoVideo'
import { Icon } from '../components/Icon'
import { QuestionCard } from '../components/QuestionCard'
import { SearchInput } from '../components/SearchSuggestions'
import { useI18n, type Key } from '../i18n'
import { formatFcfa, formatNumber } from '../lib/format'
import { COUNTRIES } from '../lib/money'
import { getStats } from '../services/community'
import { listQuestions } from '../services/questions'

const STEPS = [1, 2, 3] as const

export default function Landing() {
  const navigate = useNavigate()
  const { t, tn, country, payment } = useI18n()
  const { data: questions = [] } = useQuery({ queryKey: ['questions'], queryFn: listQuestions })
  const { data: stats } = useQuery({ queryKey: ['stats'], queryFn: getStats })
  const bounties = questions.filter((q) => q.bounty && !q.solved).sort((a, b) => b.bounty!.amount - a.bounty!.amount)
  const plural = (n: number | undefined) => n ?? 2 // libellé au pluriel pendant le chargement des chiffres

  return (
    <div className="px-4 pb-16 md:px-10 xl:px-16">
      <section className="grid items-center gap-10 py-10 lg:grid-cols-[1fr_1.05fr] lg:py-12">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-green-soft px-3 py-1 text-[13px] font-semibold text-green">
            <Icon name="spark" className="size-4" />
            {t('landing.tagline')}
          </span>
          <h1 className="mt-4 text-[clamp(36px,5.4vw,64px)] font-extrabold tracking-tight">
            {t('landing.title_before')}
            <span className="text-green">{t('landing.title_accent')}</span>
            {t('landing.title_after')}
          </h1>
          <p className="mt-4 mb-6 max-w-[52ch] text-[17px] text-muted">{t('landing.intro')}</p>
          <form
            className="relative flex max-w-[560px] items-center gap-2 rounded-[14px] border border-line bg-surface py-1.5 pr-1.5 pl-3.5 text-muted shadow-[0_10px_30px_-18px_rgb(0_0_0/.35)]"
            onSubmit={(e) => {
              e.preventDefault()
              const q = new FormData(e.currentTarget).get('q')?.toString().trim() ?? ''
              navigate(q ? `/app?q=${encodeURIComponent(q)}` : '/app')
            }}
          >
            <Icon name="search" />
            <SearchInput id="landing-search" placeholder={t('landing.search_placeholder')} className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none" />
            <button className="rounded-[10px] bg-green px-4 py-2 text-sm font-semibold text-green-ink">{t('landing.search_button')}</button>
          </form>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
            <DemoButton />
            <Link to="/app" className="text-sm font-semibold text-green hover:underline">
              {t('landing.explore')}
            </Link>
          </div>
        </div>
        <CodeTree />
      </section>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-4">
        {/* Vrais chiffres de la base de données */}
        {[
          [stats?.developers, tn('landing.stat_devs', plural(stats?.developers))],
          [stats?.solvedQuestions, tn('landing.stat_solved', plural(stats?.solvedQuestions))],
          [stats?.countries, t('landing.stat_countries')],
          [stats?.bountiesPaid, t('landing.stat_bounties')],
        ].map(([n, l]) => (
          <div key={l} className="bg-surface p-5">
            <b className="block font-display text-[28px] tabular-nums">{n === undefined ? '–' : formatNumber(n as number)}</b>
            <span className="text-[13px] text-muted">{l}</span>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {STEPS.map((i) => (
          <div key={i} className="rounded-[14px] border border-line bg-surface p-[18px]">
            <div className="font-display text-[13px] font-extrabold text-green">{t('landing.step', { n: i })}</div>
            <h3 className="my-1.5 text-[17px]">{t(`landing.step${i}_title` as Key)}</h3>
            <p className="text-sm text-muted">{t(`landing.step${i}_text` as Key)}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <h2 className="mb-3.5 text-xl">{t('landing.recent')}</h2>
          <div className="flex flex-col gap-2.5">
            {questions.slice(0, 3).map((q) => (
              <QuestionCard key={q.id} question={q} />
            ))}
          </div>
        </div>
        <div>
          <h2 className="mb-3.5 text-xl">{t('landing.open_bounties')}</h2>
          <div className="rounded-[14px] border border-line bg-surface px-4 py-2">
            {bounties.map((q) => (
              <Link key={q.id} to={`/app/questions/${q.id}`} className="flex flex-col gap-1 border-line py-2.5 not-first-of-type:border-t">
                <span className="text-[13.5px] leading-snug font-semibold">{q.title}</span>
                <span className="inline-flex w-fit items-center gap-1 rounded-full bg-gold-soft px-2.5 py-0.5 text-xs font-bold text-gold">
                  <Icon name="coin" className="size-3.5" />
                  {formatFcfa(q.bounty!.amount)} · {payment(q.bounty!.method)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-x-4.5 gap-y-2.5 text-sm text-muted">
        {COUNTRIES.map((code) => (
          <span key={code} className="inline-flex items-center gap-1.5">
            <Flag code={code} />
            {country(code)}
          </span>
        ))}
        <span>{t('landing.more_countries')}</span>
      </div>

      <div className="mt-12 flex flex-wrap items-center justify-between gap-5 rounded-[20px] bg-green p-9 text-green-ink">
        <div>
          <h2 className="text-[clamp(22px,3vw,30px)]">{t('landing.cta_title')}</h2>
          <p className="mt-1.5 opacity-85">{t('landing.cta_text')}</p>
        </div>
        <Link to="/inscription" className="rounded-[10px] bg-green-ink px-4 py-2.5 text-sm font-semibold text-green">
          {t('common.join_palabre')}
        </Link>
      </div>
    </div>
  )
}
