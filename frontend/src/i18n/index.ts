import { createContext, useContext } from 'react'
import type { CountryCode, PaymentMethod } from '../types'
import { en } from './en'
import { fr } from './fr'

// Interface en français ou en anglais. La langue choisie est mémorisée dans le navigateur
// et envoyée à l'API (Accept-Language) pour que ses messages arrivent dans la même langue.
export type Lang = 'fr' | 'en'
export type Key = keyof typeof fr
type Vars = Record<string, string | number>
// Clés au singulier / pluriel : « q.answers » pour « q.answers.one » et « q.answers.other »
type BaseOf<K> = K extends `${infer Base}.one` ? Base : never
export type PluralKey = BaseOf<Key>

export const LANG_KEY = 'palabre-lang'
const DICTS: Record<Lang, Record<Key, string>> = { fr, en }

// Langue courante, lue par les fonctions de formatage hors des composants (dates, nombres, erreurs)
let current: Lang = 'fr'
export const currentLang = () => current
export function setCurrentLang(lang: Lang) {
  current = lang
  document.documentElement.lang = lang
}

export function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_KEY)
    if (saved === 'fr' || saved === 'en') return saved
  } catch {
    // stockage indisponible : langue du navigateur
  }
  return navigator.language.toLowerCase().startsWith('en') ? 'en' : 'fr'
}

export const hasKey = (key: string): key is Key => key in fr

export function translate(key: Key, vars?: Vars, lang: Lang = current): string {
  let text: string = DICTS[lang][key] ?? fr[key]
  if (vars) for (const [name, value] of Object.entries(vars)) text = text.replaceAll(`{${name}}`, String(value))
  return text
}

// Singulier en français pour 0 et 1 ; en anglais pour 1 seulement
export function translatePlural(key: PluralKey, n: number, vars?: Vars, lang: Lang = current): string {
  const one = lang === 'fr' ? n <= 1 : n === 1
  return translate(`${key}.${one ? 'one' : 'other'}` as Key, { n, ...vars }, lang)
}

export const LangContext = createContext<{ lang: Lang; setLang: (lang: Lang) => void }>({ lang: 'fr', setLang: () => {} })

// t : un texte ; tn : singulier ou pluriel ; country / payment : libellés traduits
export function useI18n() {
  const { lang, setLang } = useContext(LangContext)
  return {
    lang,
    setLang,
    t: (key: Key, vars?: Vars) => translate(key, vars, lang),
    tn: (key: PluralKey, n: number, vars?: Vars) => translatePlural(key, n, vars, lang),
    country: (code: CountryCode) => translate(`country.${code}`, undefined, lang),
    payment: (method: PaymentMethod) => translate(`payment.${method}`, undefined, lang),
  }
}
