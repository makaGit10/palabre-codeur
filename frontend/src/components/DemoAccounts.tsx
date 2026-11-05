import { useMutation, useQuery } from '@tanstack/react-query'
import { useAfterAuth } from '../hooks/useAfterAuth'
import { useI18n } from '../i18n'
import { getDemoAccounts, login } from '../services/auth'
import type { Me } from '../types'
import { Avatar, Flag } from './Brand'
import { Icon } from './Icon'

// Comptes de démonstration (jury, visiteurs) : affichés seulement si l'API les publie (DEMO_ACCOUNTS_PUBLIC).
// Sur la page de connexion, la page fournit la connexion (onPick) ; ailleurs (accueil), le bloc se connecte lui-même.
export function DemoAccounts({ onPick, pendingEmail = null, layout = 'list' }: { onPick?: (account: Me, password: string) => void; pendingEmail?: string | null; layout?: 'list' | 'row' }) {
  const { t, country } = useI18n()
  const { data } = useQuery({ queryKey: ['demo-accounts'], queryFn: getDemoAccounts, staleTime: Infinity })
  const done = useAfterAuth()
  const self = useMutation({ mutationFn: (input: { email: string; password: string }) => login({ ...input, remember: true }), onSuccess: done })
  if (!data || data.accounts.length === 0) return null

  const pick = onPick ?? ((account: Me, password: string) => self.mutate({ email: account.email, password }))
  const pending = onPick ? pendingEmail : self.isPending ? self.variables.email : null

  return (
    <section aria-labelledby="demo-accounts" className={`rounded-2xl border border-dashed border-gold/50 bg-gold-soft/40 p-5 ${layout === 'list' ? 'mt-5' : ''}`}>
      <h2 id="demo-accounts" className="flex items-center gap-2 text-[15px]">
        <Icon name="spark" className="size-4 text-gold" />
        {t('auth.demo_title')}
      </h2>
      <p className="mt-1 text-[13px] text-muted">
        {t('auth.demo_text')} <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-[12.5px] text-ink">{data.password}</code>
      </p>
      <ul className={`mt-3 grid gap-2 ${layout === 'row' ? 'sm:grid-cols-2' : ''}`}>
        {data.accounts.map((account) => {
          const isPending = pending === account.email
          return (
            <li key={account.id}>
              <button
                type="button"
                disabled={pending !== null}
                onClick={() => pick(account, data.password)}
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
                <span className="text-xs font-semibold whitespace-nowrap text-green">{isPending ? t('auth.logging_in') : t('auth.demo_use')}</span>
              </button>
            </li>
          )
        })}
      </ul>
      {!onPick && self.isError && <p className="mt-2 text-[13px] text-red">{t('api.generic')}</p>}
    </section>
  )
}
