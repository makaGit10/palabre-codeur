// Inscription, connexion et compte de la personne connectée
import { isAxiosError } from 'axios'
import { api, fetchCsrfCookie } from '../lib/api'
import type { CountryCode, Me } from '../types'

// Renvoie null si personne n'est connecté (réponse 401)
export async function getMe(): Promise<Me | null> {
  try {
    const { data } = await api.get<{ data: Me }>('/me')
    return data.data
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 401) return null
    throw error
  }
}

export async function login(input: { email: string; password: string; remember: boolean }): Promise<Me> {
  await fetchCsrfCookie()
  const { data } = await api.post<{ data: Me }>('/login', input)
  return data.data
}

export interface RegisterInput {
  name: string
  email: string
  password: string
  country: CountryCode
  city: string
}

export async function register(input: RegisterInput): Promise<Me> {
  await fetchCsrfCookie()
  const { data } = await api.post<{ data: Me }>('/register', input)
  return data.data
}

export async function logout() {
  await api.post('/logout')
}

// Comptes de démonstration proposés sur la page de connexion (jury, visiteurs).
// null si l'API ne les publie pas (DEMO_ACCOUNTS_PUBLIC absent ou false : réponse 404)
export interface DemoAccounts {
  accounts: Me[]
  password: string
}

export async function getDemoAccounts(): Promise<DemoAccounts | null> {
  try {
    const { data } = await api.get<{ data: Me[]; password: string }>('/demo-accounts')
    return { accounts: data.data, password: data.password }
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return null
    throw error
  }
}

// Vérification de l'adresse e-mail par code à 6 chiffres
export async function verifyEmail(code: string): Promise<Me> {
  const { data } = await api.post<{ data: Me }>('/email/verification/verify', { code })
  return data.data
}

export async function resendVerificationCode() {
  await api.post('/email/verification/send')
}

// Mot de passe oublié : code par e-mail, puis nouveau mot de passe (connecte la personne)
export async function forgotPassword(email: string) {
  await fetchCsrfCookie()
  await api.post('/password/forgot', { email })
}

export async function resetPassword(input: { email: string; code: string; password: string }): Promise<Me> {
  await fetchCsrfCookie()
  const { data } = await api.post<{ data: Me }>('/password/reset', input)
  return data.data
}

// Modifier son profil public (nom, ville)
export async function updateProfile(input: { name: string; city: string }): Promise<Me> {
  const { data } = await api.patch<{ data: Me }>('/me', input)
  return data.data
}
