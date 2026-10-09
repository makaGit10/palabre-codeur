import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useI18n } from '../i18n'
import { Icon } from './Icon'

// Rappel discret en haut de l'application tant que l'adresse e-mail n'est pas vérifiée
export function VerifyBanner() {
  const { user } = useAuth()
  const { t } = useI18n()
  if (!user || user.emailVerified !== false) return null

  return (
    <div className="mb-5 flex flex-wrap items-center gap-3 rounded-[14px] border border-gold/40 bg-gold-soft px-4 py-3 text-[13.5px]">
      <Icon name="mail" className="size-5 text-gold" />
      <span className="min-w-0 flex-1">{t('verify.banner')}</span>
      <Link to="/verification" className="rounded-[10px] bg-green px-3.5 py-1.5 font-semibold text-green-ink hover:brightness-110">
        {t('verify.banner_cta')}
      </Link>
    </div>
  )
}
