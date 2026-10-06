export type CountryCode = 'SN' | 'CI' | 'CM' | 'MA' | 'BF' | 'ML'

export interface User {
  id: number
  name: string
  country: CountryCode
  city: string
  reputation: number
  bountyEarnings: number
}

// Compte de la personne connectée : profil public + e-mail
export interface Me extends User {
  email: string
}

export type PaymentMethod = 'wave' | 'orange_money' | 'free_money' | 'mtn_momo' | 'moov_money' | 'card' | 'bank_transfer'

export interface Bounty {
  amount: number
  method: PaymentMethod
  status: 'held' | 'paid' | 'refunded'
}

export type VoteValue = -1 | 0 | 1

export interface Answer {
  id: number
  author: User
  body: string // Markdown
  votes: number
  myVote: VoteValue
  accepted: boolean
  createdAt: string
}

export interface Question {
  id: number
  title: string
  tags: string[]
  author: User
  votes: number
  views: number
  answersCount: number
  solved: boolean
  bounty: Bounty | null
  createdAt: string
}

export interface AiSuggestion {
  id: number
  text: string
  feedback: 'up' | 'down' | null
}

export interface QuestionDetail extends Question {
  body: string // Markdown
  myVote: VoteValue
  answers: Answer[]
  aiSuggestion: AiSuggestion | null
}

export interface NewQuestion {
  title: string
  body: string
  tags: string[]
  bounty: { amount: number; method: PaymentMethod } | null
}

export interface WalletTransaction {
  id: number
  type: 'bounty_received' | 'bounty_held' | 'bounty_paid' | 'withdrawal'
  amount: number // en FCFA
  label: string
  method: PaymentMethod | null
  date: string
}

export interface Wallet {
  balance: number // en FCFA, disponible au retrait
  held: number // primes offertes, bloquées jusqu'à validation
  transactions: WalletTransaction[]
}

// ——— Salons, messages privés, notifications ———
export interface Room {
  id: number
  slug: string
  name: string
  kind: 'topic' | 'country'
  description: string | null
  messagesCount: number
  lastMessage: { body: string; authorName: string; createdAt: string } | null
}

// Question ou extrait de code partagé dans un message
export interface MessageAttachment {
  type: 'question' | 'snippet'
  id: number
  title: string
  meta: string
  url: string
  code?: string
  fence?: string
}

export interface MessagePayload {
  body?: string
  attachment?: { type: 'question' | 'snippet'; id: number }
}

export interface RoomMessage {
  id: number
  body: string
  author: User
  attachment: MessageAttachment | null
  createdAt: string
}

export interface Conversation {
  id: number
  user: User
  lastMessage: { body: string; mine: boolean; createdAt: string } | null
  unreadCount: number
}

export interface DirectMessage {
  id: number
  body: string
  mine: boolean
  attachment: MessageAttachment | null
  readAt: string | null
  createdAt: string
}

export interface AppNotification {
  id: string
  kind: 'answer' | 'accepted' | 'bounty' | 'message' | 'info'
  title: string
  body: string
  url: string | null
  readAt: string | null
  createdAt: string
}
