// Salons « Sous l'arbre », messages privés et notifications : appels à l'API Laravel.
// Les fils se rafraîchissent par interrogation régulière (voir refetchInterval dans les pages) ;
// un passage au temps réel (Laravel Reverb) ne changerait que ce fichier.
import { api } from '../lib/api'
import type { AppNotification, Conversation, DirectMessage, GroupMember, MessagePayload, Room, RoomMessage, User } from '../types'

export async function listRooms(): Promise<Room[]> {
  const { data } = await api.get<{ data: Room[] }>('/rooms')
  return data.data
}

export async function roomMessages(slug: string): Promise<RoomMessage[]> {
  const { data } = await api.get<{ data: RoomMessage[] }>(`/rooms/${slug}/messages`)
  return data.data
}

export async function postRoomMessage(slug: string, payload: MessagePayload): Promise<RoomMessage> {
  const { data } = await api.post<{ data: RoomMessage }>(`/rooms/${slug}/messages`, payload)
  return data.data
}

export async function listConversations(): Promise<{ data: Conversation[]; unreadCount: number }> {
  const { data } = await api.get('/conversations')
  return data
}

// Ouvrir un fil marque comme lus les messages reçus
export async function thread(userId: number): Promise<{ user: User; messages: DirectMessage[] }> {
  const { data } = await api.get(`/conversations/${userId}`)
  return data
}

export async function sendDirectMessage(userId: number, payload: MessagePayload): Promise<DirectMessage> {
  const { data } = await api.post<DirectMessage>(`/conversations/${userId}/messages`, payload)
  return data
}

export async function listNotifications(): Promise<{ data: AppNotification[]; unreadCount: number }> {
  const { data } = await api.get('/notifications')
  return data
}

export async function markNotificationsRead() {
  await api.post('/notifications/read')
}

// ——— Modifier, supprimer, réagir (kind : room | direct) ———
export type MessageKind = 'room' | 'direct'

export async function editMessage(kind: MessageKind, id: number, body: string) {
  await api.patch(`/messages/${kind}/${id}`, { body })
}

export async function deleteMessage(kind: MessageKind, id: number) {
  await api.delete(`/messages/${kind}/${id}`)
}

export async function reactToMessage(kind: MessageKind, id: number, emoji: string) {
  await api.post(`/messages/${kind}/${id}/reactions`, { emoji })
}

// ——— Membres et groupes ———
// Par nom, ou par pays (q vide) : les développeurs les plus actifs d'un pays
export async function searchUsers(q: string, country?: string): Promise<User[]> {
  const { data } = await api.get<{ data: User[] }>('/users/search', { params: { q, country } })
  return data.data
}

export async function createGroup(name: string, members: number[]): Promise<{ id: number; slug: string; name: string }> {
  const { data } = await api.post<{ data: { id: number; slug: string; name: string } }>('/groups', { name, members })
  return data.data
}

export async function groupMembers(slug: string): Promise<{ data: GroupMember[]; isAdmin: boolean }> {
  const { data } = await api.get(`/groups/${slug}/members`)
  return data
}

export async function addGroupMembers(slug: string, members: number[]) {
  await api.post(`/groups/${slug}/members`, { members })
}

export async function removeGroupMember(slug: string, userId: number) {
  await api.delete(`/groups/${slug}/members/${userId}`)
}

export async function leaveGroup(slug: string) {
  await api.delete(`/groups/${slug}/members/me`)
}
