import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { RelatedQuestions, TopBounties, WithAside } from '../components/CommunityAside'
import { Icon } from '../components/Icon'
import { Markdown } from '../components/Markdown'
import { AnswerEditor, ConfirmDialog, OwnerActions, QuestionEditor } from '../components/PostEditing'
import { AuthorChip, MarkdownEditor, VoteBox } from '../components/Post'
import { ReportButton } from '../components/ReportButton'
import { ShareButton } from '../components/ShareDialog'
import { useToast } from '../components/toastContext'
import { useAuth } from '../hooks/useAuth'
import { useDeleteAnswer, useDeleteQuestion } from '../hooks/usePostDeletion'
import { useI18n } from '../i18n'
import { errorMessage } from '../lib/api'
import { formatFcfa, timeAgo } from '../lib/format'
import { acceptAnswer, addAnswer, getQuestion, rateSuggestion, vote } from '../services/questions'
import type { Answer, PaymentMethod, QuestionDetail, VoteValue } from '../types'

export default function QuestionPage() {
  const { t, tn, payment } = useI18n()
  const id = Number(useParams().id)
  const queryClient = useQueryClient()
  const toast = useToast()
  const { user, isLoading: authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { data: q, isLoading, isError } = useQuery({ queryKey: ['question', id], queryFn: () => getQuestion(id) })
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const removeQuestion = useDeleteQuestion(id)

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
        toast(t('q.toast_paid', { amount: formatFcfa(bountyPaid.amount), name: recipient.name, method: payment(bountyPaid.method as PaymentMethod) }), 'coin')
      } else {
        toast(t('q.toast_accepted', { name: recipient.name }))
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

  if (isLoading) return <p className="py-16 text-center text-muted">{t('q.loading')}</p>
  if (isError || !q)
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl">{t('q.not_found')}</h1>
        <Link to="/app" className="mt-4 inline-block font-semibold text-green">
          {t('common.back_feed')}
        </Link>
      </div>
    )

  const isMine = q.author.id === user?.id

  return (
    <WithAside aside={<><RelatedQuestions question={q} /><TopBounties /></>}>
      <div>
      <Link to="/app" className="mb-3.5 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-muted hover:text-ink">
        <Icon name="left" className="size-4" />
        {t('common.back_feed')}
      </Link>

      <h1 className="text-[clamp(22px,2.6vw,30px)]">{q.title}</h1>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-muted">
        <span>{t('q.asked', { ago: timeAgo(q.createdAt) })}</span>
        <span>{t('q.views', { n: q.views })}</span>
        {q.editedAt && <span>· {t('edit.edited')}</span>}
        {q.solved && (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-soft px-2.5 py-0.5 text-xs font-bold text-green">
            <Icon name="check" className="size-3.5" />
            {t('q.solved')}
          </span>
        )}
      </div>

      {q.bounty && <BountyBanner q={q} />}

      <article className="grid grid-cols-[38px_1fr] gap-2.5 border-b border-line py-5 sm:grid-cols-[44px_1fr] sm:gap-4">
        <VoteBox votes={q.votes} myVote={q.myVote} onVote={(value) => castVote({ target: { type: 'question' }, value })} />
        <div className="min-w-0">
          {editing ? <QuestionEditor q={q} onDone={() => setEditing(false)} /> : <Markdown>{q.body}</Markdown>}
          <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {q.tags.map((tag) => (
                <Link key={tag} to={`/app?tag=${tag}`} className="rounded-md bg-green-soft px-2 py-[3px] font-mono text-[11.5px] text-green">
                  {tag}
                </Link>
              ))}
              <ShareButton item={{ type: 'question', id: q.id, title: q.title }} compact />
              <ReportButton type="question" id={q.id} authorId={q.author.id} />
              {isMine && !editing && (
                <OwnerActions
                  onEdit={() => setEditing(true)}
                  onDelete={() => setConfirmDelete(true)}
                  canDelete={q.answers.length === 0 && !q.bounty}
                  deleteHint={t(q.bounty ? 'edit.cant_delete_bounty' : 'edit.cant_delete_answers')}
                />
              )}
            </div>
            <AuthorChip user={q.author} date={q.createdAt} label={t('q.asked_by')} />
          </div>
        </div>
      </article>
      {confirmDelete && (
        <ConfirmDialog
          title={t('edit.delete_question_title')}
          text={t('edit.delete_question_text')}
          confirm={t('edit.delete')}
          pending={removeQuestion.isPending}
          error={removeQuestion.error}
          onConfirm={() => removeQuestion.mutate()}
          onClose={() => setConfirmDelete(false)}
        />
      )}

      {q.aiSuggestion && (
        <section className="mt-5 rounded-[14px] border border-green/35 bg-green-soft p-4">
          <h2 className="flex items-start gap-2 font-sans text-sm font-bold text-green">
            <Icon name="spark" />
            <span>
              {t('q.ai_title')} <span className="font-medium text-muted">{t('q.ai_verify')}</span>
            </span>
          </h2>
          <p className="my-2.5 text-sm">{q.aiSuggestion.text}</p>
          {q.aiSuggestion.feedback ? (
            <p className="text-[13px] font-semibold text-green">{q.aiSuggestion.feedback === 'up' ? t('q.ai_thanks') : t('q.ai_reported')}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button onClick={() => rate(q.aiSuggestion!.id, 'up')} className="rounded-lg border border-line bg-surface px-3 py-1.5 text-[13px] font-semibold">
                {t('q.ai_useful')}
              </button>
              <button onClick={() => rate(q.aiSuggestion!.id, 'down')} className="rounded-lg border border-line bg-surface px-3 py-1.5 text-[13px] font-semibold">
                {t('q.ai_report')}
              </button>
            </div>
          )}
        </section>
      )}

      <h2 className="mt-8 text-[19px]">
        {q.answers.length} {tn('q.answers', q.answers.length)}
      </h2>

      {q.answers.length === 0 && (
        <div className="mt-3 rounded-[14px] border border-dashed border-line bg-surface px-5 py-8 text-center text-muted">
          {t('q.no_answers')}
          {q.bounty?.status === 'held' && t('q.and_earn', { amount: formatFcfa(q.bounty.amount) })}.
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
              <span className="text-green" title={t('q.accepted')}>
                <Icon name="check" className="size-6" />
              </span>
            )}
          </div>
          <div className="min-w-0">
            {a.accepted && (
              <p className="mb-2 inline-flex items-center gap-1 text-xs font-bold text-green">
                <Icon name="check" className="size-3.5" />
                {t('q.accepted_by', { name: q.author.name })}
              </p>
            )}
            <AnswerBody questionId={q.id} answer={a} mine={a.author.id === user?.id} />
            <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
              {isMine && !q.solved ? (
                <button
                  onClick={() => acceptMutation.mutate(a.id)}
                  disabled={acceptMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-[10px] bg-green px-4 py-2.5 text-sm font-semibold text-green-ink hover:brightness-110 disabled:opacity-60"
                >
                  <Icon name="check" />
                  {t('q.accept')}
                  {q.bounty?.status === 'held' && t('q.and_pay', { amount: formatFcfa(q.bounty.amount) })}
                </button>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-2">
                <ReportButton type="answer" id={a.id} authorId={a.author.id} />
                <AuthorChip user={a.author} date={a.createdAt} label={t('q.answer_by')} />
              </div>
            </div>
          </div>
        </article>
      ))}

      <ReplyForm questionId={id} onDone={refresh} loggedIn={!!user} />
      </div>
    </WithAside>
  )
}

function BountyBanner({ q }: { q: QuestionDetail }) {
  const { t, payment } = useI18n()
  const b = q.bounty!
  if (b.status === 'paid')
    return (
      <div className="mt-4 flex items-center gap-3 rounded-xl border border-green/30 bg-green-soft px-4 py-3 text-[13.5px]">
        <Icon name="coin" />
        <span>{t('q.bounty_paid', { amount: formatFcfa(b.amount) })}</span>
      </div>
    )
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-gold-bg/40 bg-gold-soft px-4 py-3 text-[13.5px]">
      <span className="font-display text-[22px] font-extrabold whitespace-nowrap text-gold">{formatFcfa(b.amount)}</span>
      <span>{t('q.bounty_open', { name: q.author.name, method: payment(b.method) })}</span>
    </div>
  )
}

function ReplyForm({ questionId, onDone, loggedIn }: { questionId: number; onDone: () => void; loggedIn: boolean }) {
  const { t } = useI18n()
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const toast = useToast()
  const mutation = useMutation({
    mutationFn: () => addAnswer(questionId, body.trim()),
    onSuccess: () => {
      setBody('')
      onDone()
      toast(t('q.answer_published'))
    },
    onError: (e) => setError(errorMessage(e)),
  })
  const location = useLocation()

  if (!loggedIn)
    return (
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-line bg-surface p-5">
        <p className="text-sm">
          <b className="block font-display text-base">{t('q.know_answer')}</b>
          <span className="text-muted">{t('q.login_to_help')}</span>
        </p>
        <Link
          to="/connexion"
          state={{ from: location.pathname }}
          className="rounded-[10px] bg-green px-4 py-2.5 text-sm font-semibold text-green-ink hover:brightness-110"
        >
          {t('q.login_to_answer')}
        </Link>
      </div>
    )

  return (
    <form
      className="mt-8 rounded-[14px] border border-line bg-surface p-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (body.trim().length < 20) {
          setError(t('q.reply_too_short'))
          return
        }
        setError('')
        mutation.mutate()
      }}
    >
      <label htmlFor="reply" className="mb-2.5 block font-display text-base font-bold">
        {t('q.your_answer')}
      </label>
      <MarkdownEditor id="reply" value={body} onChange={setBody} invalid={!!error} placeholder={t('q.reply_placeholder')} />
      {error && <p className="mt-2 text-[13px] text-red">{error}</p>}
      <div className="mt-3 flex justify-end">
        <button disabled={mutation.isPending} className="rounded-[10px] bg-green px-4 py-2.5 text-sm font-semibold text-green-ink hover:brightness-110 disabled:opacity-60">
          {mutation.isPending ? t('common.publishing') : t('q.publish_answer')}
        </button>
      </div>
    </form>
  )
}

// Texte d'une réponse ; pour son auteur : modifier sur place, ou supprimer (sauf si elle est validée)
function AnswerBody({ questionId, answer, mine }: { questionId: number; answer: Answer; mine: boolean }) {
  const { t } = useI18n()
  const [editing, setEditing] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const remove = useDeleteAnswer(questionId, answer.id, () => setConfirm(false))

  if (editing) return <AnswerEditor questionId={questionId} answer={answer} onDone={() => setEditing(false)} />
  return (
    <>
      <Markdown>{answer.body}</Markdown>
      {(mine || answer.editedAt) && (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted">
          {answer.editedAt && <span>{t('edit.edited')}</span>}
          {mine && (
            <OwnerActions onEdit={() => setEditing(true)} onDelete={() => setConfirm(true)} canDelete={!answer.accepted} deleteHint={t('edit.cant_delete_accepted')} />
          )}
        </div>
      )}
      {confirm && (
        <ConfirmDialog
          title={t('edit.delete_answer_title')}
          text={t('edit.delete_answer_text')}
          confirm={t('edit.delete')}
          pending={remove.isPending}
          error={remove.error}
          onConfirm={() => remove.mutate()}
          onClose={() => setConfirm(false)}
        />
      )}
    </>
  )
}
