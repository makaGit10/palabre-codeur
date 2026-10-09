// Portefeuille : solde en crédits (1 crédit = 1 FCFA), historique et retraits.
// Le serveur vérifie le solde, le pays et le moyen de retrait ; les paiements sont en mode test pendant le concours.
import { api } from '../lib/api'
import type { PaymentMethod, Wallet } from '../types'

export async function getWallet(): Promise<Wallet> {
  const { data } = await api.get<Wallet>('/wallet')
  return data
}

export interface WithdrawalInput {
  amount: number
  method: PaymentMethod
  account: string // numéro de téléphone, RIB, ou vide pour la carte enregistrée
}

export async function withdraw(input: WithdrawalInput) {
  await api.post('/wallet/withdrawals', { ...input, account: input.account || null })
}

// Recharger son portefeuille avec PayTech : renvoie l'adresse de la page de paiement,
// ou « paid » directement quand Palabre est en mode test (pas de clés PayTech)
export interface TopupResult {
  status: 'pending' | 'paid'
  redirectUrl: string | null
  reference: string
  testMode: boolean
}

export async function startTopup(amount: number): Promise<TopupResult> {
  const { data } = await api.post<TopupResult>('/wallet/topups', { amount })
  return data
}
