import axios, { isAxiosError } from 'axios'

// Client HTTP unique vers l'API Laravel. La session repose sur un cookie sécurisé (Sanctum SPA) :
// axios renvoie automatiquement le jeton anti-CSRF lu dans le cookie XSRF-TOKEN.
export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  withXSRFToken: true,
  headers: { Accept: 'application/json' },
})

// À appeler avant une connexion ou une inscription : dépose le cookie anti-CSRF
export const fetchCsrfCookie = () => axios.get('/sanctum/csrf-cookie', { withCredentials: true })

// Message d'erreur lisible, quel que soit le type d'erreur renvoyé par l'API
export function errorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (!error.response) return 'Connexion au serveur impossible. Vérifiez votre réseau et réessayez.'
    if (error.response.status === 429) return 'Trop de tentatives. Patientez une minute avant de réessayer.'
    const data = error.response.data as { message?: string; errors?: Record<string, string[]> } | undefined
    const firstFieldError = data?.errors && Object.values(data.errors)[0]?.[0]
    return firstFieldError ?? data?.message ?? 'Une erreur est survenue. Réessayez.'
  }
  return error instanceof Error ? error.message : 'Une erreur est survenue. Réessayez.'
}

// Erreurs de validation champ par champ (ex. { title: "Le champ titre doit…" })
export function fieldErrors(error: unknown): Record<string, string> {
  if (!isAxiosError(error) || error.response?.status !== 422) return {}
  const errors = (error.response.data as { errors?: Record<string, string[]> }).errors ?? {}
  return Object.fromEntries(Object.entries(errors).map(([field, messages]) => [field, messages[0]]))
}
