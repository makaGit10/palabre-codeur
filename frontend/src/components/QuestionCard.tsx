import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useI18n } from '../i18n'
import { formatFcfa, timeAgo } from '../lib/format'
import { localHint } from '../lib/money'
import type { Question } from '../types'
import { Avatar, Flag } from './Brand'
import { Icon } from './Icon'

export function QuestionCard({ question: q }: { question: Question }) {
  const { t, tn } = useI18n()
  const openBounty = q.bounty && !q.solved
  const { user } = useAuth()
  const hint = q.bounty ? localHint(q.bounty.amount, user?.country ?? 'SN') : null
  return (
    <article
      className={`relative grid grid-cols-[56px_1fr] gap-3 rounded-[14px] border border-line bg-surface p-4 transition hover:-translate-y-px hover:border-green sm:grid-cols-[62px_1fr] sm:gap-3.5 ${
        openBounty ? 'border-l-[3px] border-l-gold-bg' : ''
      }`}
    >
      <div className="flex flex-col gap-1.5 text-center text-xs text-muted">
        <div>
          <b className="block font-display text-[17px] text-ink">{q.votes}</b>
          {t('q.votes')}
        </div>
        <div className={`text-[11px] sm:text-xs ${q.solved ? 'rounded-lg bg-green py-0.5 text-green-ink' : ''}`}>
          <b className={`block font-display text-[17px] ${q.solved ? '' : 'text-ink'}`}>{q.answersCount}</b>
          {tn('q.answers', q.answersCount)}
        </div>
      </div>
      <div className="min-w-0">
        <h3 className="m-0 font-sans text-base font-bold leading-snug">
          {/* Le lien couvre toute la carte grâce à l'after:absolute */}
          <Link to={`/app/questions/${q.id}`} className="after:absolute after:inset-0">
            {q.title}
          </Link>
        </h3>
        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[12.5px] text-muted">
          {q.tags.map((tag) => (
            <Link
              key={tag}
              to={`/app?tag=${tag}`}
              className="relative z-10 rounded-md bg-green-soft px-2 py-[3px] font-mono text-[11.5px] text-green"
            >
              {tag}
            </Link>
          ))}
          <span className="flex-1" />
          {openBounty && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gold-soft px-2.5 py-[3px] text-xs font-bold text-gold">
              <Icon name="coin" className="size-3.5" />
              {formatFcfa(q.bounty!.amount)}
              {hint && <span className="font-normal opacity-80">{hint}</span>}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
            <Avatar user={q.author} size="sm" />
            {q.author.name} <Flag code={q.author.country} />
          </span>
          <span>{timeAgo(q.createdAt)}</span>
        </div>
      </div>
    </article>
  )
}
