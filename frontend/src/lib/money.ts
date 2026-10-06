// Monnaies et moyens de paiement par pays.
// Les primes sont exprimées en FCFA (valeur de référence : 1 crédit Palabre = 1 FCFA),
// puis affichées dans la monnaie de chaque personne et retirées avec un moyen disponible chez elle.
import type { CountryCode, PaymentMethod } from '../types'
import { formatNumber } from './format'

export type CurrencyCode = 'XOF' | 'XAF' | 'MAD'

export const COUNTRY_CURRENCY: Record<CountryCode, CurrencyCode> = {
  SN: 'XOF',
  CI: 'XOF',
  ML: 'XOF',
  BF: 'XOF',
  CM: 'XAF',
  MA: 'MAD',
}

// Taux indicatifs : nombre d'unités de chaque monnaie pour 1 FCFA.
// XOF et XAF valent 1/655,957 € (parité fixe). En production, le taux du MAD viendra d'une API de change.
const UNITS_PER_FCFA: Record<CurrencyCode, number> = {
  XOF: 1,
  XAF: 1,
  MAD: 10.8 / 655.957,
}

export const isFcfa = (c: CurrencyCode) => c === 'XOF' || c === 'XAF'

// « ≈ 33 MAD » pour un Marocain ; rien pour les pays du FCFA
export function localHint(amountFcfa: number, country: CountryCode): string | null {
  const currency = COUNTRY_CURRENCY[country]
  if (isFcfa(currency)) return null
  return `≈ ${formatNumber(Math.round(amountFcfa * UNITS_PER_FCFA[currency]))} ${currency}`
}

// Moyens disponibles par pays, pour payer une prime ou retirer ses gains.
// Liste à confirmer avec l'agrégateur de paiement retenu (PayTech, CinetPay…).
export const METHODS_BY_COUNTRY: Record<CountryCode, PaymentMethod[]> = {
  SN: ['wave', 'orange_money', 'free_money', 'card'],
  CI: ['wave', 'orange_money', 'mtn_momo', 'moov_money', 'card'],
  ML: ['wave', 'orange_money', 'moov_money', 'card'],
  BF: ['wave', 'orange_money', 'moov_money', 'card'],
  CM: ['mtn_momo', 'orange_money', 'card'],
  MA: ['card', 'bank_transfer'],
}

export const MOBILE_MONEY: PaymentMethod[] = ['wave', 'orange_money', 'free_money', 'mtn_momo', 'moov_money']

export const PHONE_PREFIX: Record<CountryCode, string> = {
  SN: '+221',
  CI: '+225',
  ML: '+223',
  BF: '+226',
  CM: '+237',
  MA: '+212',
}

export const MIN_WITHDRAWAL = 1000
