// Questions, réponses, votes et primes : appels à l'API Laravel.
import { api } from '../lib/api'
import type { Bounty, NewQuestion, Question, QuestionDetail, User, VoteValue } from '../types'

export async function listQuestions(): Promise<Question[]> {
  const { data } = await api.get<{ data: Question[] }>('/questions')
  return data.data
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
