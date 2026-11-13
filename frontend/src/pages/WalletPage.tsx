import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Flag } from '../components/Brand'
import { Icon } from '../components/Icon'
import { useToast } from '../components/toastContext'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useI18n, type Key } from '../i18n'
import { errorMessage } from '../lib/api'
import { formatFcfa, timeAgo } from '../lib/format'
import { COUNTRIES, COUNTRY_CURRENCY, localHint, METHODS_BY_COUNTRY, MIN_WITHDRAWAL, MOBILE_MONEY, PHONE_PREFIX } from '../lib/money'
import { getWallet, startTopup, withdraw } from '../services/wallet'
import type { CountryCode, PaymentMethod, WalletTransaction } from '../types'

const TX_STYLE: Record<WalletTransaction['type'], { sign: string; className: string; tag: Key }> = {
  bounty_received: { sign: '+', className: 'text-green', tag: 'w.tx_received' },
  withdrawal: { sign: '−', className: 'text-ink', tag: 'w.tx_withdrawal' },
  bounty_held: { sign: '', className: 'text-gold', tag: 'w.tx_held' },
  bounty_paid: { sign: '', className: 'text-muted', tag: 'w.tx_paid' },
  topup: { sign: '+', className: 'text-green', tag: 'w.tx_topup' },
  bounty_refunded: { sign: '+', className: 'text-green', tag: 'w.tx_refunded' },
}

export default function WalletPage() {
  const { t, country: countryName, payment } = useI18n()
  const { data: w, isLoading } = useQuery({ queryKey: ['wallet'], queryFn: getWallet })
  const [open, setOpen] = useState(false)
  const [topup, setTopup] = useState(false)
  const [params, setParams] = useSearchParams()
  const toast = useToast()
  const queryClient = useQueryClient()

  // Retour de la page de paiement PayTech : message, puis le solde se met à jour dès la confirmation
  const back = params.get('recharge')
  useEffect(() => {
    if (!back) return
    toast(back === 'ok' ? t('w.topup_back_ok') : t('w.topup_back_canceled'), back === 'ok' ? 'coin' : 'close')
    queryClient.invalidateQueries({ queryKey: ['wallet'] })
    setParams({}, { replace: true })
  }, [back, toast, t, queryClient, setParams])
  const { user } = useAuth()
  const country = user?.country ?? 'SN'

  if (isLoading || !w) return <p className="py-16 text-center text-muted">{t('w.loading')}</p>
  const hint = localHint(w.balance, country)

  // L'API ne renvoie que le sujet d'une opération (titre de la question, numéro masqué…) : le libellé se compose ici
  const txLabel = (tx: WalletTransaction) => {
    switch (tx.type) {
      case 'bounty_received':
        return t('w.label_received', { subject: tx.label })
      case 'bounty_held':
        return t('w.label_held', { subject: tx.label })
      case 'bounty_paid':
        return t('w.label_paid', { subject: tx.label })
      case 'bounty_refunded':
        return t('w.label_refunded', { subject: tx.label })
      case 'topup':
        return tx.label ? t('w.label_topup_via', { method: tx.label }) : t('w.label_topup')
      case 'withdrawal':
        return tx.label ? t('w.label_withdrawal', { subject: tx.label }) : t('w.label_withdrawal_card')
    }
  }

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 max-w-[860px]">
        <h1 className="text-[26px]">{t('w.title')}</h1>
        <p className="mt-1 text-sm text-muted">{t('w.subtitle')}</p>
        {/* Honnêteté : pendant le concours, aucun paiement n'est réel */}
        <p className="mt-3 mb-5 inline-flex items-start gap-2 rounded-xl border border-gold/40 bg-gold-soft px-3 py-1.5 text-[12.5px] font-semibold text-gold">
          <Icon name="coin" className="mt-0.5 size-3.5 shrink-0" />
          {t('w.simulation')}
        </p>

        <section className="rounded-2xl bg-green p-6 text-green-ink">
          <p className="text-sm opacity-85">{t('w.balance')}</p>
          <p className="mt-1 font-display text-[clamp(34px,5vw,48px)] font-extrabold tabular-nums">{formatFcfa(w.balance)}</p>
          {hint && (
            <p className="text-sm opacity-85">
              {hint} {t('w.rate')}
            </p>
          )}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setOpen(!open)}
              disabled={w.balance < MIN_WITHDRAWAL}
              className="inline-flex items-center gap-2 rounded-[10px] bg-green-ink px-4 py-2.5 text-sm font-bold text-green disabled:opacity-50"
            >
              <Icon name="wallet" />
              {open ? t('common.close') : t('w.withdraw')}
            </button>
            <button
              onClick={() => setTopup(!topup)}
              className="inline-flex items-center gap-2 rounded-[10px] border border-green-ink/40 px-4 py-2.5 text-sm font-bold text-green-ink hover:bg-green-ink/10"
            >
              <Icon name="plus" />
              {topup ? t('common.close') : t('w.topup')}
            </button>
            {w.held > 0 && <span className="text-[13px] opacity-85">{t('w.held', { amount: formatFcfa(w.held) })}</span>}
          </div>
          {w.balance < MIN_WITHDRAWAL && <p className="mt-3 text-[13px] opacity-85">{t('w.min', { amount: formatFcfa(MIN_WITHDRAWAL) })}</p>}
        </section>

        {topup && <TopupForm onDone={() => setTopup(false)} />}
        {open && <WithdrawForm balance={w.balance} country={country} onDone={() => setOpen(false)} />}

        <h2 className="mt-8 mb-3 text-lg">{t('w.history')}</h2>
        <ul className="overflow-hidden rounded-[14px] border border-line bg-surface">
          {w.transactions.map((tx) => {
            const s = TX_STYLE[tx.type]
            return (
              <li key={tx.id} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-0">
                <span className={`rounded-md bg-sunk px-2 py-0.5 text-[11px] font-bold uppercase ${s.className}`}>{t(s.tag)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{txLabel(tx)}</span>
                  <span className="text-xs text-muted">
                    {timeAgo(tx.date)}
                    {tx.method && ` · ${payment(tx.method)}`}
                  </span>
                </span>
                <span className={`font-bold whitespace-nowrap tabular-nums ${s.className}`}>
                  {s.sign}
                  {formatFcfa(tx.amount)}
                </span>
              </li>
            )
          })}
        </ul>
      </div>

      <aside className="flex flex-col gap-4 xl:sticky xl:top-7">
        <section className="rounded-[14px] border border-line bg-surface p-5">
          <h2 className="mb-3 text-base">{t('w.how')}</h2>
          <ol className="flex list-decimal flex-col gap-2 pl-5 text-[13.5px] text-muted">
            <li>{t('w.how1')}</li>
            <li>{t('w.how2')}</li>
            <li>{t('w.how3')}</li>
          </ol>
        </section>
        <section className="rounded-[14px] border border-line bg-surface p-5">
          <h2 className="mb-1 text-base">{t('w.everywhere')}</h2>
          <p className="mb-3 text-[12.5px] text-muted">{t('w.everywhere_text')}</p>
          {/* 26 pays : la liste défile dans son cadre */}
          <ul className="flex max-h-[440px] flex-col gap-2.5 overflow-y-auto pr-1 text-[13px]">
            {COUNTRIES.map((c) => (
              <li key={c} className="border-b border-line pb-2.5 last:border-0 last:pb-0">
                <span className="flex items-center justify-between gap-2 font-semibold">
                  <span className="flex items-center gap-2">
                    <Flag code={c} />
                    {countryName(c)}
                  </span>
                  <span className="tabular-nums">{localHint(2000, c) ?? `2 000 ${COUNTRY_CURRENCY[c] === 'XAF' ? 'FCFA (XAF)' : 'FCFA'}`}</span>
                </span>
                <span className="text-xs text-muted">{METHODS_BY_COUNTRY[c].map((m) => payment(m)).join(' · ')}</span>
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
  )
}

function WithdrawForm({ balance, country, onDone }: { balance: number; country: CountryCode; onDone: () => void }) {
  const { t, country: countryName, payment } = useI18n()
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
      toast(t('w.toast', { amount: formatFcfa(Number(amount)), method: payment(method) }), 'wallet')
      onDone()
    },
    onError: (e) => setError(errorMessage(e)),
  })

  const submit = () => {
    const n = Number(amount)
    const digits = account.replace(/\s/g, '')
    if (!Number.isInteger(n) || n < MIN_WITHDRAWAL) return setError(t('w.err_min', { amount: formatFcfa(MIN_WITHDRAWAL) }))
    if (n > balance) return setError(t('w.err_balance', { amount: formatFcfa(balance) }))
    if (isMobile && !/^\d{8,10}$/.test(digits)) return setError(t('w.err_phone'))
    if (method === 'bank_transfer' && digits.length < 16) return setError(t('w.err_rib'))
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
          {t('w.amount')}
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
            {t('w.all')}
          </button>
        </div>
        {localHint(Number(amount) || 0, country) && <p className="mt-1.5 text-[13px] text-muted">{localHint(Number(amount) || 0, country)}</p>}
      </div>

      <fieldset>
        <legend className="mb-1.5 text-sm font-bold">{t('w.receive_on')}</legend>
        <p className="mb-2 text-[12.5px] text-muted">{t('w.methods_hint', { country: countryName(country) })}</p>
        <div className="flex flex-wrap gap-2">
          {methods.map((m) => (
            <button key={m} type="button" aria-pressed={method === m} onClick={() => setMethod(m)} className={chip(method === m)}>
              {payment(m)}
            </button>
          ))}
        </div>
      </fieldset>

      {isMobile && (
        <div>
          <label htmlFor="wd-phone" className="mb-1.5 block text-sm font-bold">
            {t('w.number', { method: payment(method) })}
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
            {t('w.rib')}
          </label>
          <input
            id="wd-rib"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            placeholder={t('w.rib_placeholder')}
            className="w-full max-w-md rounded-[10px] border border-line bg-surface px-3.5 py-2.5 outline-none focus:border-green"
          />
        </div>
      )}
      {method === 'card' && <p className="text-[13px] text-muted">{t('w.card_note')}</p>}

      {error && <p className="text-[13px] text-red">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <span className="text-xs text-muted">{t('w.test_mode')}</span>
        <button disabled={mutation.isPending} className="rounded-[10px] bg-green px-4 py-2.5 text-sm font-semibold text-green-ink hover:brightness-110 disabled:opacity-60">
          {mutation.isPending ? t('common.sending') : t('w.withdraw_amount', { amount: formatFcfa(Number(amount) || 0) })}
        </button>
      </div>
    </form>
  )
}

const TOPUP_AMOUNTS = [1000, 2000, 5000, 10000]

// Recharger le portefeuille : PayTech propose ensuite Wave, Orange Money, Free Money ou la carte bancaire
function TopupForm({ onDone }: { onDone: () => void }) {
  const { t } = useI18n()
  const [amount, setAmount] = useState('2000')
  const queryClient = useQueryClient()
  const toast = useToast()
  const mutation = useMutation({
    mutationFn: () => startTopup(Number(amount)),
    onSuccess: (result) => {
      if (result.redirectUrl) {
        window.location.assign(result.redirectUrl) // page de paiement PayTech
        return
      }
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
      toast(t('w.topup_done', { amount: formatFcfa(Number(amount)) }), 'coin')
      onDone()
    },
  })

  return (
    <form
      className="mt-4 rounded-[14px] border border-line bg-surface p-5"
      onSubmit={(e) => {
        e.preventDefault()
        mutation.mutate()
      }}
    >
      <h2 className="text-base">{t('w.topup_title')}</h2>
      <p className="mt-1 text-[13px] text-muted">{t('w.topup_text')}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {TOPUP_AMOUNTS.map((a) => (
          <button
            key={a}
            type="button"
            aria-pressed={Number(amount) === a}
            onClick={() => setAmount(String(a))}
            className={`rounded-[10px] border px-3.5 py-2 text-[13.5px] font-semibold ${Number(amount) === a ? 'border-green bg-green-soft text-green' : 'border-line bg-surface'}`}
          >
            {formatFcfa(a)}
          </button>
        ))}
        <input
          id="topup-amount"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
          aria-label={t('w.topup_custom')}
          className="w-32 rounded-[10px] border border-line bg-surface px-3 py-2 text-[13.5px] outline-none focus:border-green"
        />
      </div>
      {mutation.isError && <p className="mt-3 rounded-lg bg-red/10 px-3 py-2 text-[13px] text-red">{errorMessage(mutation.error)}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button disabled={mutation.isPending || !Number(amount)} className="rounded-[10px] bg-green px-4 py-2.5 text-sm font-semibold text-green-ink hover:brightness-110 disabled:opacity-60">
          {mutation.isPending ? t('w.topup_pending') : t('w.topup_pay', { amount: formatFcfa(Number(amount) || 0) })}
        </button>
        <span className="text-xs text-muted">{t('w.topup_secure')}</span>
      </div>
    </form>
  )
}
