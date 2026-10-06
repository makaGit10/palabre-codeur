import { currentLang, translate } from '../i18n'

// Espaces insécables remplacées par des espaces simples pour un rendu identique partout
const clean = (s: string) => s.replace(/[  ]/g, ' ')

const locale = () => (currentLang() === 'fr' ? 'fr-FR' : 'en-GB')

// Une valeur manquante s'affiche 0 au lieu de faire planter la page
export const formatNumber = (n: number | null | undefined) => clean((n ?? 0).toLocaleString(locale()))

export const formatFcfa = (n: number) => `${formatNumber(n)} FCFA`

// Mois en cours, en toutes lettres dans la langue de l'interface
export const currentMonth = () => new Intl.DateTimeFormat(locale(), { month: 'long', year: 'numeric' }).format(new Date())

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31536000],
  ['month', 2592000],
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
]

export function timeAgo(iso: string) {
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000
  const rtf = new Intl.RelativeTimeFormat(currentLang(), { numeric: 'auto' })
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit)
  }
  return translate('common.just_now')
}
