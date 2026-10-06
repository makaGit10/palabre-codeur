import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Flag } from '../components/Brand'
import { errorMessage, fieldErrors } from '../lib/api'
import { COUNTRY_NAMES } from '../lib/format'
import { login, register } from '../services/auth'
import type { CountryCode, Me } from '../types'

const inputClass = (invalid?: string) =>
  `w-full rounded-[10px] border bg-surface px-3.5 py-2.5 outline-none focus:border-green focus:ring-3 focus:ring-green-soft ${invalid ? 'border-red' : 'border-line'}`

function AuthCard({ title, subtitle, children }: { title: string; subtitle: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[440px] px-4 py-12">
      <h1 className="text-[28px]">{title}</h1>
      <p className="mt-1.5 mb-6 text-sm text-muted">{subtitle}</p>
      <div className="rounded-2xl border border-line bg-surface p-6">{children}</div>
    </div>
  )
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

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const done = useAfterAuth()
  const mutation = useMutation({ mutationFn: () => login({ email, password, remember }), onSuccess: done })
  const location = useLocation()

  return (
    <AuthCard
      title="Se connecter"
      subtitle={
        <>
          Pas encore de compte ?{' '}
          <Link to="/inscription" state={location.state} className="font-semibold text-green">
            Rejoindre Palabre
          </Link>
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          mutation.mutate()
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
    </AuthCard>
  )
}

const COUNTRIES = Object.keys(COUNTRY_NAMES) as CountryCode[]

export function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', country: 'SN' as CountryCode, city: '' })
  const done = useAfterAuth()
  const location = useLocation()
  const mutation = useMutation({ mutationFn: () => register(form), onSuccess: done })
  const errors = fieldErrors(mutation.error)
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value })

  return (
    <AuthCard
      title="Rejoindre Palabre"
      subtitle={
        <>
          Déjà inscrit ?{' '}
          <Link to="/connexion" state={location.state} className="font-semibold text-green">
            Se connecter
          </Link>
        </>
      }
    >
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
    </AuthCard>
  )
}
