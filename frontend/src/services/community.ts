// Snippets, classement, profils et chiffres de la communauté : appels à l'API Laravel.
import { api } from '../lib/api'
import type { CountryCode, Question, User } from '../types'

export interface Snippet {
  id: number
  title: string
  description: string
  language: string
  fence: string
  tags: string[]
  author: User
  testedBy: number
  testedByMe: boolean
  votes: number
  code: string
  passport: SnippetPassport
}

// Passeport de fiabilité : ce qu'il faut savoir avant de copier le code
export interface SnippetPassport {
  apiVersion: string | null
  requirements: string | null
  environment: string | null
  license: string
  limitations: string | null
  lastVerifiedAt: string | null // dernière confirmation « Je l'ai testé » d'un membre
  automatedTest: boolean // toujours false : aucun test automatisé n'est exécuté sur les extraits
}

// Extraits paginés, filtrés côté serveur par API et par recherche
export async function listSnippets(filters: { api?: string; q?: string; page?: number } = {}): Promise<{ data: Snippet[]; page: number; lastPage: number }> {
  const { data } = await api.get<{ data: Snippet[]; meta: { current_page: number; last_page: number } }>('/snippets', { params: filters })
  return { data: data.data, page: data.meta.current_page, lastPage: data.meta.last_page }
}

// « Je l'ai testé » : ajoute ou retire la confirmation de la personne connectée
export async function toggleTested(id: number) {
  await api.post(`/snippets/${id}/tested`)
}

export interface NewSnippet {
  title: string
  description: string
  language: string
  fence: string
  tags: string[]
  code: string
  api_version?: string
  requirements?: string
  environment?: string
  license?: string
  limitations?: string
}

export async function createSnippet(input: NewSnippet): Promise<{ id: number }> {
  const { data } = await api.post<{ data: Snippet }>('/snippets', input)
  return { id: data.data.id }
}

export interface CountryScore {
  code: CountryCode
  name: string
  points: number
}

export async function getLeaderboard(): Promise<{ countries: CountryScore[]; developers: User[] }> {
  const { data } = await api.get('/leaderboard')
  return data
}

export interface Profile {
  user: User
  badges: { slug: string; icon: string; label: string }[]
  questionsCount: number
  answersCount: number
  activity: Question[]
}

export async function getProfile(id: number): Promise<Profile> {
  const { data } = await api.get<Profile>(`/users/${id}`)
  return data
}

export interface CommunityStats {
  developers: number
  solvedQuestions: number
  countries: number
  bountiesPaid: number
  openBounties: number
  openBountiesTotal: number
}

export async function getStats(): Promise<CommunityStats> {
  const { data } = await api.get<CommunityStats>('/stats')
  return data
}
