import { useEffect, useRef } from 'react'
import { useI18n } from '../i18n'

// Fin de liste : charge la page suivante toute seule quand elle devient visible (défilement),
// avec un bouton de secours pour les connexions lentes ou si le chargement automatique échoue.
export function LoadMore({ hasMore, loading, onLoad }: { hasMore: boolean; loading: boolean; onLoad: () => void }) {
  const { t } = useI18n()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || !hasMore) return
    const observer = new IntersectionObserver((entries) => entries[0].isIntersecting && !loading && onLoad(), { rootMargin: '300px' })
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, loading, onLoad])

  if (!hasMore) return null
  return (
    <div ref={ref} className="mt-4 flex justify-center">
      <button type="button" onClick={onLoad} disabled={loading} className="rounded-[10px] border border-line bg-surface px-4 py-2 text-sm font-semibold text-muted hover:border-green hover:text-ink disabled:opacity-60">
        {loading ? t('common.loading') : t('common.load_more')}
      </button>
    </div>
  )
}
