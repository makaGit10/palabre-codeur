import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { errorMessage } from '../lib/api'
import { addGroupMembers, createGroup, groupMembers, leaveGroup, removeGroupMember, searchUsers } from '../services/messaging'
import type { User } from '../types'
import { Avatar, Flag } from './Brand'
import { Icon } from './Icon'
import { useToast } from './toastContext'

// Recherche de membres avec sélection en pastilles (création de groupe, ajout de membres)
function MemberPicker({ selected, onChange, exclude = [] }: { selected: User[]; onChange: (u: User[]) => void; exclude?: number[] }) {
  const [q, setQ] = useState('')
  const [debounced, setDebounced] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 200)
    return () => clearTimeout(t)
  }, [q])
  const { data: results = [] } = useQuery({ queryKey: ['users-search', debounced], queryFn: () => searchUsers(debounced), staleTime: 30_000 })
  const candidates = results.filter((u) => !selected.some((s) => s.id === u.id) && !exclude.includes(u.id))

  return (
    <div>
      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selected.map((u) => (
            <span key={u.id} className="inline-flex items-center gap-1.5 rounded-full bg-green-soft py-0.5 pr-1 pl-1 text-[13px] font-semibold text-green">
              <Avatar user={u} size="sm" />
              {u.name}
              <button type="button" aria-label={`Retirer ${u.name}`} onClick={() => onChange(selected.filter((s) => s.id !== u.id))} className="grid size-5 place-items-center rounded-full hover:bg-green/15">
                <Icon name="close" className="size-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        id="member-search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Rechercher un membre par son nom…"
        autoComplete="off"
        className="w-full rounded-[10px] border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-green"
      />
      <ul className="mt-1.5 max-h-44 overflow-y-auto rounded-[10px] border border-line">
        {candidates.length ? (
          candidates.map((u) => (
            <li key={u.id}>
              <button type="button" onClick={() => onChange([...selected, u])} className="flex w-full items-center gap-2.5 px-2.5 py-1.5 text-left text-sm hover:bg-sunk">
                <Avatar user={u} size="sm" />
                <span className="inline-flex items-center gap-1.5 font-semibold">{u.name} <Flag code={u.country} /></span>
                <span className="ml-auto text-xs text-muted">{u.city}</span>
              </button>
            </li>
          ))
        ) : (
          <li className="px-3 py-2 text-xs text-muted">{debounced ? 'Personne ne correspond.' : 'Tapez un nom pour chercher.'}</li>
        )}
      </ul>
    </div>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-ink/40 sm:place-items-center sm:p-4" onClick={onClose} role="presentation">
      <div role="dialog" aria-label={title} className="flex max-h-[85dvh] w-full max-w-md flex-col rounded-t-2xl border border-line bg-surface sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center gap-3 border-b border-line px-4 py-3">
          <h2 className="flex-1 text-base">{title}</h2>
          <button onClick={onClose} aria-label="Fermer" className="grid size-8 place-items-center rounded-lg text-muted hover:bg-sunk">
            <Icon name="close" />
          </button>
        </header>
        <div className="overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  )
}

// Créer un groupe : un nom, au moins une autre personne ; la créatrice en est l'administratrice
export function CreateGroupDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [members, setMembers] = useState<User[]>([])
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const mutation = useMutation({
    mutationFn: () => createGroup(name.trim(), members.map((m) => m.id)),
    onSuccess: (group) => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      toast(`Groupe « ${group.name} » créé`, 'users')
      onClose()
      navigate(`/app/salons/${group.slug}`)
    },
    onError: (e) => setError(errorMessage(e)),
  })

  return (
    <Modal title="Nouveau groupe" onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (name.trim().length < 2) return setError('Donnez un nom au groupe (au moins 2 caractères).')
          if (!members.length) return setError('Ajoutez au moins une personne.')
          setError('')
          mutation.mutate()
        }}
      >
        <div>
          <label htmlFor="group-name" className="mb-1.5 block text-sm font-bold">Nom du groupe</label>
          <input id="group-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Ex. : Équipe Dakar" className="w-full rounded-[10px] border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-green" />
        </div>
        <div>
          <p className="mb-1.5 text-sm font-bold">Membres</p>
          <MemberPicker selected={members} onChange={setMembers} />
        </div>
        {error && <p className="text-[13px] text-red">{error}</p>}
        <button disabled={mutation.isPending} className="rounded-[10px] bg-green px-4 py-2.5 text-sm font-semibold text-green-ink hover:brightness-110 disabled:opacity-60">
          {mutation.isPending ? 'Création…' : 'Créer le groupe'}
        </button>
      </form>
    </Modal>
  )
}

// Membres d'un groupe : liste, ajout et retrait par un administrateur, départ
export function GroupMembersDialog({ slug, onClose }: { slug: string; onClose: () => void }) {
  const { user: me } = useAuth()
  const [adding, setAdding] = useState<User[]>([])
  const [confirmLeave, setConfirmLeave] = useState(false)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const toast = useToast()
  const { data, isLoading } = useQuery({ queryKey: ['group-members', slug], queryFn: () => groupMembers(slug) })
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['group-members', slug] })
    queryClient.invalidateQueries({ queryKey: ['rooms'] })
  }
  const add = useMutation({ mutationFn: () => addGroupMembers(slug, adding.map((u) => u.id)), onSuccess: () => { setAdding([]); refresh(); toast('Membres ajoutés', 'users') }, onError: (e) => toast(errorMessage(e), 'bell') })
  const remove = useMutation({ mutationFn: (id: number) => removeGroupMember(slug, id), onSuccess: refresh, onError: (e) => toast(errorMessage(e), 'bell') })
  const leave = useMutation({ mutationFn: () => leaveGroup(slug), onSuccess: () => { refresh(); toast('Vous avez quitté le groupe'); onClose(); navigate('/app/salons') }, onError: (e) => toast(errorMessage(e), 'bell') })

  return (
    <Modal title="Membres du groupe" onClose={onClose}>
      {isLoading || !data ? (
        <p className="py-6 text-center text-sm text-muted">Chargement…</p>
      ) : (
        <div className="flex flex-col gap-4">
          <ul className="divide-y divide-line rounded-[10px] border border-line">
            {data.data.map((m) => (
              <li key={m.id} className="flex items-center gap-2.5 px-2.5 py-2 text-sm">
                <Avatar user={m} size="sm" />
                <span className="inline-flex min-w-0 items-center gap-1.5 font-semibold">{m.name} <Flag code={m.country} /></span>
                {m.role === 'admin' && <span className="rounded-md bg-gold-soft px-1.5 text-[11px] font-bold text-gold">admin</span>}
                {data.isAdmin && m.id !== me?.id && (
                  <button onClick={() => remove.mutate(m.id)} title={`Retirer ${m.name}`} aria-label={`Retirer ${m.name}`} className="ml-auto grid size-7 place-items-center rounded-md text-muted hover:bg-sunk hover:text-red">
                    <Icon name="trash" className="size-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
          {data.isAdmin && (
            <div>
              <p className="mb-1.5 text-sm font-bold">Ajouter des membres</p>
              <MemberPicker selected={adding} onChange={setAdding} exclude={data.data.map((m) => m.id)} />
              {adding.length > 0 && (
                <button onClick={() => add.mutate()} disabled={add.isPending} className="mt-2 rounded-[10px] bg-green px-4 py-2 text-sm font-semibold text-green-ink hover:brightness-110 disabled:opacity-60">
                  Ajouter {adding.length > 1 ? `${adding.length} personnes` : adding[0].name.split(' ')[0]}
                </button>
              )}
            </div>
          )}
          <div className="flex items-center justify-between gap-3 border-t border-line pt-3 text-[13px]">
            {confirmLeave ? (
              <>
                <span>Quitter ce groupe ?</span>
                <span className="flex gap-2">
                  <button onClick={() => leave.mutate()} className="rounded-md bg-red px-3 py-1 font-semibold text-white">Quitter</button>
                  <button onClick={() => setConfirmLeave(false)} className="rounded-md border border-line px-3 py-1 font-semibold">Annuler</button>
                </span>
              </>
            ) : (
              <button onClick={() => setConfirmLeave(true)} className="inline-flex items-center gap-1.5 font-semibold text-red">
                <Icon name="logout" className="size-4" /> Quitter le groupe
              </button>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
