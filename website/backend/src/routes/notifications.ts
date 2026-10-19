import { Router } from 'express'
import { database } from '../database.js'
import type { SettingsDoc } from '../types.js'

export const notificationsRouter = Router()

notificationsRouter.get('/', async (_request, response) => {
  const settings = await database.get('settings:notifications') as SettingsDoc
  return response.json({ enabled: settings.enabled, chatId: settings.chatId })
})

notificationsRouter.put('/', async (request, response) => {
  const current = await database.get('settings:notifications') as SettingsDoc
  const { enabled, chatId } = request.body as Partial<SettingsDoc>
  const updated = {
    ...current,
    enabled: typeof enabled === 'boolean' ? enabled : current.enabled,
    chatId: typeof chatId === 'string' ? chatId.trim() : current.chatId,
  }
  await database.put(updated)
  return response.json({ enabled: updated.enabled, chatId: updated.chatId })
})
