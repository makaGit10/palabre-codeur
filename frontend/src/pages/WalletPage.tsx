import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Flag } from '../components/Brand'
import { Icon } from '../components/Icon'
import { useToast } from '../components/toastContext'
import { COUNTRY_NAMES, formatFcfa, PAYMENT_LABELS, timeAgo } from '../lib/format'
import { COUNTRY_CURRENCY, localHint, METHODS_BY_COUNTRY, MIN_WITHDRAWAL, MOBILE_MONEY, PHONE_PREFIX } from '../lib/money'
import { useAuth } from '../hooks/useAuth'
import { errorMessage } from '../lib/api'
import { getWallet, withdraw } from '../services/wallet'
import type { CountryCode, PaymentMethod, WalletTransaction } from '../types'

const TX_STYLE: Record<WalletTransaction['type'], { sign: string; className: string; tag: string }> = {
  bounty_received: { sign: '+', className: 'text-green', tag: 'Reçue' },
  withdrawal: { sign: '−', className: 'text-ink', tag: 'Retrait' },
  bounty_held: { sign: '', className: 'text-gold', tag: 'Offerte' },
  bounty_paid: { sign: '', className: 'text-muted', tag: 'Versée' },
}

export default function WalletPage() {
  const { data: w, isLoading } = useQuery({ queryKey: ['wallet'], queryFn: getWallet })
  const [open, setOpen] = useState(false)
  const { user } = useAuth()
  const country = user?.country ?? 'SN'

  if (isLoading || !w) return <p className="py-16 text-center text-muted">Chargement du portefeuille…</p>
  const hint = localHint(w.balance, country)

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 max-w-[860px]">
        <h1 className="text-[26px]">Portefeuille</h1>
        <p className="mt-1 mb-5 text-sm text-muted">Vos gains de primes, en crédits Palabre (1 crédit = 1 FCFA), à retirer dans votre pays.</p>

        <section className="rounded-2xl bg-green p-6 text-green-ink">
          <p className="text-sm opacity-85">Solde disponible</p>
          <p className="mt-1 font-display text-[clamp(34px,5vw,48px)] font-extrabold tabular-nums">{formatFcfa(w.balance)}</p>
          {hint && <p className="text-sm opacity-85">{hint} · taux indicatif</p>}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setOpen(!open)}
              disabled={w.balance < MIN_WITHDRAWAL}
              className="inline-flex items-center gap-2 rounded-[10px] bg-green-ink px-4 py-2.5 text-sm font-bold text-green disabled:opacity-50"
            >
              <Icon name="wallet" />
              {open ? 'Fermer' : 'Retirer mes gains'}
            </button>
            {w.held > 0 && (
              <span className="text-[13px] opacity-85">
                {formatFcfa(w.held)} de primes offertes, bloquées jusqu'à validation
              </span>
            )}
          </div>
          {w.balance < MIN_WITHDRAWAL && <p className="mt-3 text-[13px] opacity-85">Retrait possible à partir de {formatFcfa(MIN_WITHDRAWAL)}.</p>}
        </section>

        {open && <WithdrawForm balance={w.balance} country={country} onDone={() => setOpen(false)} />}

        <h2 className="mt-8 mb-3 text-lg">Historique</h2>
        <ul className="overflow-hidden rounded-[14px] border border-line bg-surface">
          {w.transactions.map((t) => {
            const s = TX_STYLE[t.type]
            return (
              <li key={t.id} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-0">
                <span className={`rounded-md bg-sunk px-2 py-0.5 text-[11px] font-bold uppercase ${s.className}`}>{s.tag}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{t.label}</span>
                  <span className="text-xs text-muted">
                    {timeAgo(t.date)}
                    {t.method && ` · ${PAYMENT_LABELS[t.method]}`}
                  </span>
                </span>
                <span className={`font-bold whitespace-nowrap tabular-nums ${s.className}`}>
                  {s.sign}
                  {formatFcfa(t.amount)}
                </span>
              </li>
            )
          })}
        </ul>
      </div>

      <aside className="flex flex-col gap-4 xl:sticky xl:top-7">
        <section className="rounded-[14px] border border-line bg-surface p-5">
          <h2 className="mb-3 text-base">Comment ça marche</h2>
          <ol className="flex list-decimal flex-col gap-2 pl-5 text-[13.5px] text-muted">
            <li>Quand votre réponse est validée, la prime arrive ici en crédits.</li>
            <li>Les montants s'affichent dans votre monnaie.</li>
            <li>Vous retirez quand vous voulez, avec un moyen disponible dans votre pays.</li>
          </ol>
        </section>
        <section className="rounded-[14px] border border-line bg-surface p-5">
          <h2 className="mb-1 text-base">Partout en Afrique</h2>
          <p className="mb-3 text-[12.5px] text-muted">Une prime de 2 000 FCFA, reçue dans chaque pays :</p>
          <ul className="flex flex-col gap-2.5 text-[13px]">
            {(Object.keys(METHODS_BY_COUNTRY) as CountryCode[]).map((c) => (
              <li key={c} className="border-b border-line pb-2.5 last:border-0 last:pb-0">
                <span className="flex items-center justify-between gap-2 font-semibold">
                  <span className="flex items-center gap-2">
                    <Flag code={c} />
                    {COUNTRY_NAMES[c]}
                  </span>
                  <span className="tabular-nums">{localHint(2000, c) ?? `2 000 ${COUNTRY_CURRENCY[c] === 'XAF' ? 'FCFA (XAF)' : 'FCFA'}`}</span>
                </span>
                <span className="text-xs text-muted">{METHODS_BY_COUNTRY[c].map((m) => PAYMENT_LABELS[m]).join(' · ')}</span>
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
  )
}

function WithdrawForm({ balance, country, onDone }: { balance: number; country: CountryCode; onDone: () => void }) {
  const methods = METHODS_BY_COUNTRY[country]
  const [amount, setAmount] = useState(String(balance))
  const [method, setMethod] = useState<PaymentMethod>(methods[0])
  const [account, setAccount] = useState('')
  const [error, setError] = useState('')
  const queryClient = useQueryClient()
  const toast = useToast()
  const isMobile = MOBILE_MONEY.includes(method)

  const mutation = useMutation({
    mutationFn: () => withdraw({ amount: Number(amount), method, account: isMobile ? `${PHONE_PREFIX[country]}${account}` : account }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
      toast(`Retrait de ${formatFcfa(Number(amount))} vers ${PAYMENT_LABELS[method]} envoyé (paiement test)`, 'wallet')
      onDone()
    },
    onError: (e) => setError(errorMessage(e)),
  })

  const submit = () => {
    const n = Number(amount)
    const digits = account.replace(/\s/g, '')
    if (!Number.isInteger(n) || n < MIN_WITHDRAWAL) return setError(`Le retrait minimum est de ${formatFcfa(MIN_WITHDRAWAL)}.`)
    if (n > balance) return setError(`Vous ne pouvez pas retirer plus que votre solde (${formatFcfa(balance)}).`)
    if (isMobile && !/^\d{8,10}$/.test(digits)) return setError('Entrez votre numéro de téléphone, sans indicatif (8 à 10 chiffres).')
    if (method === 'bank_transfer' && digits.length < 16) return setError('Entrez votre RIB complet (au moins 16 caractères).')
    setError('')
    mutation.mutate()
  }

  const chip = (on: boolean) => `rounded-[10px] border px-3.5 py-2 text-[13.5px] font-semibold ${on ? 'border-green bg-green-soft text-green' : 'border-line bg-surface'}`

  return (
    <form
      noValidate
      className="mt-4 flex flex-col gap-5 rounded-2xl border border-line bg-surface p-5"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <div>
        <label htmlFor="wd-amount" className="mb-1.5 block text-sm font-bold">
          Montant à retirer
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-[10px] border border-line bg-surface focus-within:border-green">
            <input
              id="wd-amount"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
              className="w-32 bg-transparent px-3.5 py-2.5 font-bold tabular-nums outline-none"
            />
            <span className="pr-3.5 text-sm text-muted">FCFA</span>
          </div>
          {[MIN_WITHDRAWAL, 2000].filter((v) => v < balance).map((v) => (
            <button key={v} type="button" onClick={() => setAmount(String(v))} className={chip(Number(amount) === v)}>
              {formatFcfa(v)}
            </button>
          ))}
          <button type="button" onClick={() => setAmount(String(balance))} className={chip(Number(amount) === balance)}>
            Tout
          </button>
        </div>
        {localHint(Number(amount) || 0, country) && <p className="mt-1.5 text-[13px] text-muted">{localHint(Number(amount) || 0, country)}</p>}
      </div>

      <fieldset>
        <legend className="mb-1.5 text-sm font-bold">Recevoir sur</legend>
        <p className="mb-2 text-[12.5px] text-muted">Seuls les moyens disponibles au {COUNTRY_NAMES[country]} sont proposés.</p>
        <div className="flex flex-wrap gap-2">
          {methods.map((m) => (
            <button key={m} type="button" aria-pressed={method === m} onClick={() => setMethod(m)} className={chip(method === m)}>
              {PAYMENT_LABELS[m]}
            </button>
          ))}
        </div>
      </fieldset>

      {isMobile && (
        <div>
          <label htmlFor="wd-phone" className="mb-1.5 block text-sm font-bold">
            Numéro {PAYMENT_LABELS[method]}
          </label>
          <div className="flex max-w-xs items-center rounded-[10px] border border-line bg-surface focus-within:border-green">
            <span className="border-r border-line px-3 py-2.5 text-sm text-muted">{PHONE_PREFIX[country]}</span>
            <input
              id="wd-phone"
              inputMode="tel"
              autoComplete="tel-national"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              placeholder="77 123 45 67"
              className="min-w-0 flex-1 bg-transparent px-3 py-2.5 outline-none"
            />
          </div>
        </div>
      )}
      {method === 'bank_transfer' && (
        <div>
          <label htmlFor="wd-rib" className="mb-1.5 block text-sm font-bold">
            RIB
          </label>
          <input
            id="wd-rib"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            placeholder="Votre relevé d'identité bancaire"
            className="w-full max-w-md rounded-[10px] border border-line bg-surface px-3.5 py-2.5 outline-none focus:border-green"
          />
        </div>
      )}
      {method === 'card' && <p className="text-[13px] text-muted">Le montant sera versé sur la carte bancaire enregistrée sur votre compte.</p>}

      {error && <p className="text-[13px] text-red">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <span className="text-xs text-muted">Paiement en mode test pendant le concours.</span>
        <button disabled={mutation.isPending} className="rounded-[10px] bg-green px-4 py-2.5 text-sm font-semibold text-green-ink hover:brightness-110 disabled:opacity-60">
          {mutation.isPending ? 'Envoi…' : `Retirer ${formatFcfa(Number(amount) || 0)}`}
        </button>
      </div>
    </form>
  )
}
