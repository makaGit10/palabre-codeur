// Les 26 pays d'Afrique francophone
export type CountryCode =
  | 'SN'
  | 'CI'
  | 'CM'
  | 'MA'
  | 'BF'
  | 'ML'
  | 'NE'
  | 'BJ'
  | 'TG'
  | 'GN'
  | 'MR'
  | 'GA'
  | 'CG'
  | 'CD'
  | 'TD'
  | 'CF'
  | 'GQ'
  | 'DZ'
  | 'TN'
  | 'MG'
  | 'KM'
  | 'DJ'
  | 'RW'
  | 'BI'
  | 'MU'
  | 'SC'

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
  emailVerified: boolean
  locale: 'fr' | 'en'
  isAdmin: boolean
}

export type PaymentMethod =
  | 'wave'
  | 'orange_money'
  | 'free_money'
  | 'mtn_momo'
  | 'moov_money'
  | 'airtel_money'
  | 'mpesa'
  | 'flooz'
  | 'tmoney'
  | 'mvola'
  | 'card'
  | 'bank_transfer'

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
  editedAt: string | null
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
  editedAt: string | null
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
  type: 'bounty_received' | 'bounty_held' | 'bounty_paid' | 'bounty_refunded' | 'withdrawal' | 'topup'
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
  kind: 'topic' | 'country' | 'group'
  isPrivate: boolean
  description: string | null
  messagesCount: number
  membersCount: number | null
  unreadCount: number
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
  mentions?: number[] // personnes mentionnées avec @
}

export interface Reaction {
  emoji: string
  count: number
  mine: boolean
}

// Champs communs aux messages de salon et privés
export interface MessageBase {
  id: number
  body: string
  attachment: MessageAttachment | null
  editedAt: string | null
  deleted: boolean
  reactions: Reaction[]
  canEdit: boolean
  canDelete: boolean
  createdAt: string
}

export interface GroupMember extends User {
  role: 'admin' | 'member'
  joinedAt: string
}

export interface RoomMessage extends MessageBase {
  author: User
}

export interface Conversation {
  id: number
  user: User
  lastMessage: { body: string; mine: boolean; createdAt: string } | null
  unreadCount: number
}

export interface DirectMessage extends MessageBase {
  mine: boolean
  readAt: string | null
}

export interface AppNotification {
  id: string
  kind: 'answer' | 'accepted' | 'bounty' | 'message' | 'mention' | 'topup' | 'refund' | 'info'
  title: string
  body: string
  url: string | null
  readAt: string | null
  createdAt: string
}

// ——— Recherche globale (Ctrl K) : résultats groupés par section ———
export type SearchSectionId = 'questions' | 'snippets' | 'rooms' | 'users' | 'messages'

export interface SearchItem {
  id: number | string
  title: string
  subtitle: string
  url: string
  country?: CountryCode // pour les membres
}

export interface SearchSection {
  id: SearchSectionId
  label: string
  items: SearchItem[]
}
