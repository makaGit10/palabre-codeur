import { Link, Outlet } from 'react-router-dom'
import { Avatar, Logo } from '../components/Brand'
import { useAuth } from '../hooks/useAuth'

export default function PublicLayout() {
  const { user } = useAuth()

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line bg-surface">
        <div className="flex items-center gap-4 px-4 py-2.5 md:px-10 xl:px-16">
          <Logo />
          <div className="ml-auto flex items-center gap-2.5">
            {user ? (
              <Link to="/app" className="inline-flex items-center gap-2 rounded-[10px] bg-green py-1.5 pr-4 pl-1.5 text-sm font-semibold text-green-ink hover:brightness-110">
                <Avatar user={user} size="sm" />
                Ouvrir Palabre
              </Link>
            ) : (
              <>
                <Link to="/connexion" className="rounded-[10px] px-3 py-2 text-sm font-semibold whitespace-nowrap hover:bg-sunk sm:px-3.5">
                  Se connecter
                </Link>
                <Link to="/inscription" className="rounded-[10px] bg-green px-4 py-2 text-sm font-semibold text-green-ink hover:brightness-110">
                  Rejoindre
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
