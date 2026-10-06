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
}

export async function listSnippets(): Promise<Snippet[]> {
  const { data } = await api.get<{ data: Snippet[] }>('/snippets')
  return data.data
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
}

export async function getStats(): Promise<CommunityStats> {
  const { data } = await api.get<CommunityStats>('/stats')
  return data
}
