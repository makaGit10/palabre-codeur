// Questions, réponses, votes et primes : appels à l'API Laravel.
import { api } from '../lib/api'
import type { Answer, Bounty, NewQuestion, Question, QuestionDetail, User, VoteValue } from '../types'

// Liste paginée : le serveur filtre, trie et renvoie 20 questions par page (50 au plus)
export interface QuestionFilters {
  tab?: 'sans' | 'primes' | 'payees'
  tag?: string
  tags?: string[]
  exclude?: number
  q?: string
  sort?: 'bounty'
  perPage?: number
  page?: number
}

export interface Page<T> {
  data: T[]
  page: number
  lastPage: number
  total: number
}

export async function listQuestions(filters: QuestionFilters = {}): Promise<Page<Question>> {
  const { tags, perPage, ...rest } = filters
  const { data } = await api.get<{ data: Question[]; meta: { current_page: number; last_page: number; total: number } }>('/questions', {
    params: { ...rest, tags: tags?.join(','), per_page: perPage },
  })
  return { data: data.data, page: data.meta.current_page, lastPage: data.meta.last_page, total: data.meta.total }
}

export async function getQuestion(id: number): Promise<QuestionDetail> {
  const { data } = await api.get<{ data: QuestionDetail }>(`/questions/${id}`)
  return data.data
}

// Détection de doublons (recherche par trigrammes de PostgreSQL côté serveur)
export async function findSimilar(title: string): Promise<Question[]> {
  const { data } = await api.get<{ data: Question[] }>('/questions/similar', { params: { title } })
  return data.data
}

export async function createQuestion(input: NewQuestion): Promise<{ id: number }> {
  const { data } = await api.post<{ data: QuestionDetail }>('/questions', input)
  return { id: data.data.id }
}

export async function addAnswer(questionId: number, body: string) {
  await api.post(`/questions/${questionId}/answers`, { body })
}

// Un vote répété sur la même flèche l'annule (value = 0)
export async function vote(questionId: number, target: { type: 'question' } | { type: 'answer'; id: number }, value: VoteValue) {
  const url = target.type === 'question' ? `/questions/${questionId}/vote` : `/answers/${target.id}/vote`
  await api.post(url, { value })
}

export interface AcceptResult {
  recipient: User
  bountyPaid: Bounty | null
}

export async function acceptAnswer(questionId: number, answerId: number): Promise<AcceptResult> {
  const { data } = await api.post<AcceptResult>(`/questions/${questionId}/answers/${answerId}/accept`)
  return data
}

export async function rateSuggestion(suggestionId: number, feedback: 'up' | 'down') {
  await api.post(`/ai-suggestions/${suggestionId}/feedback`, { value: feedback })
}

// Modifier ou supprimer son propre contenu (l'API vérifie l'auteur et les règles : réponses, prime, réponse validée)
export async function updateQuestion(id: number, input: { title: string; body: string; tags: string[] }): Promise<QuestionDetail> {
  const { data } = await api.patch<{ data: QuestionDetail }>(`/questions/${id}`, input)
  return data.data
}

export async function deleteQuestion(id: number) {
  await api.delete(`/questions/${id}`)
}

export async function updateAnswer(id: number, body: string): Promise<Answer> {
  const { data } = await api.patch<{ data: Answer }>(`/answers/${id}`, { body })
  return data.data
}

export async function deleteAnswer(id: number) {
  await api.delete(`/answers/${id}`)
}
