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
