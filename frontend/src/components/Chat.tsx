import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import { timeAgo } from '../lib/format'
import { searchUsers } from '../services/messaging'
import type { MessageAttachment, Reaction, User } from '../types'
import { Avatar, Flag } from './Brand'
import { Icon } from './Icon'
import { Markdown } from './Markdown'

// Réactions proposées (même liste que config/palabre.php côté serveur) et emojis de la zone de saisie
const REACTIONS = ['👍', '❤️', '😂', '🔥', '👏', '🤔', '🙏', '🎉']
const EMOJIS = ['😀', '😂', '😍', '🤔', '😅', '🙏', '👍', '👏', '🔥', '🎉', '💡', '🚀', '✅', '❌', '⚡', '🐛', '💻', '📱', '🌍', '🇸🇳', '🇨🇮', '🇨🇲', '🇲🇦', '☕']

export interface ChatItem {
  id: number
  body: string
  createdAt: string
  attachment?: MessageAttachment | null
  editedAt?: string | null
  deleted?: boolean
  reactions?: Reaction[]
  canEdit?: boolean
  canDelete?: boolean
  author?: User // salons : auteur affiché
  mine?: boolean // messages privés : à droite si c'est moi
}

export interface ChatActions {
  onEdit: (id: number, body: string) => void
  onDelete: (id: number) => void
  onReact: (id: number, emoji: string) => void
}

const iconBtn = 'grid size-7 place-items-center rounded-md text-muted hover:bg-sunk hover:text-ink'

// Carte d'une question ou d'un extrait de code partagé dans un message
function AttachmentCard({ a, mine }: { a: MessageAttachment; mine?: boolean }) {
  const { t } = useI18n()
  const frame = mine ? 'border-green-ink/30 bg-green-ink/10 text-green-ink' : 'border-line bg-surface'
  return (
    <div className={`mt-1.5 max-w-[520px] overflow-hidden rounded-lg border text-[13px] ${frame}`}>
      <Link to={a.url} className="flex items-start gap-2.5 px-3 py-2 hover:underline">
        <Icon name={a.type === 'snippet' ? 'code' : 'chat'} className="mt-0.5 size-4 flex-none" />
        <span className="min-w-0">
          <span className={`block text-[11px] font-bold tracking-wider uppercase ${mine ? 'opacity-80' : 'text-muted'}`}>
            {a.type === 'snippet' ? t('chat.attachment_snippet') : t('chat.attachment_question')}
          </span>
          <span className="block font-semibold">{a.title}</span>
          <span className={`block text-xs ${mine ? 'opacity-80' : 'text-muted'}`}>{a.meta}</span>
        </span>
      </Link>
      {a.code && (
        <div className="max-h-56 overflow-auto [&_.md_pre]:rounded-none [&_.md_pre]:text-[12px]">
          <Markdown>{'```' + (a.fence ?? '') + '\n' + a.code + '\n```'}</Markdown>
        </div>
      )}
    </div>
  )
}

// Réactions sous un message : un clic ajoute la sienne ou la retire
function Reactions({ reactions, mine, onReact }: { reactions: Reaction[]; mine?: boolean; onReact?: (emoji: string) => void }) {
  const { t } = useI18n()
  if (!reactions.length) return null
  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {reactions.map((r) => (
        <button
          key={r.emoji}
          onClick={() => onReact?.(r.emoji)}
          aria-pressed={r.mine}
          title={r.mine ? t('chat.remove_reaction') : t('chat.react')}
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs tabular-nums ${
            r.mine
              ? mine ? 'border-green-ink/60 bg-green-ink/20 text-green-ink' : 'border-green bg-green-soft text-green'
              : mine ? 'border-green-ink/30 text-green-ink' : 'border-line bg-surface text-muted'
          }`}
        >
          {r.emoji} {r.count}
        </button>
      ))}
    </div>
  )
}

// Choix d'un emoji dans une petite fenêtre, fermée au clic ailleurs ou avec Échap
function EmojiPicker({ items, onPick, onClose, align = 'left', opens = 'up' }: { items: string[]; onPick: (e: string) => void; onClose: () => void; align?: 'left' | 'right'; opens?: 'up' | 'down' }) {
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onDoc = (e: MouseEvent) => !box.current?.contains(e.target as Node) && onClose()
    const onKey = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])
  return (
    <div ref={box} role="listbox" className={`absolute z-20 grid w-max grid-cols-[repeat(8,2rem)] gap-0.5 rounded-xl border border-line bg-surface p-1.5 shadow-xl ${opens === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'} ${align === 'right' ? 'right-0' : 'left-0'}`}>
      {items.map((e) => (
        <button key={e} role="option" aria-selected={false} onClick={() => onPick(e)} className="grid size-8 place-items-center rounded-md text-lg hover:bg-sunk">
          {e}
        </button>
      ))}
    </div>
  )
}

// Texte d'un message : Markdown (code coloré, liens, mentions), un retour à la ligne = un saut de ligne
function Body({ text }: { text: string }) {
  if (!text) return null
  return (
    <div className="text-[14.5px]">
      <Markdown breaks>{text}</Markdown>
    </div>
  )
}

// Un message avec ses actions au survol : réagir, modifier (1 h), supprimer pour tout le monde (24 h)
function MessageRow({ m, actions }: { m: ChatItem; actions?: ChatActions }) {
  const { t } = useI18n()
  const [menu, setMenu] = useState<'none' | 'react' | 'edit' | 'delete'>('none')
  const [draft, setDraft] = useState(m.body)
  const mine = m.mine
  const bubble = m.author === undefined

  const toolbar = actions && !m.deleted && (
    <div className={`absolute top-1 flex items-center gap-0.5 rounded-lg border border-line bg-surface p-0.5 opacity-0 shadow-sm transition group-hover:opacity-100 focus-within:opacity-100 ${bubble && mine ? 'left-2' : 'right-2'}`}>
      <div className="relative">
        <button onClick={() => setMenu(menu === 'react' ? 'none' : 'react')} title={t('chat.react')} aria-label={t('chat.react')} className={iconBtn}>
          <Icon name="smile" className="size-4" />
        </button>
        {menu === 'react' && <EmojiPicker items={REACTIONS} align={bubble && mine ? 'left' : 'right'} opens="down" onClose={() => setMenu('none')} onPick={(e) => { actions.onReact(m.id, e); setMenu('none') }} />}
      </div>
      {m.canEdit && (
        <button onClick={() => { setDraft(m.body); setMenu('edit') }} title={t('chat.edit_title')} aria-label={t('chat.edit')} className={iconBtn}>
          <Icon name="edit" className="size-4" />
        </button>
      )}
      {m.canDelete && (
        <button onClick={() => setMenu('delete')} title={t('chat.delete_title')} aria-label={t('common.delete')} className={`${iconBtn} hover:text-red`}>
          <Icon name="trash" className="size-4" />
        </button>
      )}
    </div>
  )

  const content = m.deleted ? (
    <p className={`text-[13.5px] italic ${bubble && mine ? 'text-green-ink/70' : 'text-muted'}`}>{t('chat.deleted')}</p>
  ) : menu === 'edit' && actions ? (
    <form
      className="mt-1 flex items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (draft.trim()) actions.onEdit(m.id, draft.trim())
        setMenu('none')
      }}
    >
      <textarea
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setMenu('none')
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit() }
        }}
        rows={2}
        maxLength={2000}
        aria-label={t('chat.edit_label')}
        className="min-w-[240px] flex-1 resize-y rounded-lg border border-green bg-surface px-2.5 py-1.5 text-[14px] text-ink outline-none"
      />
      <button type="submit" title={t('common.save')} aria-label={t('common.save')} className="grid size-8 place-items-center rounded-lg bg-green text-green-ink"><Icon name="check" className="size-4" /></button>
      <button type="button" onClick={() => setMenu('none')} title={t('common.cancel')} aria-label={t('common.cancel')} className="grid size-8 place-items-center rounded-lg border border-line bg-surface text-muted"><Icon name="close" className="size-4" /></button>
    </form>
  ) : (
    <>
      <Body text={m.body} />
      {m.attachment && <AttachmentCard a={m.attachment} mine={bubble && mine} />}
    </>
  )

  const confirmDelete = menu === 'delete' && actions && (
    <div className="mt-1.5 flex items-center gap-2 text-[12.5px]">
      <span className={bubble && mine ? 'text-green-ink' : 'text-ink'}>{t('chat.confirm_delete')}</span>
      <button onClick={() => { actions.onDelete(m.id); setMenu('none') }} className="rounded-md bg-red px-2 py-0.5 font-semibold text-white">{t('common.delete')}</button>
      <button onClick={() => setMenu('none')} className={`rounded-md border px-2 py-0.5 font-semibold ${bubble && mine ? 'border-green-ink/50 text-green-ink' : 'border-line'}`}>{t('common.cancel')}</button>
    </div>
  )

  const meta = (cls: string) => (
    <span className={cls}>
      {timeAgo(m.createdAt)}
      {m.editedAt && !m.deleted && ` ${t('chat.edited')}`}
    </span>
  )

  if (!bubble) {
    return (
      <li className="group relative flex gap-2.5 rounded-lg px-1 py-0.5 hover:bg-sunk/60">
        {toolbar}
        <Link to={`/app/profil/${m.author!.id}`} className="mt-0.5">
          <Avatar user={m.author!} size="sm" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-baseline gap-x-2 text-[12.5px] text-muted">
            <Link to={`/app/profil/${m.author!.id}`} className="inline-flex items-center gap-1.5 font-semibold text-ink">
              {m.author!.name} <Flag code={m.author!.country} />
            </Link>
            {meta('')}
          </p>
          {content}
          {confirmDelete}
          <Reactions reactions={m.reactions ?? []} onReact={actions ? (e) => actions.onReact(m.id, e) : undefined} />
        </div>
      </li>
    )
  }

  return (
    <li className={`group relative flex rounded-lg px-1 py-0.5 transition hover:bg-sunk/60 ${mine ? 'justify-end' : 'justify-start'}`}>
      {toolbar}
      <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 ${mine ? 'bubble-mine rounded-br-md bg-green text-green-ink' : 'rounded-bl-md border border-line bg-surface'}`}>
        {content}
        {confirmDelete}
        <Reactions reactions={m.reactions ?? []} mine={mine} onReact={actions ? (e) => actions.onReact(m.id, e) : undefined} />
        {meta(`mt-1 block text-[11px] ${mine ? 'text-green-ink/70' : 'text-muted'}`)}
      </div>
    </li>
  )
}

// Fil de messages qui descend tout seul quand un message arrive
export function ChatThread({ items, emptyText, loading, actions }: { items: ChatItem[]; emptyText: string; loading?: boolean; actions?: ChatActions }) {
  const { t } = useI18n()
  const bottom = useRef<HTMLDivElement>(null)
  const count = items.length
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' })
  }, [count])

  if (loading) return <p className="py-10 text-center text-sm text-muted">{t('common.loading')}</p>
  if (!count) return <p className="py-10 text-center text-sm text-muted">{emptyText}</p>

  return (
    <ol className="flex flex-col gap-2.5 px-1 py-3">
      {items.map((m) => (
        <MessageRow key={m.id} m={m} actions={actions} />
      ))}
      <div ref={bottom} />
    </ol>
  )
}

export interface ComposerPayload {
  body: string
  mentions: number[]
}

// Zone de saisie : Entrée envoie, Maj+Entrée va à la ligne, emojis, mentions @ avec autocomplétion.
// Sans compte : invitation à se connecter.
export function ChatComposer({
  onSend,
  pending,
  placeholder,
  loginFrom,
  mentions = false,
}: {
  onSend: (payload: ComposerPayload) => void
  pending: boolean
  placeholder: string
  loginFrom?: string
  mentions?: boolean
}) {
  const { t } = useI18n()
  const [body, setBody] = useState('')
  const [emojis, setEmojis] = useState(false)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionIndex, setMentionIndex] = useState(0)
  const [picked, setPicked] = useState<{ id: number; name: string }[]>([])
  const field = useRef<HTMLTextAreaElement>(null)

  // Autocomplétion des mentions : la recherche part 200 ms après la dernière frappe
  const [debounced, setDebounced] = useState<string | null>(null)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(mentionQuery), 200)
    return () => clearTimeout(timer)
  }, [mentionQuery])
  const { data: candidates = [] } = useQuery({
    queryKey: ['users-search', debounced],
    queryFn: () => searchUsers(debounced ?? ''),
    enabled: mentions && debounced !== null,
    staleTime: 30_000,
  })

  if (loginFrom) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm">
        <span className="text-muted">{t('chat.login_prompt')}</span>
        <Link to="/connexion" state={{ from: loginFrom }} className="rounded-[10px] bg-green px-4 py-2 font-semibold text-green-ink hover:brightness-110">
          {t('common.login')}
        </Link>
      </div>
    )
  }

  const detectMention = (text: string, caret: number) => {
    if (!mentions) return
    const m = text.slice(0, caret).match(/(?:^|\s)@([^\s@]{0,30})$/)
    setMentionQuery(m ? m[1] : null)
    setMentionIndex(0)
  }

  const insertAtCaret = (snippet: string) => {
    const el = field.current
    const start = el?.selectionStart ?? body.length
    const end = el?.selectionEnd ?? body.length
    const next = body.slice(0, start) + snippet + body.slice(end)
    setBody(next)
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(start + snippet.length, start + snippet.length)
    })
  }

  const pickMention = (user: User) => {
    const el = field.current
    const caret = el?.selectionStart ?? body.length
    const before = body.slice(0, caret).replace(/@[^\s@]{0,30}$/, `@${user.name} `)
    const next = before + body.slice(caret)
    setBody(next)
    setPicked((p) => (p.some((x) => x.id === user.id) ? p : [...p, { id: user.id, name: user.name }]))
    setMentionQuery(null)
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(before.length, before.length)
    })
  }

  // La valeur est lue dans le champ lui-même : l'envoi ne dépend pas d'un état React potentiellement en retard
  const submit = () => {
    let text = (field.current?.value ?? body).trim()
    if (!text || pending) return
    // Les mentions encore présentes deviennent des liens vers le profil, affichés comme des pastilles
    const ids: number[] = []
    for (const p of picked) {
      if (text.includes(`@${p.name}`)) {
        text = text.split(`@${p.name}`).join(`[@${p.name}](/app/profil/${p.id})`)
        ids.push(p.id)
      }
    }
    onSend({ body: text, mentions: ids })
    setBody('')
    setPicked([])
    setMentionQuery(null)
  }

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && candidates.length) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex((i) => (i + 1) % candidates.length); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIndex((i) => (i - 1 + candidates.length) % candidates.length); return }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pickMention(candidates[mentionIndex]); return }
      if (e.key === 'Escape') { setMentionQuery(null); return }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <form
      className="relative flex items-end gap-1.5 rounded-xl border border-line bg-surface p-2 focus-within:border-green"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      {mentionQuery !== null && candidates.length > 0 && (
        <ul role="listbox" aria-label={t('chat.mention')} className="absolute bottom-full left-2 z-20 mb-1 w-64 overflow-hidden rounded-xl border border-line bg-surface shadow-xl">
          {candidates.map((u, i) => (
            <li key={u.id}>
              <button
                type="button"
                role="option"
                aria-selected={i === mentionIndex}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pickMention(u)}
                className={`flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-sm ${i === mentionIndex ? 'bg-green-soft' : 'hover:bg-sunk'}`}
              >
                <Avatar user={u} size="sm" />
                <span className="inline-flex items-center gap-1.5 font-semibold">{u.name} <Flag code={u.country} /></span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="relative">
        <button type="button" onClick={() => setEmojis(!emojis)} title="Emoji" aria-label={t('chat.emoji')} className="grid size-10 place-items-center rounded-[10px] text-muted hover:bg-sunk hover:text-ink">
          <Icon name="smile" />
        </button>
        {emojis && <EmojiPicker items={EMOJIS} onClose={() => setEmojis(false)} onPick={(e) => { insertAtCaret(e); setEmojis(false) }} />}
      </div>
      <textarea
        ref={field}
        id="chat-composer"
        value={body}
        onChange={(e) => { setBody(e.target.value); detectMention(e.target.value, e.target.selectionStart) }}
        onKeyDown={onKey}
        placeholder={placeholder}
        rows={1}
        maxLength={2000}
        className="max-h-40 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-[14.5px] outline-none"
      />
      <span className="hidden pb-2.5 text-[11px] text-muted sm:block">
        {mentions ? '@ · ' : ''}
        {t('chat.hint')}
      </span>
      <button
        aria-label={t('chat.send')}
        disabled={pending || !body.trim()}
        className="grid size-10 flex-none place-items-center rounded-[10px] bg-green text-green-ink hover:brightness-110 disabled:opacity-40"
      >
        <Icon name="send" />
      </button>
    </form>
  )
}
