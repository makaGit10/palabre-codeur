import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n, type Key } from '../i18n'
import { Icon, type IconName } from './Icon'

// Le guide de Palabre : chaque fonction expliquée en quelques phrases, ouvert depuis l'encadré « Comment ça marche »
const SECTIONS: { icon: IconName; title: Key; text: Key }[] = [
  { icon: 'plus', title: 'guide.ask_title', text: 'guide.ask' },
  { icon: 'coin', title: 'guide.bounty_title', text: 'guide.bounty' },
  { icon: 'up', title: 'guide.answer_title', text: 'guide.answer' },
  { icon: 'check', title: 'guide.accept_title', text: 'guide.accept' },
  { icon: 'wallet', title: 'guide.wallet_title', text: 'guide.wallet' },
  { icon: 'code', title: 'guide.snippets_title', text: 'guide.snippets' },
  { icon: 'chat', title: 'guide.rooms_title', text: 'guide.rooms' },
  { icon: 'spark', title: 'guide.tips_title', text: 'guide.tips' },
]

export function GuideLink() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="mt-2.5 inline-flex items-center gap-1 text-[12.5px] font-semibold text-green hover:underline">
        {t('guide.open')}
        <Icon name="right" className="size-3.5" />
      </button>
      {open && <GuideDialog onClose={() => setOpen(false)} />}
    </>
  )
}

export function GuideDialog({ onClose }: { onClose: () => void }) {
  const { t } = useI18n()

  // Échap ferme le guide
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Rendu à la racine du document : rien de la page (menu, colonnes) ne peut passer par-dessus
  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/60 p-3 sm:p-6" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-title"
        className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 id="guide-title" className="text-xl">{t('guide.title')}</h2>
            <p className="mt-0.5 text-sm text-muted">{t('guide.intro')}</p>
          </div>
          <button onClick={onClose} aria-label={t('common.close')} className="grid size-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-sunk">
            <Icon name="close" />
          </button>
        </header>
        <ol className="grid gap-3 overflow-y-auto p-5 sm:grid-cols-2">
          {SECTIONS.map((s, i) => (
            <li key={s.title} className="rounded-xl border border-line bg-bg p-4">
              <h3 className="flex items-center gap-2 text-[15px]">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-green-soft text-green">
                  <Icon name={s.icon} className="size-4" />
                </span>
                <span className="text-muted">{i + 1}.</span>
                {t(s.title)}
              </h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink/85">{t(s.text)}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>,
    document.body,
  )
}
