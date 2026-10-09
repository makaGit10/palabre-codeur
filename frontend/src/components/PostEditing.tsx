import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useI18n } from '../i18n'
import { errorMessage, fieldErrors } from '../lib/api'
import { updateAnswer, updateQuestion } from '../services/questions'
import type { Answer, QuestionDetail } from '../types'
import { Icon } from './Icon'
import { MarkdownEditor } from './Post'
import { useToast } from './toastContext'

const iconBtn = 'grid size-8 place-items-center rounded-lg border border-line bg-surface text-muted hover:border-green hover:text-ink'
const input = (invalid?: string) =>
  `w-full rounded-[10px] border bg-surface px-3.5 py-2.5 outline-none focus:border-green focus:ring-3 focus:ring-green-soft ${invalid ? 'border-red' : 'border-line'}`

// Boutons « Modifier » et « Supprimer » (icônes) pour l'auteur d'un contenu
export function OwnerActions({ onEdit, onDelete, canDelete, deleteHint }: { onEdit: () => void; onDelete: () => void; canDelete: boolean; deleteHint: string }) {
  const { t } = useI18n()
  return (
    <>
      <button type="button" onClick={onEdit} title={t('edit.edit')} aria-label={t('edit.edit')} className={iconBtn}>
        <Icon name="edit" className="size-4" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={!canDelete}
        title={canDelete ? t('edit.delete') : deleteHint}
        aria-label={t('edit.delete')}
        className={`${iconBtn} hover:border-red hover:text-red disabled:cursor-not-allowed disabled:opacity-40`}
      >
        <Icon name="trash" className="size-4" />
      </button>
    </>
  )
}

// Confirmation avant une suppression définitive
export function ConfirmDialog({ title, text, confirm, pending, error, onConfirm, onClose }: { title: string; text: string; confirm: string; pending: boolean; error?: unknown; onConfirm: () => void; onClose: () => void }) {
  const { t } = useI18n()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-ink/40 sm:place-items-center sm:p-4" onClick={onClose} role="presentation">
      <div role="alertdialog" aria-label={title} className="w-full max-w-sm rounded-t-2xl border border-line bg-surface p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base">{title}</h2>
        <p className="mt-1.5 text-[13.5px] text-muted">{text}</p>
        {!!error && <p className="mt-3 rounded-lg bg-red/10 px-3 py-2 text-[13px] text-red">{errorMessage(error)}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-[10px] px-4 py-2 text-sm font-semibold text-muted hover:bg-sunk">
            {t('common.cancel')}
          </button>
          <button onClick={onConfirm} disabled={pending} className="rounded-[10px] bg-red px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60">
            {confirm}
          </button>
        </div>
      </div>
    </div>
  )
}

// Modifier sa question : titre, texte et étiquettes (la prime ne change pas)
export function QuestionEditor({ q, onDone }: { q: QuestionDetail; onDone: () => void }) {
  const { t } = useI18n()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [title, setTitle] = useState(q.title)
  const [body, setBody] = useState(q.body)
  const [tags, setTags] = useState(q.tags.join(', '))
  const mutation = useMutation({
    mutationFn: () => updateQuestion(q.id, { title: title.trim(), body: body.trim(), tags: tags.split(/[\s,]+/).map((x) => x.trim().toLowerCase()).filter(Boolean).slice(0, 4) }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['question', q.id], updated)
      queryClient.invalidateQueries({ queryKey: ['questions'] })
      toast(t('edit.saved'), 'check')
      onDone()
    },
  })
  const errors = fieldErrors(mutation.error)

  return (
    <form
      className="flex flex-col gap-3 rounded-[14px] border border-green/40 bg-surface p-4"
      onSubmit={(e) => {
        e.preventDefault()
        mutation.mutate()
      }}
    >
      <label className="text-sm font-bold" htmlFor="edit-title">
        {t('edit.title')}
      </label>
      <input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} className={input(errors.title)} />
      {errors.title && <p className="text-[13px] text-red">{errors.title}</p>}
      <MarkdownEditor id="edit-body" value={body} onChange={setBody} invalid={!!errors.body} placeholder="" />
      {errors.body && <p className="text-[13px] text-red">{errors.body}</p>}
      <label className="text-sm font-bold" htmlFor="edit-tags">
        {t('edit.tags')}
      </label>
      <input id="edit-tags" value={tags} onChange={(e) => setTags(e.target.value)} className={input(errors.tags)} />
      {mutation.isError && !Object.keys(errors).length && <p className="rounded-lg bg-red/10 px-3 py-2 text-[13px] text-red">{errorMessage(mutation.error)}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className="rounded-[10px] px-4 py-2 text-sm font-semibold text-muted hover:bg-sunk">
          {t('common.cancel')}
        </button>
        <button disabled={mutation.isPending} className="rounded-[10px] bg-green px-4 py-2 text-sm font-semibold text-green-ink hover:brightness-110 disabled:opacity-60">
          {mutation.isPending ? t('common.publishing') : t('common.save')}
        </button>
      </div>
    </form>
  )
}

export function AnswerEditor({ questionId, answer, onDone }: { questionId: number; answer: Answer; onDone: () => void }) {
  const { t } = useI18n()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [body, setBody] = useState(answer.body)
  const mutation = useMutation({
    mutationFn: () => updateAnswer(answer.id, body.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['question', questionId] })
      toast(t('edit.saved'), 'check')
      onDone()
    },
  })
  const errors = fieldErrors(mutation.error)
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        mutation.mutate()
      }}
    >
      <MarkdownEditor id={`edit-answer-${answer.id}`} value={body} onChange={setBody} invalid={!!errors.body} placeholder="" />
      {mutation.isError && <p className="rounded-lg bg-red/10 px-3 py-2 text-[13px] text-red">{errors.body ?? errorMessage(mutation.error)}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className="rounded-[10px] px-4 py-2 text-sm font-semibold text-muted hover:bg-sunk">
          {t('common.cancel')}
        </button>
        <button disabled={mutation.isPending} className="rounded-[10px] bg-green px-4 py-2 text-sm font-semibold text-green-ink hover:brightness-110 disabled:opacity-60">
          {mutation.isPending ? t('common.publishing') : t('common.save')}
        </button>
      </div>
    </form>
  )
}
