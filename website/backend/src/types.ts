import type { Request } from 'express'

export type UserDoc = {
  _id: string
  type: 'user'
  email: string
  passwordHash: string
}

export type ReadingDoc = {
  _id: string
  type: 'reading'
  timestamp: string
  temperature: number
  turbidity: number
  ph: number
}

export type SettingsDoc = {
  _id: string
  type: 'notification-settings'
  enabled: boolean
  chatId: string
}

export type DatabaseDoc = UserDoc | ReadingDoc | SettingsDoc
export type AuthRequest = Request & { userEmail?: string }
