import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import { formatFcfa, formatNumber } from '../lib/format'
import { getLeaderboard } from '../services/community'
import { listQuestions } from '../services/questions'
import type { Question } from '../types'
import { Avatar, Flag } from './Brand'
import { Icon, type IconName } from './Icon'

// Colonne de droite partagée par les pages de l'application (fil, question, notifications, profil…) :
// visible à partir de 1280 px, collante pendant le défilement, pour que l'écran ne reste jamais vide.

export function WithAside({ children, aside }: { children: ReactNode; aside: ReactNode }) {
  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_360px] 2xl:gap-8">
      <div className="min-w-0">{children}</div>
      <aside className="sticky top-7 hidden flex-col gap-4 xl:flex">{aside}</aside>
    </div>
  )
}

function Section({ icon, title, children }: { icon: IconName; title: string; children: ReactNode }) {
  return (
    <section className="rounded-[14px] border border-line bg-surface p-4">
      <h3 className="mb-3 flex items-center gap-2 text-[15px]">
        <Icon name={icon} />
        {title}
      </h3>
      {children}
    </section>
  )
}

// Les cinq meilleures réputations de la communauté
export function TopContributors() {
  const { t } = useI18n()
  const { data: leaderboard } = useQuery({ queryKey: ['leaderboard'], queryFn: getLeaderboard })
  const top = leaderboard?.developers.slice(0, 5) ?? []
  if (top.length === 0) return null

  return (
    <Section icon="trophy" title={t('feed.top_contributors')}>
      {top.map((u, i) => (
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
    </Section>
  )
}

// Les trois primes ouvertes les plus élevées
export function TopBounties() {
  const { t } = useI18n()
  const { data } = useQuery({ queryKey: ['questions', 'top-bounties'], queryFn: () => listQuestions({ tab: 'primes', sort: 'bounty', perPage: 3 }) })
  const top = data?.data ?? []
  if (top.length === 0) return null

  return (
    <Section icon="coin" title={t('feed.top_bounties')}>
      {top.map((q) => (
        <Link key={q.id} to={`/app/questions/${q.id}`} className="flex flex-col gap-1 border-line py-2 not-first-of-type:border-t">
          <span className="text-[13.5px] leading-snug font-semibold">{q.title}</span>
          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-gold-soft px-2.5 py-0.5 text-xs font-bold text-gold">
            <Icon name="coin" className="size-3.5" />
            {formatFcfa(q.bounty!.amount)}
          </span>
        </Link>
      ))}
    </Section>
  )
}

// Questions qui partagent au moins une étiquette avec celle qui est affichée (les plus proches d'abord)
export function RelatedQuestions({ question }: { question: Question }) {
  const { t, tn } = useI18n()
  // Le serveur renvoie les questions qui partagent au moins une étiquette ; on garde les plus proches
  const { data } = useQuery({
    queryKey: ['questions', 'related', question.id],
    queryFn: () => listQuestions({ tags: question.tags, exclude: question.id, perPage: 15 }),
  })
  const related = (data?.data ?? [])
    .map((q) => ({ q, shared: q.tags.filter((tag) => question.tags.includes(tag)).length }))
    .sort((a, b) => b.shared - a.shared || b.q.votes - a.q.votes)
    .slice(0, 5)
  if (related.length === 0) return null

  return (
    <Section icon="home" title={t('q.related')}>
      {related.map(({ q }) => (
        <Link key={q.id} to={`/app/questions/${q.id}`} className="flex flex-col gap-0.5 border-line py-2 not-first-of-type:border-t">
          <span className="text-[13.5px] leading-snug font-semibold">{q.title}</span>
          <span className="text-xs text-muted">
            {q.answersCount} {tn('q.answers', q.answersCount)}
            {q.solved && ` · ${t('q.solved')}`}
          </span>
        </Link>
      ))}
    </Section>
  )
}
