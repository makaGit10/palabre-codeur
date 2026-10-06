import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { Markdown } from '../components/Markdown'
import { AuthorChip, MarkdownEditor, VoteBox } from '../components/Post'
import { ShareButton } from '../components/ShareDialog'
import { useToast } from '../components/toastContext'
import { formatFcfa, PAYMENT_LABELS, timeAgo } from '../lib/format'
import { useAuth } from '../hooks/useAuth'
import { errorMessage } from '../lib/api'
import { acceptAnswer, addAnswer, getQuestion, rateSuggestion, vote } from '../services/questions'
import type { PaymentMethod, QuestionDetail, VoteValue } from '../types'

export default function QuestionPage() {
  const id = Number(useParams().id)
  const queryClient = useQueryClient()
  const toast = useToast()
  const { user, isLoading: authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { data: q, isLoading, isError } = useQuery({ queryKey: ['question', id], queryFn: () => getQuestion(id) })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['question', id] })
    queryClient.invalidateQueries({ queryKey: ['questions'] })
    queryClient.invalidateQueries({ queryKey: ['profile'] })
    queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
    queryClient.invalidateQueries({ queryKey: ['wallet'] })
  }

  const voteMutation = useMutation({
    mutationFn: (v: { target: { type: 'question' } | { type: 'answer'; id: number }; value: VoteValue }) => vote(id, v.target, v.value),
    onSuccess: refresh,
    onError: (e) => toast(errorMessage(e), 'bell'),
  })

  // Lire est libre ; participer demande un compte
  const requireLogin = () => {
    if (user) return true
    if (authLoading) return false // compte encore en cours de vérification : on ignore le clic
    navigate('/connexion', { state: { from: location.pathname } })
    return false
  }
  const castVote = (v: { target: { type: 'question' } | { type: 'answer'; id: number }; value: VoteValue }) => {
    if (requireLogin()) voteMutation.mutate(v)
  }

  const acceptMutation = useMutation({
    mutationFn: (answerId: number) => acceptAnswer(id, answerId),
    onSuccess: ({ recipient, bountyPaid }) => {
      refresh()
      if (bountyPaid) {
        toast(
          `${formatFcfa(bountyPaid.amount)} envoyés à ${recipient.name} via ${PAYMENT_LABELS[bountyPaid.method as PaymentMethod]} · +65 pts (paiement test)`,
          'coin',
        )
      } else {
        toast(`Réponse validée · +15 pts pour ${recipient.name}`)
      }
    },
    onError: (e) => toast(errorMessage(e), 'bell'),
  })

  const aiMutation = useMutation({
    mutationFn: (v: { suggestionId: number; feedback: 'up' | 'down' }) => rateSuggestion(v.suggestionId, v.feedback),
    onSuccess: refresh,
    onError: (e) => toast(errorMessage(e), 'bell'),
  })
  const rate = (suggestionId: number, feedback: 'up' | 'down') => {
    if (requireLogin()) aiMutation.mutate({ suggestionId, feedback })
  }

  if (isLoading) return <p className="py-16 text-center text-muted">Chargement de la question…</p>
  if (isError || !q)
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl">Question introuvable</h1>
        <Link to="/app" className="mt-4 inline-block font-semibold text-green">
          Retour au fil
        </Link>
      </div>
    )

  const isMine = q.author.id === user?.id

  return (
    <div className="max-w-[900px]">
      <Link to="/app" className="mb-3.5 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-muted hover:text-ink">
        <Icon name="left" className="size-4" />
        Retour au fil
      </Link>

      <h1 className="text-[clamp(22px,2.6vw,30px)]">{q.title}</h1>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-muted">
        <span>Posée {timeAgo(q.createdAt)}</span>
        <span>· vue {q.views} fois</span>
        {q.solved && (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-soft px-2.5 py-0.5 text-xs font-bold text-green">
            <Icon name="check" className="size-3.5" />
            Résolue
          </span>
        )}
      </div>

      {q.bounty && <BountyBanner q={q} />}

      <article className="grid grid-cols-[38px_1fr] gap-2.5 border-b border-line py-5 sm:grid-cols-[44px_1fr] sm:gap-4">
        <VoteBox votes={q.votes} myVote={q.myVote} onVote={(value) => castVote({ target: { type: 'question' }, value })} />
        <div className="min-w-0">
          <Markdown>{q.body}</Markdown>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {q.tags.map((t) => (
                <Link key={t} to={`/app?tag=${t}`} className="rounded-md bg-green-soft px-2 py-[3px] font-mono text-[11.5px] text-green">
                  {t}
                </Link>
              ))}
              <ShareButton item={{ type: 'question', id: q.id, title: q.title }} compact />
            </div>
            <AuthorChip user={q.author} date={q.createdAt} label="Posée par" />
          </div>
        </div>
      </article>

      {q.aiSuggestion && (
        <section className="mt-5 rounded-[14px] border border-green/35 bg-green-soft p-4">
          <h2 className="flex items-start gap-2 font-sans text-sm font-bold text-green">
            <Icon name="spark" />
            <span>
              Suggestion de l'IA <span className="font-medium text-muted">· à vérifier par la communauté</span>
            </span>
          </h2>
          <p className="my-2.5 text-sm">{q.aiSuggestion.text}</p>
          {q.aiSuggestion.feedback ? (
            <p className="text-[13px] font-semibold text-green">
              {q.aiSuggestion.feedback === 'up'
                ? 'Merci, votre avis aide à améliorer les suggestions.'
                : 'Signalement envoyé. Un modérateur va vérifier.'}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button onClick={() => rate(q.aiSuggestion!.id, 'up')} className="rounded-lg border border-line bg-surface px-3 py-1.5 text-[13px] font-semibold">
                👍 Utile
              </button>
              <button onClick={() => rate(q.aiSuggestion!.id, 'down')} className="rounded-lg border border-line bg-surface px-3 py-1.5 text-[13px] font-semibold">
                Signaler une erreur
              </button>
            </div>
          )}
        </section>
      )}

      <h2 className="mt-8 text-[19px]">
        {q.answers.length} {q.answers.length > 1 ? 'réponses' : 'réponse'}
      </h2>

      {q.answers.length === 0 && (
        <div className="mt-3 rounded-[14px] border border-dashed border-line bg-surface px-5 py-8 text-center text-muted">
          Pas encore de réponse. Soyez la première personne à aider
          {q.bounty?.status === 'held' && <> et gagnez {formatFcfa(q.bounty.amount)}</>}.
        </div>
      )}

      {q.answers.map((a) => (
        <article
          key={a.id}
          className={`mt-3 grid grid-cols-[38px_1fr] gap-2.5 py-5 sm:grid-cols-[44px_1fr] sm:gap-4 ${
            a.accepted ? 'rounded-xl border border-green/30 bg-green-soft/60 px-3' : 'border-b border-line'
          }`}
        >
          <div className="flex flex-col items-center gap-2">
            <VoteBox
              votes={a.votes}
              myVote={a.myVote}
              onVote={(value) => castVote({ target: { type: 'answer', id: a.id }, value })}
            />
            {a.accepted && (
              <span className="text-green" title="Réponse validée">
                <Icon name="check" className="size-6" />
              </span>
            )}
          </div>
          <div className="min-w-0">
            {a.accepted && (
              <p className="mb-2 inline-flex items-center gap-1 text-xs font-bold text-green">
                <Icon name="check" className="size-3.5" />
                Réponse validée par {q.author.name}
              </p>
            )}
            <Markdown>{a.body}</Markdown>
            <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
              {isMine && !q.solved ? (
                <button
                  onClick={() => acceptMutation.mutate(a.id)}
                  disabled={acceptMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-[10px] bg-green px-4 py-2.5 text-sm font-semibold text-green-ink hover:brightness-110 disabled:opacity-60"
                >
                  <Icon name="check" />
                  Valider cette réponse
                  {q.bounty?.status === 'held' && <> et verser {formatFcfa(q.bounty.amount)}</>}
                </button>
              ) : (
                <span />
              )}
              <AuthorChip user={a.author} date={a.createdAt} label="Réponse de" />
            </div>
          </div>
        </article>
      ))}

      <ReplyForm questionId={id} onDone={refresh} loggedIn={!!user} />
    </div>
  )
}

function BountyBanner({ q }: { q: QuestionDetail }) {
  const b = q.bounty!
  if (b.status === 'paid')
    return (
      <div className="mt-4 flex items-center gap-3 rounded-xl border border-green/30 bg-green-soft px-4 py-3 text-[13.5px]">
        <Icon name="coin" />
        <span>
          Prime de <b>{formatFcfa(b.amount)}</b> versée à la personne dont la réponse a été validée.
        </span>
      </div>
    )
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-gold-bg/40 bg-gold-soft px-4 py-3 text-[13.5px]">
      <span className="font-display text-[22px] font-extrabold whitespace-nowrap text-gold">{formatFcfa(b.amount)}</span>
      <span>
        Prime offerte par {q.author.name}, payée par <b>{PAYMENT_LABELS[b.method]}</b> à la personne dont la réponse sera validée.
      </span>
    </div>
  )
}

function ReplyForm({ questionId, onDone, loggedIn }: { questionId: number; onDone: () => void; loggedIn: boolean }) {
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const toast = useToast()
  const mutation = useMutation({
    mutationFn: () => addAnswer(questionId, body.trim()),
    onSuccess: () => {
      setBody('')
      onDone()
      toast('Réponse publiée')
    },
    onError: (e) => setError(errorMessage(e)),
  })
  const location = useLocation()

  if (!loggedIn)
    return (
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-line bg-surface p-5">
        <p className="text-sm">
          <b className="block font-display text-base">Vous connaissez la réponse ?</b>
          <span className="text-muted">Connectez-vous pour aider et gagner de la réputation.</span>
        </p>
        <Link
          to="/connexion"
          state={{ from: location.pathname }}
          className="rounded-[10px] bg-green px-4 py-2.5 text-sm font-semibold text-green-ink hover:brightness-110"
        >
          Se connecter pour répondre
        </Link>
      </div>
    )

  return (
    <form
      className="mt-8 rounded-[14px] border border-line bg-surface p-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (body.trim().length < 20) {
          setError('Votre réponse est trop courte : écrivez au moins 20 caractères.')
          return
        }
        setError('')
        mutation.mutate()
      }}
    >
      <label htmlFor="reply" className="mb-2.5 block font-display text-base font-bold">
        Votre réponse
      </label>
      <MarkdownEditor
        id="reply"
        value={body}
        onChange={setBody}
        invalid={!!error}
        placeholder="Expliquez la solution. Mettez le code entre ``` pour le colorer."
      />
      {error && <p className="mt-2 text-[13px] text-red">{error}</p>}
      <div className="mt-3 flex justify-end">
        <button disabled={mutation.isPending} className="rounded-[10px] bg-green px-4 py-2.5 text-sm font-semibold text-green-ink hover:brightness-110 disabled:opacity-60">
          {mutation.isPending ? 'Publication…' : 'Publier ma réponse'}
        </button>
      </div>
    </form>
  )
}
