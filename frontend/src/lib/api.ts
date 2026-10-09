import axios, { isAxiosError } from 'axios'
import { translate } from '../i18n'
import { setServiceStatus } from './status'

// Client HTTP unique vers l'API Laravel. La session repose sur un cookie sécurisé (Sanctum SPA) :
// axios renvoie automatiquement le jeton anti-CSRF lu dans le cookie XSRF-TOKEN.
export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  withXSRFToken: true,
  headers: { Accept: 'application/json' },
})

// Maintenance (503 « maintenance ») : toute l'application laisse place à une page dédiée
api.interceptors.response.use(undefined, (error) => {
  if (isAxiosError(error) && error.response?.status === 503 && (error.response.data as { code?: string } | undefined)?.code === 'maintenance') {
    setServiceStatus('maintenance')
  }
  return Promise.reject(error)
})

// À appeler avant une connexion ou une inscription : dépose le cookie anti-CSRF
export const fetchCsrfCookie = () => axios.get('/sanctum/csrf-cookie', { withCredentials: true })

// Message d'erreur lisible, dans la langue de l'interface, quel que soit le type d'erreur renvoyé par l'API
export function errorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (!error.response) return translate('api.network')
    if (error.response.status === 429) return translate('api.too_many')
    if ((error.response.data as { code?: string } | undefined)?.code === 'email_unverified') return translate('verify.required')
    const data = error.response.data as { message?: string; errors?: Record<string, string[]> } | undefined
    const firstFieldError = data?.errors && Object.values(data.errors)[0]?.[0]
    return firstFieldError ?? data?.message ?? translate('api.generic')
  }
  return error instanceof Error ? error.message : translate('api.generic')
}

// Erreurs de validation champ par champ (ex. { title: "Le champ titre doit…" })
export function fieldErrors(error: unknown): Record<string, string> {
  if (!isAxiosError(error) || error.response?.status !== 422) return {}
  const errors = (error.response.data as { errors?: Record<string, string[]> }).errors ?? {}
  return Object.fromEntries(Object.entries(errors).map(([field, messages]) => [field, messages[0]]))
}
