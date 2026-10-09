// Signalements (tout membre) et modération (administrateurs, vérifiés par l'API)
import { api } from '../lib/api'

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
