import { config } from '../config.js'
import { database } from '../database.js'
import type { ReadingDoc, SettingsDoc } from '../types.js'

export async function sendTelegramAlert(reading: ReadingDoc) {
  const settings = await database.get('settings:notifications') as SettingsDoc
  if (!settings.enabled || !settings.chatId || !config.telegramBotToken) return

  const text = `⚠️ Peringatan Lobster Farm Monitor\nSuhu kolam: ${reading.temperature}°C\nKekeruhan kolam: ${reading.turbidity}%\npH kolam: ${reading.ph}`
  const response = await fetch(`https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: settings.chatId, text }),
  })
  if (!response.ok) throw new Error(`Telegram request failed with status ${response.status}`)
}
