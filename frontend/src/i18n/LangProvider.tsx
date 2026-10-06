import { useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { api } from '../lib/api'
import { detectLang, LANG_KEY, LangContext, setCurrentLang, type Lang } from './index'

// La langue est appliquée partout : fonctions de formatage, attribut lang de la page, en-tête envoyé à l'API
function apply(lang: Lang) {
  setCurrentLang(lang)
  api.defaults.headers.common['Accept-Language'] = lang
}

// Fournit la langue à toute l'application. Changer de langue ré-affiche l'interface (key) et
// recharge les données de l'API, dont certains textes dépendent de la langue (notifications, aperçus…).
export function LangProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [lang, setLangState] = useState<Lang>(() => {
    const detected = detectLang()
    apply(detected)
    return detected
  })

  const setLang = (next: Lang) => {
    if (next === lang) return
    apply(next)
    try {
      localStorage.setItem(LANG_KEY, next)
    } catch {
      // stockage indisponible : la langue vaut pour la session en cours
    }
    setLangState(next)
    queryClient.invalidateQueries()
  }

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      <div key={lang} className="contents">
        {children}
      </div>
    </LangContext.Provider>
  )
}
