// Salons « Sous l'arbre », messages privés et notifications : appels à l'API Laravel.
// Les fils se rafraîchissent par interrogation régulière (voir refetchInterval dans les pages) ;
// un passage au temps réel (Laravel Reverb) ne changerait que ce fichier.
import { api } from '../lib/api'
import type { AppNotification, Conversation, DirectMessage, MessagePayload, Room, RoomMessage, User } from '../types'

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
