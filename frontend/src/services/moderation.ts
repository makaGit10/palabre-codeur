// Signalements (tout membre) et modération (administrateurs, vérifiés par l'API)
import { api } from '../lib/api'
import type { CountryCode } from '../types'

export type ReportableType = 'question' | 'answer' | 'snippet'
export type ReportReason = 'spam' | 'offensive' | 'wrong' | 'other'

export async function reportContent(input: { type: ReportableType; id: number; reason: ReportReason; details?: string }) {
  await api.post('/reports', input)
}

export interface ModerationItem {
  type: ReportableType
  id: number
  reportId: number
  status: 'open' | 'hidden' | 'dismissed'
  hidden: boolean
  exists: boolean
  title: string | null
  excerpt: string | null
  url: string | null
  author: string | null
  count: number
  reasons: { reason: ReportReason; details: string | null; by: string | null; at: string }[]
}

export async function listReports(status: 'open' | 'closed'): Promise<{ data: ModerationItem[]; openCount: number }> {
  const { data } = await api.get('/admin/reports', { params: { status } })
  return data
}

export async function resolveReport(reportId: number, decision: 'hide' | 'dismiss') {
  await api.post(`/admin/reports/${reportId}/resolve`, { decision })
}

export async function restoreContent(type: ReportableType, id: number) {
  await api.post(`/admin/content/${type}/${id}/restore`)
}

// Membres et rôles (administrateurs seulement)
export type Role = 'member' | 'moderator' | 'admin'

export interface Member {
  id: number
  name: string
  email: string
  country: CountryCode
  city: string | null
  role: Role
  reputation: number
  bountyEarnings: number
  emailVerified: boolean
  createdAt: string
}

export async function listMembers(filters: { q?: string; page?: number } = {}): Promise<{ data: Member[]; page: number; lastPage: number; total: number }> {
  const { data } = await api.get('/admin/members', { params: filters })
  return data
}

export async function setMemberRole(id: number, role: Role): Promise<Member> {
  const { data } = await api.patch<{ data: Member }>(`/admin/members/${id}/role`, { role })
  return data.data
}

export async function createMember(input: { name: string; email: string; country: CountryCode; city: string; role: Role }): Promise<Member> {
  const { data } = await api.post<{ data: Member }>('/admin/members', input)
  return data.data
}
