import { useEffect, useState } from 'react'
import { Icon } from './Icon'

// Adresse de la vidéo de démonstration : lien YouTube (VITE_DEMO_VIDEO_URL) ou fichier servi par le front
const VIDEO_URL: string = import.meta.env.VITE_DEMO_VIDEO_URL || '/demo/palabre-demo.mp4'

// Identifiant d'une vidéo YouTube, pour l'afficher dans le lecteur intégré sans cookies
function youtubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/)
  return match ? match[1] : null
}

// Bouton « Voir la démo » : ouvre la vidéo de présentation dans une fenêtre, sans quitter la page
export function DemoButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group inline-flex items-center gap-2.5 rounded-full border border-line bg-surface py-1.5 pr-4 pl-1.5 text-sm font-semibold shadow-[0_10px_30px_-18px_rgb(0_0_0/.35)] transition hover:border-green"
      >
        <span className="grid size-8 place-items-center rounded-full bg-green text-green-ink transition group-hover:scale-105">
          <Icon name="play" className="size-4" />
        </span>
        Voir la démo
        <span className="font-medium text-muted">3 min</span>
      </button>
      {open && <DemoVideoDialog onClose={() => setOpen(false)} />}
    </>
  )
}

function DemoVideoDialog({ onClose }: { onClose: () => void }) {
  const [failed, setFailed] = useState(false)
  const youtube = youtubeId(VIDEO_URL)

  // Échap ferme la vidéo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/75 p-3 sm:p-6" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-label="Démonstration de Palabre"
        className="w-full max-w-4xl overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center gap-3 px-4 py-3">
          <h2 className="flex-1 text-base">Palabre en 3 minutes</h2>
          <button onClick={onClose} aria-label="Fermer" className="grid size-8 place-items-center rounded-lg text-muted hover:bg-sunk">
            <Icon name="close" />
          </button>
        </header>
        <div className="aspect-video bg-code-bg">
          {youtube ? (
            <iframe
              className="size-full"
              src={`https://www.youtube-nocookie.com/embed/${youtube}?autoplay=1&rel=0`}
              title="Démonstration de Palabre"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          ) : failed ? (
            <p className="grid size-full place-items-center px-6 text-center text-sm text-code-ink">La vidéo n'est pas disponible pour le moment.</p>
          ) : (
            <video className="size-full" src={VIDEO_URL} controls autoPlay playsInline onError={() => setFailed(true)}>
              <track kind="captions" />
            </video>
          )}
        </div>
      </div>
    </div>
  )
}
