import { database } from '../database.js'
import type { DatabaseDoc } from '../types.js'
import { config } from '../config.js'

export async function ensureSeedData() {
  try {
    await database.get('settings:notifications')
  } catch (error) {
    if ((error as { status?: number }).status !== 404) throw error
    await database.put({ _id: 'settings:notifications', type: 'notification-settings', enabled: false, chatId: '' })
  }

  if (config.sensorMode !== 'dummy') return

  const existing = await database.allDocs({ include_docs: true })
  if (existing.rows.some((row) => row.doc && (row.doc as DatabaseDoc).type === 'reading')) return

  const values: Array<[number, number, number]> = [[28, 20, 7.1], [36, 38, 7.8], [31, 29, 7.4], [22, 20, 7], [24, 24, 7.1], [34, 35, 7.7], [45, 44, 8.5]]
  await database.bulkDocs(values.map(([temperature, turbidity, ph], index) => ({
    _id: `reading:2026-09-${String(index + 7).padStart(2, '0')}`,
    type: 'reading' as const,
    timestamp: `2026-09-${String(index + 7).padStart(2, '0')}`,
    temperature,
    turbidity,
    ph,
  })))
}
