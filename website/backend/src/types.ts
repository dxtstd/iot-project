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

export type FeedingScheduleDoc = {
  _id: string
  type: 'feeding-schedule'
  time: string
  enabled: boolean
  timezone: 'Asia/Singapore'
  createdAt: string
}

export type DatabaseDoc = UserDoc | ReadingDoc | SettingsDoc | FeedingScheduleDoc
export type AuthRequest = Request & { userUsername?: string }
