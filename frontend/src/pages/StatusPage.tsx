import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '../components/Brand'
import { CodeTree } from '../components/CodeTree'
import { Icon } from '../components/Icon'
import { useI18n, type Key } from '../i18n'
import { api } from '../lib/api'
import { setServiceStatus } from '../lib/status'

// Pages d'état : page introuvable, maintenance, erreur inattendue, connexion perdue.
// Même décor que la connexion (nuit sous le baobab), un message clair et une seule action principale.
type Kind = 'not_found' | 'maintenance' | 'error' | 'offline'

const CODES: Record<Kind, string> = { not_found: '404', maintenance: '503', error: '500', offline: '···' }

export default function StatusPage({ kind, onRetry }: { kind: Kind; onRetry?: () => void }) {
  const { t } = useI18n()
  const key = (suffix: string) => `status.${kind}_${suffix}` as Key

  return (
    <div
      className="relative grid min-h-dvh place-items-center overflow-hidden bg-[#0B1511] px-5 py-10 text-[#E7EEEA]"
      style={{
        backgroundImage:
          'radial-gradient(60% 50% at 85% 10%, rgb(242 169 0 / .2), transparent 70%), radial-gradient(55% 45% at 10% 95%, rgb(63 191 143 / .25), transparent 70%)',
      }}
    >
      <div className="absolute top-5 left-5 rounded-xl bg-white/95 px-3 py-1.5 [&_a]:text-[18px]">
        <Logo />
      </div>

      <div className="grid w-full max-w-5xl items-center gap-8 lg:grid-cols-[1fr_1fr]">
        <div className="order-2 text-center lg:order-1 lg:text-left">
          <p className="font-mono text-[15px] font-semibold tracking-[.3em] text-[#F2B731]">{CODES[kind]}</p>
          <h1 className="mt-3 text-[clamp(30px,4.4vw,52px)] font-extrabold tracking-tight text-white">{t(key('title'))}</h1>
          <p className="mx-auto mt-4 max-w-[46ch] text-[16.5px] text-[#E7EEEA]/75 lg:mx-0">{t(key('text'))}</p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            {onRetry ? (
              <button onClick={onRetry} className="inline-flex items-center gap-2 rounded-[12px] bg-[#3FBF8F] px-5 py-3 font-semibold text-[#06140E] hover:brightness-110">
                <Icon name="check" className="size-4" />
                {t('status.retry')}
              </button>
            ) : (
              <Link to="/app" className="inline-flex items-center gap-2 rounded-[12px] bg-[#3FBF8F] px-5 py-3 font-semibold text-[#06140E] hover:brightness-110">
                <Icon name="home" className="size-4" />
                {t('common.back_feed')}
              </Link>
            )}
            {kind === 'not_found' && (
              <Link to="/" className="rounded-[12px] border border-white/20 px-5 py-3 font-semibold text-white hover:bg-white/10">
                {t('status.home')}
              </Link>
            )}
          </div>
          {kind === 'maintenance' && <p className="mt-5 text-[13px] text-[#E7EEEA]/55">{t('status.auto_retry')}</p>}
        </div>
        <div className="order-1 mx-auto w-full max-w-[420px] text-ink lg:order-2">
          <CodeTree />
        </div>
      </div>
    </div>
  )
}

// Maintenance : la page vérifie toute seule toutes les 20 secondes si le service est revenu
export function MaintenancePage() {
  const [checking, setChecking] = useState(false)
  const check = async () => {
    setChecking(true)
    try {
      await api.get('/stats')
      setServiceStatus('ok')
    } catch {
      // toujours en maintenance
    } finally {
      setChecking(false)
    }
  }
  useEffect(() => {
    const timer = setInterval(check, 20_000)
    return () => clearInterval(timer)
  }, [])
  return <StatusPage kind="maintenance" onRetry={checking ? undefined : check} />
}
