import { useQuery } from '@tanstack/react-query'
import { Icon } from '../components/Icon'
import { QuestionCard } from '../components/QuestionCard'
import { formatFcfa } from '../lib/format'
import { listQuestions } from '../services/questions'

const STEPS = [
  { title: 'Une prime est proposée', text: "L'auteur bloque un montant par Wave, Orange Money, Free Money ou carte." },
  { title: 'Vous répondez', text: 'Proposez une solution claire, avec du code si possible.' },
  { title: 'Votre réponse est validée', text: 'La prime vous est versée automatiquement, avec +50 points de réputation.' },
]

export default function Bounties() {
  const { data: questions = [], isLoading } = useQuery({ queryKey: ['questions'], queryFn: listQuestions })
  const open = questions.filter((q) => q.bounty && !q.solved).sort((a, b) => b.bounty!.amount - a.bounty!.amount)
  const paid = questions.filter((q) => q.bounty?.status === 'paid')
  const total = open.reduce((sum, q) => sum + q.bounty!.amount, 0)

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        <h1 className="text-[26px]">Primes</h1>
        <p className="mt-1 mb-5 text-sm text-muted">Aidez un développeur et soyez payé en mobile money.</p>

        <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-[14px] border border-line bg-line">
          <div className="bg-surface p-4">
            <b className="block font-display text-[28px] text-gold tabular-nums">{formatFcfa(total)}</b>
            <span className="text-[13px] text-muted">en jeu en ce moment</span>
          </div>
          <div className="bg-surface p-4">
            <b className="block font-display text-[28px] tabular-nums">{open.length}</b>
            <span className="text-[13px] text-muted">{open.length > 1 ? 'questions avec prime' : 'question avec prime'}</span>
          </div>
        </div>

        {isLoading ? (
          <p className="py-10 text-center text-muted">Chargement des primes…</p>
        ) : open.length ? (
          <div className="flex flex-col gap-2.5">
            {open.map((q) => (
              <QuestionCard key={q.id} question={q} />
            ))}
          </div>
        ) : (
          <div className="rounded-[14px] border border-dashed border-line bg-surface px-5 py-10 text-center text-muted">
            Toutes les primes ont été attribuées. Revenez bientôt.
          </div>
        )}

        {paid.length > 0 && (
          <>
            <h2 className="mt-8 mb-3 text-lg">Récemment versées</h2>
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
          Comment ça marche
        </h2>
        <ol className="flex flex-col gap-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="grid grid-cols-[28px_1fr] gap-3">
              <span className="grid size-7 place-items-center rounded-full bg-gold-soft font-display text-sm font-extrabold text-gold">{i + 1}</span>
              <span>
                <b className="block text-sm">{s.title}</b>
                <span className="text-[13px] text-muted">{s.text}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-5 rounded-lg bg-sunk p-3 text-xs text-muted">
          Sans réponse validée en 7 jours, l'auteur est remboursé. Pendant le concours, les paiements sont en mode test.
        </p>
      </aside>
    </div>
  )
}
