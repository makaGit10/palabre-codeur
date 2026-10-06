import { Link, Outlet } from 'react-router-dom'
import { Avatar, Logo } from '../components/Brand'
import { Icon } from '../components/Icon'
import { useAuth } from '../hooks/useAuth'
import { useI18n } from '../i18n'

export default function PublicLayout() {
  const { user } = useAuth()
  const { t, lang, setLang } = useI18n()

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line bg-surface">
        <div className="flex items-center gap-4 px-4 py-2.5 md:px-10 xl:px-16">
          <Logo compact />
          <div className="ml-auto flex items-center gap-2.5">
            {/* Langue : un clic passe à l'autre */}
            <button
              onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
              title={t('nav.language')}
              aria-label={t('nav.language')}
              className="inline-flex items-center gap-1 rounded-[10px] px-2 py-2 text-xs font-bold text-muted hover:bg-sunk hover:text-ink"
            >
              <Icon name="globe" className="size-[18px]" />
              {lang === 'fr' ? 'EN' : 'FR'}
            </button>
            {user ? (
              <Link to="/app" className="inline-flex items-center gap-2 rounded-[10px] bg-green py-1.5 pr-4 pl-1.5 text-sm font-semibold text-green-ink hover:brightness-110">
                <Avatar user={user} size="sm" />
                {t('nav.open_app')}
              </Link>
            ) : (
              <>
                <Link to="/connexion" className="rounded-[10px] px-3 py-2 text-sm font-semibold whitespace-nowrap hover:bg-sunk sm:px-3.5">
                  {t('common.login')}
                </Link>
                <Link to="/inscription" className="rounded-[10px] bg-green px-4 py-2 text-sm font-semibold text-green-ink hover:brightness-110">
                  {t('common.join')}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <Outlet />
    </>
  )
}
