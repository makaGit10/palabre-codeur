import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { Flag } from '../components/Brand'
import { CodeTree } from '../components/CodeTree'
import { Icon } from '../components/Icon'
import { QuestionCard } from '../components/QuestionCard'
import { COUNTRY_NAMES, formatFcfa, formatNumber, PAYMENT_LABELS } from '../lib/format'
import { getStats } from '../services/community'
import type { CountryCode } from '../types'
import { listQuestions } from '../services/questions'

const STEPS = [
  { title: 'Posez votre question', text: "L'IA vous montre d'abord les questions déjà résolues qui ressemblent à la vôtre." },
  { title: 'La communauté répond', text: 'Des devs de tout le continent proposent leurs solutions et votent pour la meilleure.' },
  { title: 'Celui qui aide est récompensé', text: 'Réputation, badges, et une prime en FCFA si vous en avez proposé une.' },
]

export default function Landing() {
  const navigate = useNavigate()
  const { data: questions = [] } = useQuery({ queryKey: ['questions'], queryFn: listQuestions })
  const { data: stats } = useQuery({ queryKey: ['stats'], queryFn: getStats })
  const bounties = questions.filter((q) => q.bounty && !q.solved).sort((a, b) => b.bounty!.amount - a.bounty!.amount)

  return (
    <div className="px-4 pb-16 md:px-10 xl:px-16">
      <section className="grid items-center gap-10 py-10 lg:grid-cols-[1fr_1.05fr] lg:py-12">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-green-soft px-3 py-1 text-[13px] font-semibold text-green">
            <Icon name="spark" className="size-4" />
            Pour les devs, par les devs
          </span>
          <h1 className="mt-4 text-[clamp(36px,5.4vw,64px)] font-extrabold tracking-tight">
            L'arbre à palabres des <span className="text-green">développeurs africains</span>.
          </h1>
          <p className="mt-4 mb-6 max-w-[52ch] text-[17px] text-muted">
            Posez vos questions, partagez du code pour les API de chez nous, et soyez récompensé quand vous aidez. Wave,
            Orange Money, paie OHADA, connexion 3G : ici, on connaît vos problèmes.
          </p>
          <form
            className="flex max-w-[560px] items-center gap-2 rounded-[14px] border border-line bg-surface py-1.5 pr-1.5 pl-3.5 text-muted shadow-[0_10px_30px_-18px_rgb(0_0_0/.35)]"
            onSubmit={(e) => {
              e.preventDefault()
              const q = new FormData(e.currentTarget).get('q')?.toString().trim() ?? ''
              navigate(q ? `/app?q=${encodeURIComponent(q)}` : '/app')
            }}
          >
            <Icon name="search" />
            <input id="landing-search" name="q" placeholder="Comment intégrer Wave dans Laravel ?" className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none" />
            <button className="rounded-[10px] bg-green px-4 py-2 text-sm font-semibold text-green-ink">Chercher</button>
          </form>
        </div>
        <CodeTree />
      </section>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-4">
        {/* Vrais chiffres de la base de données */}
        {[
          [stats?.developers, stats?.developers === 1 ? 'développeur inscrit' : 'développeurs inscrits'],
          [stats?.solvedQuestions, stats?.solvedQuestions === 1 ? 'question résolue' : 'questions résolues'],
          [stats?.countries, 'pays représentés'],
          [stats?.bountiesPaid, 'FCFA de primes versées'],
        ].map(([n, l]) => (
          <div key={l} className="bg-surface p-5">
            <b className="block font-display text-[28px] tabular-nums">{n === undefined ? '–' : formatNumber(n as number)}</b>
            <span className="text-[13px] text-muted">{l}</span>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <div key={s.title} className="rounded-[14px] border border-line bg-surface p-[18px]">
            <div className="font-display text-[13px] font-extrabold text-green">ÉTAPE {i + 1}</div>
            <h3 className="my-1.5 text-[17px]">{s.title}</h3>
            <p className="text-sm text-muted">{s.text}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <h2 className="mb-3.5 text-xl">Questions récentes</h2>
          <div className="flex flex-col gap-2.5">
            {questions.slice(0, 3).map((q) => (
              <QuestionCard key={q.id} question={q} />
            ))}
          </div>
        </div>
        <div>
          <h2 className="mb-3.5 text-xl">Primes en cours</h2>
          <div className="rounded-[14px] border border-line bg-surface px-4 py-2">
            {bounties.map((q) => (
              <Link key={q.id} to={`/app/questions/${q.id}`} className="flex flex-col gap-1 border-line py-2.5 not-first-of-type:border-t">
                <span className="text-[13.5px] leading-snug font-semibold">{q.title}</span>
                <span className="inline-flex w-fit items-center gap-1 rounded-full bg-gold-soft px-2.5 py-0.5 text-xs font-bold text-gold">
                  <Icon name="coin" className="size-3.5" />
                  {formatFcfa(q.bounty!.amount)} · {PAYMENT_LABELS[q.bounty!.method]}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-x-4.5 gap-y-2.5 text-sm text-muted">
        {(Object.keys(COUNTRY_NAMES) as CountryCode[]).map((code) => (
          <span key={code} className="inline-flex items-center gap-1.5">
            <Flag code={code} />
            {COUNTRY_NAMES[code]}
          </span>
        ))}
        <span>D'autres pays arrivent bientôt.</span>
      </div>

      <div className="mt-12 flex flex-wrap items-center justify-between gap-5 rounded-[20px] bg-green p-9 text-green-ink">
        <div>
          <h2 className="text-[clamp(22px,3vw,30px)]">Votre savoir vaut de l'or.</h2>
          <p className="mt-1.5 opacity-85">Rejoignez les développeurs qui construisent le web africain ensemble.</p>
        </div>
        <Link to="/inscription" className="rounded-[10px] bg-green-ink px-4 py-2.5 text-sm font-semibold text-green">
          Rejoindre Palabre
        </Link>
      </div>
    </div>
  )
}
