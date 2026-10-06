import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Avatar, Flag } from '../components/Brand'
import { CodeTree } from '../components/CodeTree'
import { Icon, type IconName } from '../components/Icon'
import { useI18n, type Key } from '../i18n'
import { errorMessage, fieldErrors } from '../lib/api'
import { formatNumber } from '../lib/format'
import { COUNTRIES } from '../lib/money'
import { getDemoAccounts, login, register } from '../services/auth'
import { getStats } from '../services/community'
import type { CountryCode, Me } from '../types'

const inputClass = (invalid?: string) =>
  `w-full rounded-[10px] border bg-surface px-3.5 py-2.5 outline-none focus:border-green focus:ring-3 focus:ring-green-soft ${invalid ? 'border-red' : 'border-line'}`

const PROMISES: { icon: IconName; title: Key; text: Key }[] = [
  { icon: 'chat', title: 'auth.promise1_title', text: 'auth.promise1_text' },
  { icon: 'code', title: 'auth.promise2_title', text: 'auth.promise2_text' },
  { icon: 'coin', title: 'auth.promise3_title', text: 'auth.promise3_text' },
]

// Panneau « nuit sous le baobab » : la promesse de Palabre, l'arbre animé et les vrais chiffres.
// Sur ordinateur, il reste fixe à l'écran pendant que le formulaire défile ; sur téléphone, seul le titre est affiché.
function Showcase({ title }: { title: string }) {
  const { t, country } = useI18n()
  const { data: stats } = useQuery({ queryKey: ['stats'], queryFn: getStats })
  const figures: [number | undefined, string][] = [
    [stats?.developers, t('auth.fig_devs')],
    [stats?.solvedQuestions, t('auth.fig_solved')],
    [COUNTRIES.length, t('auth.fig_countries')],
  ]

  return (
    <aside
      className="relative flex h-full flex-col overflow-hidden bg-[#0B1511] px-6 py-6 text-[#E7EEEA] sm:px-10 lg:py-8"
      style={{
        backgroundImage:
          'radial-gradient(60% 50% at 88% 8%, rgb(242 169 0 / .22), transparent 70%), radial-gradient(55% 45% at 8% 96%, rgb(63 191 143 / .28), transparent 70%)',
      }}
    >
      <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[13px] font-semibold text-[#F2B731]">
        <Icon name="spark" className="size-4" />
        {t('landing.tagline')}
      </span>
      <h2 className="mt-4 max-w-[16ch] text-[clamp(28px,3vw,42px)] font-extrabold tracking-tight text-white">{title}</h2>

      {/* Promesses : sur ordinateur seulement, et masquées sur les écrans peu hauts pour laisser l'arbre respirer */}
      <ul className="mt-5 hidden flex-col gap-2.5 lg:flex [@media(max-height:780px)]:lg:hidden">
        {PROMISES.map((p) => (
          <li key={p.title} className="flex items-center gap-3">
            <span className="grid size-8 flex-none place-items-center rounded-[9px] bg-white/10 text-[#3FBF8F]">
              <Icon name={p.icon} className="size-4" />
            </span>
            <span className="text-[14px]">
              <b className="text-white">{t(p.title)}</b>
              <span className="text-[#E7EEEA]/70"> · {t(p.text)}</span>
            </span>
          </li>
        ))}
      </ul>

      {/* L'arbre à palabres, avec sa pluie de code */}
      <div className="hidden min-h-0 flex-1 items-center justify-center lg:flex">
        {/* text-ink : les bulles de l'arbre gardent leur texte sombre sur fond clair */}
        <div className="w-full max-w-[460px] text-ink [@media(max-height:840px)]:max-w-[380px]">
          <CodeTree />
        </div>
      </div>

      <div className="mt-auto hidden lg:block">
        <dl className="grid grid-cols-3 gap-3 border-t border-white/15 pt-4">
          {figures.map(([n, label]) => (
            <div key={label}>
              <dd className="font-display text-[26px] font-extrabold text-white tabular-nums">{n === undefined ? '–' : formatNumber(n)}</dd>
              <dt className="text-[12px] text-[#E7EEEA]/65">{label}</dt>
            </div>
          ))}
        </dl>
        {/* Les 26 drapeaux, le nom au survol */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {COUNTRIES.map((c) => (
            <span key={c} title={country(c)} className="inline-flex">
              <Flag code={c} />
            </span>
          ))}
        </div>
      </div>
    </aside>
  )
}

// Deux colonnes sur ordinateur : panneau fixe à gauche, formulaire centré à droite qui défile si besoin.
// Sur téléphone : bandeau sombre avec le titre, puis le formulaire.
function AuthShell({ title, subtitle, showcase, children }: { title: string; subtitle: ReactNode; showcase: string; children: ReactNode }) {
  return (
    <div className="lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* 57px : hauteur de l'en-tête public collant, sous lequel le panneau se cale */}
      <div className="lg:sticky lg:top-[57px] lg:h-[calc(100dvh-57px)]">
        <Showcase title={showcase} />
      </div>
      <div className="flex justify-center px-4 py-8 sm:px-8 lg:min-h-[calc(100dvh-57px)] lg:items-center lg:py-12">
        <div className="w-full max-w-[460px]">
          <h1 className="text-[28px]">{title}</h1>
          <p className="mt-1.5 mb-6 text-sm text-muted">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  )
}

function Card({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-line bg-surface p-6 shadow-[0_24px_60px_-36px_rgb(0_0_0/.45)]">{children}</div>
}

// Après connexion : retour à la page demandée, sinon le fil
function useAfterAuth() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const from = (location.state as { from?: string } | null)?.from ?? '/app'
  return (me: Me) => {
    queryClient.setQueryData(['me'], me)
    queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'me' })
    navigate(from, { replace: true })
  }
}

// Comptes de démonstration (jury, visiteurs) : affichés seulement si l'API les publie
function DemoAccounts({ onPick, pendingEmail }: { onPick: (account: Me, password: string) => void; pendingEmail: string | null }) {
  const { t, country } = useI18n()
  const { data } = useQuery({ queryKey: ['demo-accounts'], queryFn: getDemoAccounts, staleTime: Infinity })
  if (!data || data.accounts.length === 0) return null

  return (
    <section aria-labelledby="demo-accounts" className="mt-5 rounded-2xl border border-dashed border-gold/50 bg-gold-soft/40 p-5">
      <h2 id="demo-accounts" className="flex items-center gap-2 text-[15px]">
        <Icon name="spark" className="size-4 text-gold" />
        {t('auth.demo_title')}
      </h2>
      <p className="mt-1 text-[13px] text-muted">
        {t('auth.demo_text')} <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-[12.5px] text-ink">{data.password}</code>
      </p>
      <ul className="mt-3 grid gap-2">
        {data.accounts.map((account) => {
          const pending = pendingEmail === account.email
          return (
            <li key={account.id}>
              <button
                type="button"
                disabled={pendingEmail !== null}
                onClick={() => onPick(account, data.password)}
                className="flex w-full items-center gap-3 rounded-[10px] border border-line bg-surface px-3 py-2 text-left transition hover:border-green disabled:opacity-60"
              >
                <Avatar user={account} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-semibold">{account.name}</span>
                  <span className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted">
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                      <Flag code={account.country} />
                      {account.city ? `${account.city}, ` : ''}
                      {country(account.country)}
                    </span>
                    <span className="truncate">{account.email}</span>
                  </span>
                </span>
                <span className="text-xs font-semibold whitespace-nowrap text-green">{pending ? t('auth.logging_in') : t('auth.demo_use')}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function LoginPage() {
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const done = useAfterAuth()
  const location = useLocation()
  const mutation = useMutation({
    mutationFn: (input: { email: string; password: string }) => login({ ...input, remember }),
    onSuccess: done,
  })

  const useDemoAccount = (account: Me, demoPassword: string) => {
    setEmail(account.email)
    setPassword(demoPassword)
    mutation.mutate({ email: account.email, password: demoPassword })
  }

  return (
    <AuthShell
      title={t('common.login')}
      showcase={t('auth.login_showcase')}
      subtitle={
        <>
          {t('auth.no_account')}{' '}
          <Link to="/inscription" state={location.state} className="font-semibold text-green">
            {t('common.join_palabre')}
          </Link>
        </>
      }
    >
      <Card>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            mutation.mutate({ email, password })
          }}
        >
          <div>
            <label htmlFor="login-email" className="mb-1.5 block text-sm font-bold">
              {t('auth.email')}
            </label>
            <input id="login-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass()} />
          </div>
          <div>
            <label htmlFor="login-password" className="mb-1.5 block text-sm font-bold">
              {t('auth.password')}
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass()}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input id="login-remember" type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="size-4 accent-[var(--green)]" />
            {t('auth.remember')}
          </label>
          {mutation.isError && <p className="rounded-lg bg-red/10 px-3 py-2 text-[13px] text-red">{errorMessage(mutation.error)}</p>}
          <button disabled={mutation.isPending} className="rounded-[10px] bg-green px-4 py-2.5 font-semibold text-green-ink hover:brightness-110 disabled:opacity-60">
            {mutation.isPending ? t('auth.logging_in') : t('common.login')}
          </button>
        </form>
      </Card>
      <DemoAccounts onPick={useDemoAccount} pendingEmail={mutation.isPending ? mutation.variables.email : null} />
    </AuthShell>
  )
}

export function RegisterPage() {
  const { t, country } = useI18n()
  const [form, setForm] = useState({ name: '', email: '', password: '', country: 'SN' as CountryCode, city: '' })
  const done = useAfterAuth()
  const location = useLocation()
  const mutation = useMutation({ mutationFn: () => register(form), onSuccess: done })
  const errors = fieldErrors(mutation.error)
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value })

  return (
    <AuthShell
      title={t('common.join_palabre')}
      showcase={t('auth.register_showcase')}
      subtitle={
        <>
          {t('auth.have_account')}{' '}
          <Link to="/connexion" state={location.state} className="font-semibold text-green">
            {t('common.login')}
          </Link>
        </>
      }
    >
      <Card>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            mutation.mutate()
          }}
        >
          <div>
            <label htmlFor="reg-name" className="mb-1.5 block text-sm font-bold">
              {t('auth.name')}
            </label>
            <input id="reg-name" autoComplete="name" required value={form.name} onChange={set('name')} className={inputClass(errors.name)} />
            {errors.name && <p className="mt-1.5 text-[13px] text-red">{errors.name}</p>}
          </div>
          <div>
            <label htmlFor="reg-email" className="mb-1.5 block text-sm font-bold">
              {t('auth.email')}
            </label>
            <input id="reg-email" type="email" autoComplete="email" required value={form.email} onChange={set('email')} className={inputClass(errors.email)} />
            {errors.email && <p className="mt-1.5 text-[13px] text-red">{errors.email}</p>}
          </div>
          <div>
            <label htmlFor="reg-password" className="mb-1.5 block text-sm font-bold">
              {t('auth.password')}
            </label>
            <input
              id="reg-password"
              type="password"
              autoComplete="new-password"
              required
              value={form.password}
              onChange={set('password')}
              className={inputClass(errors.password)}
            />
            <p className="mt-1.5 text-[12.5px] text-muted">{t('auth.password_hint')}</p>
            {errors.password && <p className="mt-1 text-[13px] text-red">{errors.password}</p>}
          </div>
          <fieldset>
            <legend className="mb-1.5 text-sm font-bold">{t('auth.country')}</legend>
            <p className="mb-2 text-[12.5px] text-muted">{t('auth.country_hint')}</p>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {COUNTRIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={form.country === c}
                  onClick={() => setForm({ ...form, country: c })}
                  className={`flex items-center gap-2 rounded-[10px] border px-2.5 py-1.5 text-left text-[13px] font-semibold ${
                    form.country === c ? 'border-green bg-green-soft text-green' : 'border-line'
                  }`}
                >
                  <Flag code={c} />
                  {country(c)}
                </button>
              ))}
            </div>
            {errors.country && <p className="mt-1.5 text-[13px] text-red">{errors.country}</p>}
          </fieldset>
          <div>
            <label htmlFor="reg-city" className="mb-1.5 block text-sm font-bold">
              {t('auth.city')} <span className="font-medium text-muted">{t('common.optional')}</span>
            </label>
            <input id="reg-city" autoComplete="address-level2" value={form.city} onChange={set('city')} className={inputClass(errors.city)} />
          </div>
          {mutation.isError && Object.keys(errors).length === 0 && (
            <p className="rounded-lg bg-red/10 px-3 py-2 text-[13px] text-red">{errorMessage(mutation.error)}</p>
          )}
          <button disabled={mutation.isPending} className="rounded-[10px] bg-green px-4 py-2.5 font-semibold text-green-ink hover:brightness-110 disabled:opacity-60">
            {mutation.isPending ? t('auth.creating') : t('auth.create')}
          </button>
        </form>
      </Card>
    </AuthShell>
  )
}
