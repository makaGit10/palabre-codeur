import { Link } from 'react-router-dom'
import { useI18n, type Key } from '../i18n'

// Page temporaire pour les écrans pas encore développés
export default function ComingSoon({ title }: { title: Key }) {
  const { t } = useI18n()
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-2xl">{t(title)}</h1>
      <p className="mt-2 text-muted">{t('common.coming_soon')}</p>
      <Link to="/app" className="mt-6 inline-block font-semibold text-green">
        {t('common.back_feed')}
      </Link>
    </div>
  )
}
