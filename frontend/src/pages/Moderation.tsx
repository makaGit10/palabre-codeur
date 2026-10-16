import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Avatar, Flag } from '../components/Brand'
import { Icon } from '../components/Icon'
import { LoadMore } from '../components/LoadMore'
import { ConfirmDialog } from '../components/PostEditing'
import { useToast } from '../components/toastContext'
import { useAuth } from '../hooks/useAuth'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useI18n, type Key } from '../i18n'
import { errorMessage, fieldErrors } from '../lib/api'
import { timeAgo } from '../lib/format'
import { COUNTRIES } from '../lib/money'
import { createMember, listMembers, listReports, resolveReport, restoreContent, setMemberRole, type Member, type ModerationItem, type Role } from '../services/moderation'
import type { CountryCode } from '../types'

// Espace de modération : signalements regroupés par contenu, décision en un clic, journalisée côté serveur.
// Les administrateurs ont en plus l'onglet « Membres et rôles ».
type Tab = 'open' | 'closed' | 'members'
const TAB_LABEL: Record<Tab, Key> = { open: 'mod.tab_open', closed: 'mod.tab_closed', members: 'mod.tab_members' }

export default function Moderation() {
  const { user } = useAuth()
  const { t } = useI18n()
  const [tab, setTab] = useState<Tab>('open')
  const canModerate = !!user && (user.isAdmin || user.isModerator)
  const { data, isLoading } = useQuery({ queryKey: ['moderation', tab], queryFn: () => listReports(tab === 'closed' ? 'closed' : 'open'), enabled: canModerate && tab !== 'members' })
  const tabs: Tab[] = user?.isAdmin ? ['open', 'closed', 'members'] : ['open', 'closed']

  if (user && !canModerate) return <Navigate to="/app" replace />

  return (
    <div className="max-w-[900px]">
      <h1 className="text-[26px]">{t('mod.title')}</h1>
      <p className="mt-1 mb-5 text-sm text-muted">{t('mod.subtitle')}</p>

      <div role="tablist" className="mb-4 flex gap-1 border-b border-line">
        {tabs.map((id) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold ${tab === id ? 'border-green text-green' : 'border-transparent text-muted hover:text-ink'}`}
          >
            {t(TAB_LABEL[id])}
            {id === 'open' && !!data?.openCount && <span className="ml-1.5 rounded-full bg-red px-1.5 text-[11px] text-white">{data.openCount}</span>}
          </button>
        ))}
      </div>

      {tab === 'members' ? (
        <MembersPanel meId={user?.id ?? 0} />
      ) : isLoading ? (
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

// ——— Membres et rôles (administrateurs) ———
const ROLES: { id: Role; label: Key }[] = [
  { id: 'member', label: 'mod.role_member' },
  { id: 'moderator', label: 'mod.role_moderator' },
  { id: 'admin', label: 'mod.role_admin' },
]
const ROLE_STYLE: Record<Role, string> = { member: 'bg-sunk text-muted', moderator: 'bg-gold-soft text-gold', admin: 'bg-green-soft text-green' }

function MembersPanel({ meId }: { meId: number }) {
  const { t, country } = useI18n()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const q = useDebouncedValue(search.trim(), 300)
  const [creating, setCreating] = useState(false)
  const [pending, setPending] = useState<{ member: Member; role: Role } | null>(null)
  const members = useInfiniteQuery({
    queryKey: ['members', q],
    queryFn: ({ pageParam }) => listMembers({ q: q || undefined, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.lastPage ? last.page + 1 : undefined),
  })
  const list = members.data?.pages.flatMap((p) => p.data) ?? []
  const setRole = useMutation({
    mutationFn: (v: { id: number; role: Role }) => setMemberRole(v.id, v.role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
      toast(t('mod.role_saved'), 'check')
      setPending(null)
    },
    onError: (e) => {
      toast(errorMessage(e), 'bell')
      setPending(null)
    },
  })
  // Nommer un administrateur demande une confirmation ; les autres changements sont immédiats
  const change = (member: Member, role: Role) => (role === 'admin' ? setPending({ member, role }) : setRole.mutate({ id: member.id, role }))

  return (
    <div>
      <p className="mb-4 text-[13.5px] text-muted">{t('mod.members_hint')}</p>
      <div className="mb-4 flex flex-wrap gap-2">
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-[10px] border border-line bg-surface px-3 py-2 text-muted sm:max-w-sm">
          <Icon name="search" />
          <input id="member-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('mod.search_member')} className="min-w-0 flex-1 bg-transparent text-ink outline-none" />
        </label>
        <button onClick={() => setCreating(!creating)} className="inline-flex items-center gap-2 rounded-[10px] bg-green px-4 py-2 text-sm font-semibold text-green-ink hover:brightness-110">
          <Icon name="plus" />
          {creating ? t('common.close') : t('mod.create_account')}
        </button>
      </div>
      {creating && <CreateMemberForm onDone={() => setCreating(false)} />}

      {members.isLoading ? (
        <p className="py-10 text-center text-muted">{t('common.loading')}</p>
      ) : list.length ? (
        <ul className="overflow-hidden rounded-[14px] border border-line bg-surface">
          {list.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 last:border-0">
              <Avatar user={{ ...m, city: m.city ?? '' }} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                  {m.name}
                  {m.id === meId && <span className="rounded-md bg-sunk px-1.5 text-[11px] font-bold text-muted">{t('mod.role_self')}</span>}
                </span>
                <span className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted">
                  <Flag code={m.country} />
                  {m.city ? `${m.city}, ` : ''}
                  {country(m.country)} · {m.email} · {t('mod.joined', { ago: timeAgo(m.createdAt) })}
                </span>
              </span>
              <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold uppercase ${ROLE_STYLE[m.role]}`}>{t(ROLES.find((r) => r.id === m.role)!.label)}</span>
              <select
                aria-label={t('mod.role')}
                value={m.role}
                disabled={m.id === meId || setRole.isPending}
                onChange={(e) => change(m, e.target.value as Role)}
                className="rounded-[10px] border border-line bg-surface px-2.5 py-1.5 text-[13px] disabled:opacity-50"
              >
                {ROLES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {t(r.label)}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-[14px] border border-dashed border-line bg-surface px-5 py-10 text-center text-muted">{t('mod.members_empty')}</div>
      )}
      {list.length > 0 && <LoadMore hasMore={!!members.hasNextPage} loading={members.isFetchingNextPage} onLoad={() => members.fetchNextPage()} />}

      {pending && (
        <ConfirmDialog
          title={t('mod.confirm_admin_title', { name: pending.member.name })}
          text={t('mod.confirm_admin_text')}
          confirm={t('mod.confirm')}
          pending={setRole.isPending}
          onConfirm={() => setRole.mutate({ id: pending.member.id, role: pending.role })}
          onClose={() => setPending(null)}
        />
      )}
    </div>
  )
}

function CreateMemberForm({ onDone }: { onDone: () => void }) {
  const { t, country } = useI18n()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ name: '', email: '', country: 'SN' as CountryCode, city: '', role: 'member' as Role })
  const mutation = useMutation({
    mutationFn: () => createMember({ ...form, name: form.name.trim(), email: form.email.trim(), city: form.city.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
      toast(t('mod.created'), 'mail')
      onDone()
    },
  })
  const errors = fieldErrors(mutation.error)
  const field = (invalid?: string) => `w-full rounded-[10px] border bg-surface px-3 py-2 text-[13.5px] outline-none focus:border-green ${invalid ? 'border-red' : 'border-line'}`
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value })

  return (
    <form
      className="mb-5 rounded-[14px] border border-green/40 bg-surface p-4"
      onSubmit={(e) => {
        e.preventDefault()
        mutation.mutate()
      }}
    >
      <h2 className="text-base">{t('mod.create_title')}</h2>
      <p className="mt-1 mb-3 text-[13px] text-muted">{t('mod.create_hint')}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="nm-name" className="mb-1 block text-[13px] font-semibold">{t('auth.name')}</label>
          <input id="nm-name" required value={form.name} onChange={set('name')} className={field(errors.name)} />
          {errors.name && <p className="mt-1 text-[12.5px] text-red">{errors.name}</p>}
        </div>
        <div>
          <label htmlFor="nm-email" className="mb-1 block text-[13px] font-semibold">{t('auth.email')}</label>
          <input id="nm-email" type="email" required value={form.email} onChange={set('email')} className={field(errors.email)} />
          {errors.email && <p className="mt-1 text-[12.5px] text-red">{errors.email}</p>}
        </div>
        <div>
          <label htmlFor="nm-country" className="mb-1 block text-[13px] font-semibold">{t('auth.country')}</label>
          <select id="nm-country" value={form.country} onChange={set('country')} className={field(errors.country)}>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {country(c)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="nm-city" className="mb-1 block text-[13px] font-semibold">{t('auth.city')}</label>
          <input id="nm-city" value={form.city} onChange={set('city')} className={field()} />
        </div>
        <div>
          <label htmlFor="nm-role" className="mb-1 block text-[13px] font-semibold">{t('mod.role')}</label>
          <select id="nm-role" value={form.role} onChange={set('role')} className={field(errors.role)}>
            {ROLES.map((r) => (
              <option key={r.id} value={r.id}>
                {t(r.label)}
              </option>
            ))}
          </select>
        </div>
      </div>
      {mutation.isError && !Object.keys(errors).length && <p className="mt-3 rounded-lg bg-red/10 px-3 py-2 text-[13px] text-red">{errorMessage(mutation.error)}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onDone} className="rounded-[10px] px-4 py-2 text-sm font-semibold text-muted hover:bg-sunk">
          {t('common.cancel')}
        </button>
        <button disabled={mutation.isPending} className="rounded-[10px] bg-green px-4 py-2 text-sm font-semibold text-green-ink hover:brightness-110 disabled:opacity-60">
          {mutation.isPending ? t('common.sending') : t('mod.create_submit')}
        </button>
      </div>
    </form>
  )
}
