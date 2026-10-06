import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import { formatNumber, timeAgo } from '../lib/format'
import type { User, VoteValue } from '../types'
import { Avatar, Flag } from './Brand'
import { Icon } from './Icon'
import { Markdown } from './Markdown'

export function VoteBox({ votes, myVote, onVote }: { votes: number; myVote: VoteValue; onVote: (v: VoteValue) => void }) {
  const { t } = useI18n()
  const btn = (active: boolean) =>
    `grid h-8 w-9 place-items-center rounded-lg border transition ${
      active ? 'border-green bg-green text-green-ink' : 'border-line bg-surface text-muted hover:text-ink'
    }`
  return (
    <div className="flex flex-col items-center gap-0.5">
      <button aria-label={t('vote.up')} title={t('vote.up')} aria-pressed={myVote === 1} className={btn(myVote === 1)} onClick={() => onVote(myVote === 1 ? 0 : 1)}>
        <Icon name="up" />
      </button>
      <b className="font-display text-lg tabular-nums" title={t('vote.score')}>
        {votes}
      </b>
      <button aria-label={t('vote.down')} title={t('vote.down_title')} aria-pressed={myVote === -1} className={btn(myVote === -1)} onClick={() => onVote(myVote === -1 ? 0 : -1)}>
        <Icon name="down" />
      </button>
    </div>
  )
}

export function AuthorChip({ user, date, label }: { user: User; date: string; label: string }) {
  const { tn } = useI18n()
  return (
    <Link to={`/app/profil/${user.id}`} className="inline-flex items-center gap-2 rounded-[10px] bg-sunk px-2.5 py-1.5 text-[12.5px] hover:brightness-95">
      <Avatar user={user} size="sm" />
      <span className="leading-tight">
        <span className="text-muted">{label} </span>
        <b className="text-[13px]">{user.name}</b> <Flag code={user.country} />
        <br />
        <small className="text-muted">
          {formatNumber(user.reputation)} {tn('common.pts', user.reputation)} · {timeAgo(date)}
        </small>
      </span>
    </Link>
  )
}

// Zone de saisie Markdown avec onglets Écrire / Aperçu
export function MarkdownEditor({
  id,
  value,
  onChange,
  placeholder,
  invalid,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  invalid?: boolean
}) {
  const { t } = useI18n()
  const [preview, setPreview] = useState(false)
  const tab = (on: boolean) => `px-3 py-1.5 text-[13px] font-semibold rounded-md ${on ? 'bg-surface text-ink shadow-sm' : 'text-muted'}`
  return (
    <div className={`overflow-hidden rounded-[10px] border bg-surface ${invalid ? 'border-red' : 'border-line focus-within:border-green'}`}>
      <div className="flex items-center gap-1 border-b border-line bg-sunk p-1">
        <button type="button" className={tab(!preview)} onClick={() => setPreview(false)}>
          {t('editor.write')}
        </button>
        <button type="button" className={tab(preview)} onClick={() => setPreview(true)}>
          {t('editor.preview')}
        </button>
        <span className="ml-auto hidden pr-2 text-xs text-muted sm:block">{t('editor.hint')}</span>
      </div>
      {preview ? (
        <div className="min-h-[160px] px-4 py-3">{value.trim() ? <Markdown>{value}</Markdown> : <p className="text-muted">{t('editor.empty')}</p>}</div>
      ) : (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-invalid={invalid}
          className="block min-h-[160px] w-full resize-y bg-transparent px-4 py-3 font-mono text-[13px] text-ink outline-none"
        />
      )}
    </div>
  )
}
