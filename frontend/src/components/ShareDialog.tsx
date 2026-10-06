import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { errorMessage } from '../lib/api'
import { listConversations, listRooms, postRoomMessage, sendDirectMessage } from '../services/messaging'
import type { MessagePayload } from '../types'
import { Avatar, Flag } from './Brand'
import { Icon } from './Icon'
import { useToast } from './toastContext'

interface Shareable {
  type: 'question' | 'snippet'
  id: number
  title: string
}

// Bouton « Partager » : envoie une question ou un extrait, en carte cliquable, dans une conversation ou un salon
export function ShareButton({ item, compact }: { item: Shareable; compact?: boolean }) {
  const [open, setOpen] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const onClick = () => {
    if (!user) return navigate('/connexion', { state: { from: location.pathname } })
    setOpen(true)
  }

  return (
    <>
      <button
        onClick={onClick}
        className={`inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface font-semibold text-ink hover:border-green ${
          compact ? 'px-3 py-1.5 text-[12.5px]' : 'px-3 py-1.5 text-[13px]'
        }`}
      >
        <Icon name="send" className="size-4" />
        Partager
      </button>
      {open && <ShareDialog item={item} onClose={() => setOpen(false)} />}
    </>
  )
}

type Target = { kind: 'user'; id: number; label: string } | { kind: 'room'; slug: string; label: string }

function ShareDialog({ item, onClose }: { item: Shareable; onClose: () => void }) {
  const [note, setNote] = useState('')
  const toast = useToast()
  const { data: conversations } = useQuery({ queryKey: ['conversations'], queryFn: listConversations })
  const { data: rooms = [] } = useQuery({ queryKey: ['rooms'], queryFn: listRooms })

  const share = useMutation({
    mutationFn: async (target: Target): Promise<void> => {
      const payload: MessagePayload = { body: note.trim(), attachment: { type: item.type, id: item.id } }
      if (target.kind === 'user') await sendDirectMessage(target.id, payload)
      else await postRoomMessage(target.slug, payload)
    },
    onSuccess: (_, target) => {
      toast(target.kind === 'user' ? `Envoyé à ${target.label}` : `Partagé dans ${target.label}`, 'send')
      onClose()
    },
    onError: (e) => toast(errorMessage(e), 'bell'),
  })

  const copyLink = async () => {
    const url = `${window.location.origin}${item.type === 'question' ? `/app/questions/${item.id}` : '/app/snippets'}`
    try {
      await navigator.clipboard.writeText(url)
      toast('Lien copié')
    } catch {
      toast('Copie impossible sur cet appareil', 'bell')
    }
  }

  const row = 'flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left text-sm hover:bg-sunk disabled:opacity-50'

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-ink/40 p-0 sm:place-items-center sm:p-4" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-labelledby="share-title"
        className="flex max-h-[85dvh] w-full max-w-md flex-col rounded-t-2xl border border-line bg-surface sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0 flex-1">
            <h2 id="share-title" className="text-base">
              Partager {item.type === 'snippet' ? "l'extrait" : 'la question'}
            </h2>
            <p className="truncate text-[13px] text-muted">{item.title}</p>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="grid size-8 place-items-center rounded-lg text-muted hover:bg-sunk">
            <Icon name="close" />
          </button>
        </header>

        <div className="px-4 pt-3">
          <input
            id="share-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Un mot pour accompagner (facultatif)"
            maxLength={2000}
            className="w-full rounded-[10px] border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-green"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {!!conversations?.data.length && (
            <>
              <p className="px-2.5 pt-1 pb-1 text-[11px] font-bold tracking-wider text-muted uppercase">Conversations</p>
              {conversations.data.map((c) => (
                <button key={c.id} disabled={share.isPending} onClick={() => share.mutate({ kind: 'user', id: c.user.id, label: c.user.name })} className={row}>
                  <Avatar user={c.user} size="sm" />
                  <span className="inline-flex items-center gap-1.5 font-semibold">
                    {c.user.name} <Flag code={c.user.country} />
                  </span>
                </button>
              ))}
            </>
          )}
          <p className="px-2.5 pt-2 pb-1 text-[11px] font-bold tracking-wider text-muted uppercase">Salons</p>
          {rooms.map((r) => (
            <button key={r.id} disabled={share.isPending} onClick={() => share.mutate({ kind: 'room', slug: r.slug, label: r.name })} className={row}>
              <Icon name="chat" className="size-4 text-muted" />
              <span className="font-semibold">{r.name}</span>
              {r.description && <span className="min-w-0 truncate text-xs text-muted">{r.description}</span>}
            </button>
          ))}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-[13px]">
          <span className="text-muted">Pour écrire à quelqu'un d'autre, passez par son profil.</span>
          <button onClick={copyLink} className="inline-flex flex-none items-center gap-1.5 font-semibold text-green">
            <Icon name="copy" className="size-4" />
            Copier le lien
          </button>
        </footer>
      </div>
    </div>
  )
}
