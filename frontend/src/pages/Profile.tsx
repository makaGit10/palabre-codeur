import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { Avatar, Flag } from '../components/Brand'
import { TopBounties, TopContributors, WithAside } from '../components/CommunityAside'
import { Icon } from '../components/Icon'
import { QuestionCard } from '../components/QuestionCard'
import { useAuth } from '../hooks/useAuth'
import { hasKey, useI18n } from '../i18n'
import { formatNumber } from '../lib/format'
import { localHint } from '../lib/money'
import { getProfile } from '../services/community'

export default function Profile() {
  const { t, tn, country } = useI18n()
  const id = Number(useParams().id)
  const { user: me } = useAuth()
  const { data: p, isLoading, isError } = useQuery({ queryKey: ['profile', id], queryFn: () => getProfile(id) })

  if (isLoading) return <p className="py-16 text-center text-muted">{t('pf.loading')}</p>
  if (isError || !p)
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl">{t('pf.not_found')}</h1>
        <Link to="/app" className="mt-4 inline-block font-semibold text-green">
          {t('common.back_feed')}
        </Link>
      </div>
    )

  const hint = localHint(p.user.bountyEarnings, p.user.country)
  const kpis = [
    { value: formatNumber(p.user.reputation), label: t('pf.rep') },
    { value: p.answersCount, label: tn('q.answers', p.answersCount) },
    { value: p.questionsCount, label: tn('pf.questions', p.questionsCount) },
    { value: formatNumber(p.user.bountyEarnings), label: `${t('pf.earned')}${hint ? ` (${hint})` : ''}`, gold: true },
  ]
  // Les badges ont un nom traduit quand il est connu, sinon celui enregistré
  const badgeLabel = (b: { slug: string; label: string }) => {
    const key = `badge.${b.slug}`
    return hasKey(key) ? t(key) : b.label
  }

  return (
    <WithAside aside={<><TopContributors /><TopBounties /></>}>
      <div>
      <header className="flex flex-wrap items-center gap-5">
        <Avatar user={p.user} size="lg" />
        <div>
          <h1 className="text-[26px]">
            {p.user.name}
            {p.user.id === me?.id && <span className="ml-2 font-sans text-sm font-medium text-muted">{t('pf.you')}</span>}
          </h1>
          <p className="mt-1 flex items-center gap-2 text-muted">
            <Flag code={p.user.country} />
            {p.user.city}, {country(p.user.country)}
          </p>
        </div>
        {me && p.user.id !== me.id && (
          <Link
            to={`/app/messages/${p.user.id}`}
            className="inline-flex items-center gap-2 rounded-[10px] bg-green px-4 py-2.5 text-sm font-semibold text-green-ink hover:brightness-110 sm:ml-auto"
          >
            <Icon name="mail" />
            {t('pf.write_to', { name: p.user.name.split(' ')[0] })}
          </Link>
        )}
        {p.user.id === me?.id && (
          <Link
            to="/app/portefeuille"
            className="inline-flex items-center gap-2 rounded-[10px] border border-line bg-surface px-4 py-2.5 text-sm font-semibold hover:border-green sm:ml-auto"
          >
            <Icon name="wallet" />
            {t('pf.my_wallet')}
          </Link>
        )}
      </header>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-line bg-surface p-4">
            <b className={`block font-display text-2xl tabular-nums ${k.gold ? 'text-gold' : ''}`}>{k.value}</b>
            <span className="text-[12.5px] text-muted">{k.label}</span>
          </div>
        ))}
      </div>

      <h2 className="mt-8 mb-3 text-lg">{t('pf.badges')}</h2>
      {p.badges.length ? (
        <div className="flex flex-wrap gap-2">
          {p.badges.map((b) => (
            <span key={b.slug} className="inline-flex items-center gap-2 rounded-[10px] border border-line bg-surface px-3 py-2 text-[13px] font-semibold">
              <span className="text-base">{b.icon}</span>
              {badgeLabel(b)}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">{t('pf.no_badges')}</p>
      )}

      <h2 className="mt-8 mb-3 text-lg">{t('pf.activity')}</h2>
      {p.activity.length ? (
        <div className="flex flex-col gap-2.5">
          {p.activity.map((q) => (
            <QuestionCard key={q.id} question={q} />
          ))}
        </div>
      ) : (
        <div className="rounded-[14px] border border-dashed border-line bg-surface px-5 py-10 text-center text-muted">{t('pf.no_activity')}</div>
      )}
      </div>
    </WithAside>
  )
}
