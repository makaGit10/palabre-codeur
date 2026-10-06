import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { Avatar, Flag } from '../components/Brand'
import { QuestionCard } from '../components/QuestionCard'
import { COUNTRY_NAMES, formatNumber } from '../lib/format'
import { localHint } from '../lib/money'
import { Icon } from '../components/Icon'
import { useAuth } from '../hooks/useAuth'
import { getProfile } from '../services/community'

export default function Profile() {
  const id = Number(useParams().id)
  const { user: me } = useAuth()
  const { data: p, isLoading, isError } = useQuery({ queryKey: ['profile', id], queryFn: () => getProfile(id) })

  if (isLoading) return <p className="py-16 text-center text-muted">Chargement du profil…</p>
  if (isError || !p)
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl">Profil introuvable</h1>
        <Link to="/app" className="mt-4 inline-block font-semibold text-green">
          Retour au fil
        </Link>
      </div>
    )

  const kpis = [
    { value: formatNumber(p.user.reputation), label: 'points de réputation' },
    { value: p.answersCount, label: p.answersCount > 1 ? 'réponses' : 'réponse' },
    { value: p.questionsCount, label: p.questionsCount > 1 ? 'questions' : 'question' },
    {
      value: formatNumber(p.user.bountyEarnings),
      label: `FCFA de primes gagnées${localHint(p.user.bountyEarnings, p.user.country) ? ` (${localHint(p.user.bountyEarnings, p.user.country)})` : ''}`,
      gold: true,
    },
  ]

  return (
    <div className="max-w-[1000px]">
      <header className="flex flex-wrap items-center gap-5">
        <Avatar user={p.user} size="lg" />
        <div>
          <h1 className="text-[26px]">
            {p.user.name}
            {p.user.id === me?.id && <span className="ml-2 font-sans text-sm font-medium text-muted">(vous)</span>}
          </h1>
          <p className="mt-1 flex items-center gap-2 text-muted">
            <Flag code={p.user.country} />
            {p.user.city}, {COUNTRY_NAMES[p.user.country]}
          </p>
        </div>
        {me && p.user.id !== me.id && (
          <Link
            to={`/app/messages/${p.user.id}`}
            className="inline-flex items-center gap-2 rounded-[10px] bg-green px-4 py-2.5 text-sm font-semibold text-green-ink hover:brightness-110 sm:ml-auto"
          >
            <Icon name="mail" />
            Écrire à {p.user.name.split(' ')[0]}
          </Link>
        )}
        {p.user.id === me?.id && (
          <Link
            to="/app/portefeuille"
            className="inline-flex items-center gap-2 rounded-[10px] border border-line bg-surface px-4 py-2.5 text-sm font-semibold hover:border-green sm:ml-auto"
          >
            <Icon name="wallet" />
            Mon portefeuille
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

      <h2 className="mt-8 mb-3 text-lg">Badges</h2>
      {p.badges.length ? (
        <div className="flex flex-wrap gap-2">
          {p.badges.map((b) => (
            <span key={b.label} className="inline-flex items-center gap-2 rounded-[10px] border border-line bg-surface px-3 py-2 text-[13px] font-semibold">
              <span className="text-base">{b.icon}</span>
              {b.label}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">Pas encore de badge.</p>
      )}

      <h2 className="mt-8 mb-3 text-lg">Activité</h2>
      {p.activity.length ? (
        <div className="flex flex-col gap-2.5">
          {p.activity.map((q) => (
            <QuestionCard key={q.id} question={q} />
          ))}
        </div>
      ) : (
        <div className="rounded-[14px] border border-dashed border-line bg-surface px-5 py-10 text-center text-muted">
          Pas encore d'activité.
        </div>
      )}
    </div>
  )
}
