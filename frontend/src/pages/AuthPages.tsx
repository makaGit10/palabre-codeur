import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Avatar, Flag } from '../components/Brand'
import { Icon, type IconName } from '../components/Icon'
import { errorMessage, fieldErrors } from '../lib/api'
import { COUNTRY_NAMES, formatNumber } from '../lib/format'
import { getDemoAccounts, login, register } from '../services/auth'
import { getStats } from '../services/community'
import type { CountryCode, Me } from '../types'

const inputClass = (invalid?: string) =>
  `w-full rounded-[10px] border bg-surface px-3.5 py-2.5 outline-none focus:border-green focus:ring-3 focus:ring-green-soft ${invalid ? 'border-red' : 'border-line'}`

const COUNTRIES = Object.keys(COUNTRY_NAMES) as CountryCode[]

const PROMISES: { icon: IconName; title: string; text: string }[] = [
  { icon: 'chat', title: 'Des réponses de chez nous', text: 'Wave, Orange Money, paie OHADA, connexion 3G : des devs qui connaissent vos problèmes.' },
  { icon: 'code', title: 'Du code déjà testé', text: 'Des snippets pour les API africaines, confirmés par ceux qui les ont utilisés.' },
  { icon: 'coin', title: 'Aider rapporte', text: 'Réputation, badges et primes en mobile money quand votre réponse est validée.' },
]

// Panneau vert : la promesse de Palabre et les vrais chiffres de la communauté
function Showcase({ title }: { title: string }) {
  const { data: stats } = useQuery({ queryKey: ['stats'], queryFn: getStats })
  const figures: [number | undefined, string][] = [
    [stats?.developers, 'développeurs'],
    [stats?.solvedQuestions, 'questions résolues'],
    [stats?.countries, 'pays'],
  ]

  return (
    <aside className="relative overflow-hidden rounded-[24px] bg-green p-7 text-green-ink sm:p-9">
      {/* Marque en filigrane */}
      <svg viewBox="0 0 40 40" className="pointer-events-none absolute -right-14 -bottom-16 size-72 opacity-[.13]" aria-hidden="true">
        <path d="M18 34c.5-5 .3-9-1-13M22 34c-.4-5 0-9 1.5-13M17 21c-3-1-5-3-6-5M23.5 21c3-1 5-3 6-5M20 21v-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        <ellipse cx="20" cy="13" rx="11" ry="5.5" fill="currentColor" />
      </svg>

      <span className="inline-flex items-center gap-2 rounded-full bg-green-ink/15 px-3 py-1 text-[13px] font-semibold">
        <Icon name="spark" className="size-4" />
        Pour les devs, par les devs
      </span>
      <h2 className="mt-4 max-w-[18ch] text-[clamp(26px,3.2vw,36px)] font-extrabold tracking-tight">{title}</h2>

      <ul className="mt-6 flex flex-col gap-4">
        {PROMISES.map((p) => (
          <li key={p.title} className="flex gap-3">
            <span className="grid size-9 flex-none place-items-center rounded-[10px] bg-green-ink/15">
              <Icon name={p.icon} className="size-[18px]" />
            </span>
            <span>
              <b className="block text-[15px]">{p.title}</b>
              <span className="text-[13.5px] opacity-85">{p.text}</span>
            </span>
          </li>
        ))}
      </ul>

      <dl className="mt-7 grid grid-cols-3 gap-3 border-t border-green-ink/20 pt-5">
        {figures.map(([n, label]) => (
          <div key={label}>
            <dd className="font-display text-[26px] font-extrabold tabular-nums">{n === undefined ? '–' : formatNumber(n)}</dd>
            <dt className="text-[12px] opacity-75">{label}</dt>
          </div>
        ))}
      </dl>

      <div className="mt-5 flex flex-wrap gap-x-3.5 gap-y-1.5 text-[12.5px] opacity-85">
        {COUNTRIES.map((c) => (
          <span key={c} className="inline-flex items-center gap-1.5">
            <Flag code={c} />
            {COUNTRY_NAMES[c]}
          </span>
        ))}
      </div>
    </aside>
  )
}

// Formulaire à droite, panneau de présentation à gauche (en dessous sur téléphone)
function AuthShell({ title, subtitle, showcase, children }: { title: string; subtitle: ReactNode; showcase: string; children: ReactNode }) {
  return (
    <div className="mx-auto grid w-full max-w-[1120px] gap-8 px-4 py-8 md:px-10 lg:grid-cols-[1.05fr_1fr] lg:items-start lg:gap-12 lg:py-12">
      <div className="order-1 lg:order-2 lg:pt-1">
        <h1 className="text-[28px]">{title}</h1>
        <p className="mt-1.5 mb-6 text-sm text-muted">{subtitle}</p>
        {children}
      </div>
      <div className="order-2 lg:order-1">
        <Showcase title={showcase} />
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
  const { data } = useQuery({ queryKey: ['demo-accounts'], queryFn: getDemoAccounts, staleTime: Infinity })
  if (!data || data.accounts.length === 0) return null

  return (
    <section aria-labelledby="demo-accounts" className="mt-5 rounded-2xl border border-dashed border-gold/50 bg-gold-soft/40 p-5">
      <h2 id="demo-accounts" className="flex items-center gap-2 text-[15px]">
        <Icon name="spark" className="size-4 text-gold" />
        Comptes de démonstration
      </h2>
      <p className="mt-1 text-[13px] text-muted">
        Pour le jury et les visiteurs : un clic sur un compte vous connecte. Mot de passe commun :{' '}
        <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-[12.5px] text-ink">{data.password}</code>
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
                    <Flag code={account.country} />
                    {account.city ? `${account.city}, ` : ''}
                    {COUNTRY_NAMES[account.country]} · {account.email}
                  </span>
                </span>
                <span className="text-xs font-semibold whitespace-nowrap text-green">{pending ? 'Connexion…' : 'Utiliser ce compte'}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function LoginPage() {
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
      title="Se connecter"
      showcase="Bon retour sous l'arbre."
      subtitle={
        <>
          Pas encore de compte ?{' '}
          <Link to="/inscription" state={location.state} className="font-semibold text-green">
            Rejoindre Palabre
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
              Adresse e-mail
            </label>
            <input id="login-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass()} />
          </div>
          <div>
            <label htmlFor="login-password" className="mb-1.5 block text-sm font-bold">
              Mot de passe
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
            Rester connecté sur cet appareil
          </label>
          {mutation.isError && <p className="rounded-lg bg-red/10 px-3 py-2 text-[13px] text-red">{errorMessage(mutation.error)}</p>}
          <button disabled={mutation.isPending} className="rounded-[10px] bg-green px-4 py-2.5 font-semibold text-green-ink hover:brightness-110 disabled:opacity-60">
            {mutation.isPending ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </Card>
      <DemoAccounts onPick={useDemoAccount} pendingEmail={mutation.isPending ? mutation.variables.email : null} />
    </AuthShell>
  )
}

export function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', country: 'SN' as CountryCode, city: '' })
  const done = useAfterAuth()
  const location = useLocation()
  const mutation = useMutation({ mutationFn: () => register(form), onSuccess: done })
  const errors = fieldErrors(mutation.error)
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value })

  return (
    <AuthShell
      title="Rejoindre Palabre"
      showcase="Prenez place sous l'arbre."
      subtitle={
        <>
          Déjà inscrit ?{' '}
          <Link to="/connexion" state={location.state} className="font-semibold text-green">
            Se connecter
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
              Nom complet
            </label>
            <input id="reg-name" autoComplete="name" required value={form.name} onChange={set('name')} className={inputClass(errors.name)} />
            {errors.name && <p className="mt-1.5 text-[13px] text-red">{errors.name}</p>}
          </div>
          <div>
            <label htmlFor="reg-email" className="mb-1.5 block text-sm font-bold">
              Adresse e-mail
            </label>
            <input id="reg-email" type="email" autoComplete="email" required value={form.email} onChange={set('email')} className={inputClass(errors.email)} />
            {errors.email && <p className="mt-1.5 text-[13px] text-red">{errors.email}</p>}
          </div>
          <div>
            <label htmlFor="reg-password" className="mb-1.5 block text-sm font-bold">
              Mot de passe
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
            <p className="mt-1.5 text-[12.5px] text-muted">Au moins 8 caractères, avec des lettres et des chiffres.</p>
            {errors.password && <p className="mt-1 text-[13px] text-red">{errors.password}</p>}
          </div>
          <fieldset>
            <legend className="mb-1.5 text-sm font-bold">Pays</legend>
            <p className="mb-2 text-[12.5px] text-muted">Il détermine votre monnaie et vos moyens de paiement.</p>
            <div className="grid grid-cols-2 gap-2">
              {COUNTRIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={form.country === c}
                  onClick={() => setForm({ ...form, country: c })}
                  className={`flex items-center gap-2 rounded-[10px] border px-3 py-2 text-left text-[13.5px] font-semibold ${
                    form.country === c ? 'border-green bg-green-soft text-green' : 'border-line'
                  }`}
                >
                  <Flag code={c} />
                  {COUNTRY_NAMES[c]}
                </button>
              ))}
            </div>
            {errors.country && <p className="mt-1.5 text-[13px] text-red">{errors.country}</p>}
          </fieldset>
          <div>
            <label htmlFor="reg-city" className="mb-1.5 block text-sm font-bold">
              Ville <span className="font-medium text-muted">(facultatif)</span>
            </label>
            <input id="reg-city" autoComplete="address-level2" value={form.city} onChange={set('city')} className={inputClass(errors.city)} />
          </div>
          {mutation.isError && Object.keys(errors).length === 0 && (
            <p className="rounded-lg bg-red/10 px-3 py-2 text-[13px] text-red">{errorMessage(mutation.error)}</p>
          )}
          <button disabled={mutation.isPending} className="rounded-[10px] bg-green px-4 py-2.5 font-semibold text-green-ink hover:brightness-110 disabled:opacity-60">
            {mutation.isPending ? 'Création du compte…' : 'Créer mon compte'}
          </button>
        </form>
      </Card>
    </AuthShell>
  )
}
