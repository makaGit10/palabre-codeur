import { useEffect, useState } from 'react'
import { useI18n, type Key } from '../i18n'
import { Icon } from './Icon'

// Deux versions de la vidéo de présentation : l'essentiel (2 min, format du concours) et la visite complète.
// Chacune est un lien YouTube (VITE_DEMO_SHORT_URL, VITE_DEMO_VIDEO_URL) ou un fichier servi par le front.
type Version = 'short' | 'full'
const VIDEOS: Record<Version, { url: string; label: Key; duration: Key }> = {
  short: { url: import.meta.env.VITE_DEMO_SHORT_URL || '/demo/palabre-demo-court.mp4', label: 'demo.short', duration: 'demo.short_duration' },
  full: { url: import.meta.env.VITE_DEMO_VIDEO_URL || '/demo/palabre-demo.mp4', label: 'demo.full', duration: 'demo.duration' },
}

// Identifiant d'une vidéo YouTube, pour l'afficher dans le lecteur intégré sans cookies
function youtubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/)
  return match ? match[1] : null
}

// Bouton « Voir la démo » : ouvre la vidéo de présentation dans une fenêtre, sans quitter la page
export function DemoButton() {
  const [open, setOpen] = useState(false)
  const { t } = useI18n()
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group inline-flex items-center gap-2.5 rounded-full border border-line bg-surface py-1.5 pr-4 pl-1.5 text-sm font-semibold shadow-[0_10px_30px_-18px_rgb(0_0_0/.35)] transition hover:border-green"
      >
        <span className="relative grid size-8 place-items-center rounded-full bg-green text-green-ink transition group-hover:scale-105">
          {/* Halo qui pulse autour du bouton de lecture, pour attirer l'œil (désactivé si l'utilisateur limite les animations) */}
          <span aria-hidden="true" className="absolute inset-0 animate-ping rounded-full bg-green opacity-50 motion-reduce:hidden" />
          <Icon name="play" className="relative size-4" />
        </span>
        {t('demo.watch')}
        <span className="font-medium text-muted">{t('demo.duration')}</span>
      </button>
      {open && <DemoVideoDialog onClose={() => setOpen(false)} />}
    </>
  )
}

function DemoVideoDialog({ onClose }: { onClose: () => void }) {
  const [version, setVersion] = useState<Version>('full')
  const [failed, setFailed] = useState(false)
  const { t } = useI18n()
  const { url } = VIDEOS[version]
  const youtube = youtubeId(url)

  // Échap ferme la vidéo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const choose = (next: Version) => {
    setVersion(next)
    setFailed(false)
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/75 p-3 sm:p-6" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-label={t('demo.dialog')}
        className="w-full max-w-4xl overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex flex-wrap items-center gap-3 px-4 py-3">
          <h2 className="text-base">{t('demo.title')}</h2>
          {/* Deux versions : l'essentiel en 2 minutes, ou la visite complète */}
          <div role="tablist" aria-label={t('demo.versions')} className="flex rounded-full bg-sunk p-1 text-[13px] font-semibold sm:ml-auto">
            {(['short', 'full'] as const).map((v) => (
              <button
                key={v}
                role="tab"
                type="button"
                aria-selected={version === v}
                onClick={() => choose(v)}
                className={`rounded-full px-3 py-1 transition ${version === v ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'}`}
              >
                {t(VIDEOS[v].label)} <span className="font-medium text-muted">· {t(VIDEOS[v].duration)}</span>
              </button>
            ))}
          </div>
          <button onClick={onClose} aria-label={t('common.close')} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-sunk">
            <Icon name="close" />
          </button>
        </header>
        <div className="aspect-video bg-code-bg">
          {youtube ? (
            <iframe
              key={url}
              className="size-full"
              src={`https://www.youtube-nocookie.com/embed/${youtube}?autoplay=1&rel=0`}
              title={t('demo.dialog')}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          ) : failed ? (
            <p className="grid size-full place-items-center px-6 text-center text-sm text-code-ink">{t('demo.unavailable')}</p>
          ) : (
            <video key={url} className="size-full" src={url} controls autoPlay playsInline onError={() => setFailed(true)}>
              <track kind="captions" />
            </video>
          )}
        </div>
      </div>
    </div>
  )
}
