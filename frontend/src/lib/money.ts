// Monnaies et moyens de paiement par pays.
// Les primes sont exprimées en FCFA (valeur de référence : 1 crédit Palabre = 1 FCFA),
// puis affichées dans la monnaie de chaque personne et retirées avec un moyen disponible chez elle.
import type { CountryCode, PaymentMethod } from '../types'
import { formatNumber } from './format'

export type CurrencyCode = 'XOF' | 'XAF' | 'MAD' | 'GNF' | 'MRU' | 'CDF' | 'DZD' | 'TND' | 'MGA' | 'KMF' | 'DJF' | 'RWF' | 'BIF' | 'MUR' | 'SCR'

// Les 26 pays d'Afrique francophone, dans l'ordre d'affichage : Afrique de l'Ouest, Afrique centrale, Maghreb, océan Indien et Afrique de l'Est
export const COUNTRIES: CountryCode[] = [
  'SN', 'CI', 'ML', 'BF', 'NE', 'BJ', 'TG', 'GN', 'MR',
  'CM', 'GA', 'CG', 'CD', 'TD', 'CF', 'GQ',
  'MA', 'DZ', 'TN',
  'MG', 'KM', 'DJ', 'RW', 'BI', 'MU', 'SC',
]

export const COUNTRY_CURRENCY: Record<CountryCode, CurrencyCode> = {
  SN: 'XOF',
  CI: 'XOF',
  ML: 'XOF',
  BF: 'XOF',
  CM: 'XAF',
  MA: 'MAD',
  NE: 'XOF',
  BJ: 'XOF',
  TG: 'XOF',
  GN: 'GNF',
  MR: 'MRU',
  GA: 'XAF',
  CG: 'XAF',
  CD: 'CDF',
  TD: 'XAF',
  CF: 'XAF',
  GQ: 'XAF',
  DZ: 'DZD',
  TN: 'TND',
  MG: 'MGA',
  KM: 'KMF',
  DJ: 'DJF',
  RW: 'RWF',
  BI: 'BIF',
  MU: 'MUR',
  SC: 'SCR',
}

// Taux indicatifs : nombre d'unités de chaque monnaie pour 1 FCFA.
// XOF, XAF et KMF ont une parité fixe avec l'euro ; les autres taux sont indicatifs et viendront d'une API de change en production.
const UNITS_PER_FCFA: Record<CurrencyCode, number> = {
  XOF: 1,
  XAF: 1,
  MAD: 10.8 / 655.957,
  GNF: 10000 / 655.957,
  MRU: 44 / 655.957,
  CDF: 3200 / 655.957,
  DZD: 146 / 655.957,
  TND: 3.4 / 655.957,
  MGA: 5100 / 655.957,
  KMF: 491.968 / 655.957,
  DJF: 193 / 655.957,
  RWF: 1560 / 655.957,
  BIF: 3250 / 655.957,
  MUR: 50 / 655.957,
  SCR: 15.6 / 655.957,
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
  NE: ['airtel_money', 'moov_money', 'card'],
  BJ: ['mtn_momo', 'moov_money', 'card'],
  TG: ['flooz', 'tmoney', 'card'],
  GN: ['orange_money', 'mtn_momo', 'card'],
  MR: ['card', 'bank_transfer'],
  GA: ['airtel_money', 'moov_money', 'card'],
  CG: ['mtn_momo', 'airtel_money', 'card'],
  CD: ['mpesa', 'orange_money', 'airtel_money', 'card'],
  TD: ['airtel_money', 'moov_money', 'card'],
  CF: ['orange_money', 'card', 'bank_transfer'],
  GQ: ['card', 'bank_transfer'],
  DZ: ['card', 'bank_transfer'],
  TN: ['card', 'bank_transfer'],
  MG: ['mvola', 'orange_money', 'airtel_money', 'card'],
  KM: ['card', 'bank_transfer'],
  DJ: ['card', 'bank_transfer'],
  RW: ['mtn_momo', 'airtel_money', 'card'],
  BI: ['card', 'bank_transfer'],
  MU: ['card', 'bank_transfer'],
  SC: ['card', 'bank_transfer'],
}

export const MOBILE_MONEY: PaymentMethod[] = ['wave', 'orange_money', 'free_money', 'mtn_momo', 'moov_money', 'airtel_money', 'mpesa', 'flooz', 'tmoney', 'mvola']

export const PHONE_PREFIX: Record<CountryCode, string> = {
  SN: '+221',
  CI: '+225',
  ML: '+223',
  BF: '+226',
  CM: '+237',
  MA: '+212',
  NE: '+227',
  BJ: '+229',
  TG: '+228',
  GN: '+224',
  MR: '+222',
  GA: '+241',
  CG: '+242',
  CD: '+243',
  TD: '+235',
  CF: '+236',
  GQ: '+240',
  DZ: '+213',
  TN: '+216',
  MG: '+261',
  KM: '+269',
  DJ: '+253',
  RW: '+250',
  BI: '+257',
  MU: '+230',
  SC: '+248',
}

export const MIN_WITHDRAWAL = 1000
