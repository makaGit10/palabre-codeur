import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { timeAgo } from '../lib/format'
import type { MessageAttachment, User } from '../types'
import { Avatar, Flag } from './Brand'
import { Icon } from './Icon'
import { Markdown } from './Markdown'

export interface ChatItem {
  id: number
  body: string
  createdAt: string
  attachment?: MessageAttachment | null
  author?: User // salons : auteur affiché
  mine?: boolean // messages privés : à droite si c'est moi
}

// Carte d'une question ou d'un extrait de code partagé dans un message
function AttachmentCard({ a, mine }: { a: MessageAttachment; mine?: boolean }) {
  const frame = mine ? 'border-green-ink/30 bg-green-ink/10 text-green-ink' : 'border-line bg-surface'
  return (
    <div className={`mt-1.5 max-w-[520px] overflow-hidden rounded-lg border text-[13px] ${frame}`}>
      <Link to={a.url} className="flex items-start gap-2.5 px-3 py-2 hover:underline">
        <Icon name={a.type === 'snippet' ? 'code' : 'chat'} className="mt-0.5 size-4 flex-none" />
        <span className="min-w-0">
          <span className={`block text-[11px] font-bold tracking-wider uppercase ${mine ? 'opacity-80' : 'text-muted'}`}>
            {a.type === 'snippet' ? 'Extrait de code' : 'Question'}
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

// Texte d'un message : Markdown (code coloré, liens), un retour à la ligne = un saut de ligne
function Body({ text, mine }: { text: string; mine?: boolean }) {
  if (!text) return null
  return (
    <div className={`text-[14.5px] ${mine ? '[&_a]:text-green-ink [&_a]:underline [&_code]:bg-black/15' : ''}`}>
      <Markdown breaks>{text}</Markdown>
    </div>
  )
}

// Fil de messages qui descend tout seul quand un message arrive
export function ChatThread({ items, emptyText, loading }: { items: ChatItem[]; emptyText: string; loading?: boolean }) {
  const bottom = useRef<HTMLDivElement>(null)
  const count = items.length
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' })
  }, [count])

  if (loading) return <p className="py-10 text-center text-sm text-muted">Chargement…</p>
  if (!count) return <p className="py-10 text-center text-sm text-muted">{emptyText}</p>

  return (
    <ol className="flex flex-col gap-3 px-1 py-3">
      {items.map((m) =>
        m.author ? (
          <li key={m.id} className="flex gap-2.5">
            <Link to={`/app/profil/${m.author.id}`} className="mt-0.5">
              <Avatar user={m.author} size="sm" />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-baseline gap-x-2 text-[12.5px] text-muted">
                <Link to={`/app/profil/${m.author.id}`} className="inline-flex items-center gap-1.5 font-semibold text-ink">
                  {m.author.name} <Flag code={m.author.country} />
                </Link>
                <span>{timeAgo(m.createdAt)}</span>
              </p>
              <Body text={m.body} />
              {m.attachment && <AttachmentCard a={m.attachment} />}
            </div>
          </li>
        ) : (
          <li key={m.id} className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[78%] rounded-2xl px-3.5 py-2 ${
                m.mine ? 'rounded-br-md bg-green text-green-ink' : 'rounded-bl-md border border-line bg-surface'
              }`}
            >
              <Body text={m.body} mine={m.mine} />
              {m.attachment && <AttachmentCard a={m.attachment} mine={m.mine} />}
              <span className={`mt-1 block text-[11px] ${m.mine ? 'text-green-ink/70' : 'text-muted'}`}>{timeAgo(m.createdAt)}</span>
            </div>
          </li>
        ),
      )}
      <div ref={bottom} />
    </ol>
  )
}

// Zone de saisie : Entrée envoie, Maj+Entrée va à la ligne. Sans compte : invitation à se connecter.
export function ChatComposer({
  onSend,
  pending,
  placeholder,
  loginFrom,
}: {
  onSend: (body: string) => void
  pending: boolean
  placeholder: string
  loginFrom?: string
}) {
  const [body, setBody] = useState('')
  const field = useRef<HTMLTextAreaElement>(null)

  if (loginFrom) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm">
        <span className="text-muted">Connectez-vous pour participer à la discussion.</span>
        <Link to="/connexion" state={{ from: loginFrom }} className="rounded-[10px] bg-green px-4 py-2 font-semibold text-green-ink hover:brightness-110">
          Se connecter
        </Link>
      </div>
    )
  }

  // La valeur est lue dans le champ lui-même : l'envoi ne dépend pas d'un état React potentiellement en retard
  const submit = () => {
    const text = (field.current?.value ?? body).trim()
    if (!text || pending) return
    onSend(text)
    setBody('')
  }
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <form
      className="flex items-end gap-2 rounded-xl border border-line bg-surface p-2 focus-within:border-green"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <textarea
        ref={field}
        id="chat-composer"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={onKey}
        placeholder={placeholder}
        rows={1}
        maxLength={2000}
        className="max-h-40 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-[14.5px] outline-none"
      />
      <span className="hidden pb-2.5 text-[11px] text-muted sm:block">
        ```code``` · Maj+Entrée : ligne
      </span>
      <button
        aria-label="Envoyer"
        disabled={pending || !body.trim()}
        className="grid size-10 flex-none place-items-center rounded-[10px] bg-green text-green-ink hover:brightness-110 disabled:opacity-40"
      >
        <Icon name="send" />
      </button>
    </form>
  )
}
