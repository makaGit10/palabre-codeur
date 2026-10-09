import { useMutation } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useI18n, type Key } from '../i18n'
import { errorMessage } from '../lib/api'
import { reportContent, type ReportableType, type ReportReason } from '../services/moderation'
import { Icon } from './Icon'
import { useToast } from './toastContext'

const REASONS: { id: ReportReason; label: Key }[] = [
  { id: 'spam', label: 'report.spam' },
  { id: 'offensive', label: 'report.offensive' },
  { id: 'wrong', label: 'report.wrong' },
  { id: 'other', label: 'report.other' },
]

// Petit drapeau « Signaler » : choisir un motif, ajouter un mot si besoin, envoyer à la modération.
// Masqué pour son propre contenu ; sans compte, renvoie vers la connexion.
export function ReportButton({ type, id, authorId }: { type: ReportableType; id: number; authorId: number }) {
  const { user } = useAuth()
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  if (user?.id === authorId) return null

  return (
    <>
      <button
        type="button"
        onClick={() => (user ? setOpen(true) : navigate('/connexion', { state: { from: location.pathname } }))}
        title={t('report.action')}
        aria-label={t('report.action')}
        className="grid size-8 place-items-center rounded-lg border border-line bg-surface text-muted hover:border-red hover:text-red"
      >
        <Icon name="flag" className="size-4" />
      </button>
      {open && <ReportDialog type={type} id={id} onClose={() => setOpen(false)} />}
    </>
  )
}

function ReportDialog({ type, id, onClose }: { type: ReportableType; id: number; onClose: () => void }) {
  const { t } = useI18n()
  const toast = useToast()
  const [reason, setReason] = useState<ReportReason | null>(null)
  const [details, setDetails] = useState('')
  const mutation = useMutation({
    mutationFn: () => reportContent({ type, id, reason: reason!, details: details.trim() || undefined }),
    onSuccess: () => {
      toast(t('report.sent'), 'check')
      onClose()
    },
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-ink/40 sm:place-items-center sm:p-4" onClick={onClose} role="presentation">
      <form
        role="dialog"
        aria-label={t('report.title')}
        className="w-full max-w-md rounded-t-2xl border border-line bg-surface p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          if (reason) mutation.mutate()
        }}
      >
        <h2 className="text-base">{t('report.title')}</h2>
        <p className="mt-1 text-[13px] text-muted">{t('report.text')}</p>
        <div className="mt-4 grid gap-2">
          {REASONS.map((r) => (
            <label key={r.id} className={`flex cursor-pointer items-center gap-2.5 rounded-[10px] border px-3 py-2 text-[13.5px] ${reason === r.id ? 'border-green bg-green-soft font-semibold text-green' : 'border-line'}`}>
              <input type="radio" name="report-reason" value={r.id} checked={reason === r.id} onChange={() => setReason(r.id)} className="accent-[var(--green)]" />
              {t(r.label)}
            </label>
          ))}
        </div>
        <textarea
          id="report-details"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder={t('report.details')}
          className="mt-3 w-full rounded-[10px] border border-line bg-surface px-3 py-2 text-[13.5px] outline-none focus:border-green"
        />
        {mutation.isError && <p className="mt-2 rounded-lg bg-red/10 px-3 py-2 text-[13px] text-red">{errorMessage(mutation.error)}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-[10px] px-4 py-2 text-sm font-semibold text-muted hover:bg-sunk">
            {t('common.cancel')}
          </button>
          <button disabled={!reason || mutation.isPending} className="rounded-[10px] bg-red px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50">
            {mutation.isPending ? t('common.sending') : t('report.send')}
          </button>
        </div>
      </form>
    </div>
  )
}
