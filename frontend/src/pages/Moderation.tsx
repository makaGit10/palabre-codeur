import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { useToast } from '../components/toastContext'
import { useAuth } from '../hooks/useAuth'
import { useI18n, type Key } from '../i18n'
import { errorMessage } from '../lib/api'
import { timeAgo } from '../lib/format'
import { listReports, resolveReport, restoreContent, type ModerationItem } from '../services/moderation'

// Espace de modération : signalements regroupés par contenu, décision en un clic, journalisée côté serveur
export default function Moderation() {
  const { user } = useAuth()
  const { t } = useI18n()
  const [tab, setTab] = useState<'open' | 'closed'>('open')
  const { data, isLoading } = useQuery({ queryKey: ['moderation', tab], queryFn: () => listReports(tab), enabled: !!user?.isAdmin })

  if (user && !user.isAdmin) return <Navigate to="/app" replace />

  return (
    <div className="max-w-[900px]">
      <h1 className="text-[26px]">{t('mod.title')}</h1>
      <p className="mt-1 mb-5 text-sm text-muted">{t('mod.subtitle')}</p>

      <div role="tablist" className="mb-4 flex gap-1 border-b border-line">
        {(['open', 'closed'] as const).map((id) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold ${tab === id ? 'border-green text-green' : 'border-transparent text-muted hover:text-ink'}`}
          >
            {t(id === 'open' ? 'mod.tab_open' : 'mod.tab_closed')}
            {id === 'open' && !!data?.openCount && <span className="ml-1.5 rounded-full bg-red px-1.5 text-[11px] text-white">{data.openCount}</span>}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="py-10 text-center text-muted">{t('common.loading')}</p>
      ) : data?.data.length ? (
        <ul className="flex flex-col gap-3">
          {data.data.map((item) => (
            <ModerationCard key={`${item.type}-${item.id}`} item={item} />
          ))}
        </ul>
      ) : (
        <div className="rounded-[14px] border border-dashed border-line bg-surface px-5 py-10 text-center text-muted">{t(tab === 'open' ? 'mod.empty_open' : 'mod.empty_closed')}</div>
      )}
    </div>
  )
}

const REASON_LABEL: Record<string, Key> = { spam: 'report.spam', offensive: 'report.offensive', wrong: 'report.wrong', other: 'report.other' }
const TYPE_LABEL: Record<ModerationItem['type'], Key> = { question: 'mod.type_question', answer: 'mod.type_answer', snippet: 'mod.type_snippet' }

function ModerationCard({ item }: { item: ModerationItem }) {
  const { t } = useI18n()
  const toast = useToast()
  const queryClient = useQueryClient()
  const done = (message: Key) => () => {
    toast(t(message), 'check')
    queryClient.invalidateQueries({ queryKey: ['moderation'] })
    queryClient.invalidateQueries({ queryKey: ['questions'] })
  }
  const hide = useMutation({ mutationFn: () => resolveReport(item.reportId, 'hide'), onSuccess: done('mod.hidden') })
  const dismiss = useMutation({ mutationFn: () => resolveReport(item.reportId, 'dismiss'), onSuccess: done('mod.dismissed') })
  const restore = useMutation({ mutationFn: () => restoreContent(item.type, item.id), onSuccess: done('mod.restored') })
  const error = hide.error ?? dismiss.error ?? restore.error
  const busy = hide.isPending || dismiss.isPending || restore.isPending

  return (
    <li className="rounded-[14px] border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-md bg-sunk px-2 py-0.5 font-bold text-muted uppercase">{t(TYPE_LABEL[item.type])}</span>
        <span className="rounded-full bg-red/10 px-2 py-0.5 font-bold text-red">{t('mod.reports', { n: item.count })}</span>
        {item.hidden && <span className="rounded-full bg-gold-soft px-2 py-0.5 font-bold text-gold">{t('mod.is_hidden')}</span>}
        {item.author && <span className="text-muted">{t('mod.by', { name: item.author })}</span>}
      </div>
      {item.title && <p className="mt-2 font-semibold">{item.title}</p>}
      {item.excerpt && <p className="mt-1 text-[13.5px] text-muted">{item.excerpt}</p>}
      <ul className="mt-3 flex flex-col gap-1 border-t border-line pt-3 text-[13px]">
        {item.reasons.map((r, i) => (
          <li key={i}>
            <b>{t(REASON_LABEL[r.reason] ?? 'report.other')}</b>
            {r.details && <span className="text-muted"> · « {r.details} »</span>}
            <span className="text-muted">
              {' '}
              · {r.by} · {timeAgo(r.at)}
            </span>
          </li>
        ))}
      </ul>
      {error && <p className="mt-2 rounded-lg bg-red/10 px-3 py-2 text-[13px] text-red">{errorMessage(error)}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {item.status === 'open' && (
          <>
            <button disabled={busy} onClick={() => hide.mutate()} className="inline-flex items-center gap-1.5 rounded-[10px] bg-red px-3.5 py-2 text-[13px] font-semibold text-white hover:brightness-110 disabled:opacity-60">
              <Icon name="close" className="size-4" />
              {t('mod.hide')}
            </button>
            <button disabled={busy} onClick={() => dismiss.mutate()} className="rounded-[10px] border border-line px-3.5 py-2 text-[13px] font-semibold hover:bg-sunk disabled:opacity-60">
              {t('mod.dismiss')}
            </button>
          </>
        )}
        {item.hidden && (
          <button disabled={busy} onClick={() => restore.mutate()} className="rounded-[10px] border border-green px-3.5 py-2 text-[13px] font-semibold text-green hover:bg-green-soft disabled:opacity-60">
            {t('mod.restore')}
          </button>
        )}
        {item.url && !item.hidden && (
          <Link to={item.url} className="ml-auto text-[13px] font-semibold text-green hover:underline">
            {t('mod.view')}
          </Link>
        )}
      </div>
    </li>
  )
}
