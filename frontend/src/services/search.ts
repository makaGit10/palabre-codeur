import { api } from '../lib/api'
import type { SearchSection } from '../types'

// Recherche globale : un terme, des résultats groupés par section (questions, extraits, salons, membres, messages)
export async function globalSearch(q: string, signal?: AbortSignal): Promise<SearchSection[]> {
  const { data } = await api.get<{ query: string; sections: SearchSection[] }>('/search', { params: { q }, signal })
  return data.sections
}
