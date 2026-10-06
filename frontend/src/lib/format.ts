import type { CountryCode, PaymentMethod } from '../types'

// Espaces insécables remplacées par des espaces simples pour un rendu identique partout
const clean = (s: string) => s.replace(/[  ]/g, ' ')

// Une valeur manquante s'affiche 0 au lieu de faire planter la page
export const formatNumber = (n: number | null | undefined) => clean((n ?? 0).toLocaleString('fr-FR'))

export const formatFcfa = (n: number) => `${formatNumber(n)} FCFA`

export const COUNTRY_NAMES: Record<CountryCode, string> = {
  SN: 'Sénégal',
  CI: "Côte d'Ivoire",
  CM: 'Cameroun',
  MA: 'Maroc',
  BF: 'Burkina Faso',
  ML: 'Mali',
}

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  wave: 'Wave',
  orange_money: 'Orange Money',
  free_money: 'Free Money',
  mtn_momo: 'MTN MoMo',
  moov_money: 'Moov Money',
  card: 'Carte bancaire',
  bank_transfer: 'Virement bancaire',
}

const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' })
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31536000],
  ['month', 2592000],
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
]

export function timeAgo(iso: string) {
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit)
  }
  return "à l'instant"
}
