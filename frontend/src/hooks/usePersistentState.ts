import { useEffect, useState } from 'react'

// État mémorisé dans le navigateur (préférences d'affichage uniquement)
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw === null ? initial : (JSON.parse(raw) as T)
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // stockage indisponible (navigation privée…) : on garde l'état en mémoire
    }
  }, [key, value])

  return [value, setValue] as const
}

export function useTheme() {
  const [theme, setTheme] = usePersistentState<'light' | 'dark' | null>('palabre-theme', null)

  useEffect(() => {
    if (theme) document.documentElement.setAttribute('data-theme', theme)
    else document.documentElement.removeAttribute('data-theme')
  }, [theme])

  const isDark = theme === 'dark' || (theme === null && window.matchMedia('(prefers-color-scheme: dark)').matches)
  const toggle = () => setTheme(isDark ? 'light' : 'dark')

  return { toggle, isDark }
}
