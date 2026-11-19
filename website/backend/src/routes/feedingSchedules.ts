import { Router } from 'express'
import { database } from '../database.js'
import type { DatabaseDoc, FeedingScheduleDoc } from '../types.js'
import { config } from '../config.js'
import { publishFeedingCommand } from '../services/mqtt.js'

export const feedingSchedulesRouter = Router()
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

async function getSchedules() {
  const result = await database.allDocs({ include_docs: true, limit: 50000 })
  return result.rows
    .map((row) => row.doc as DatabaseDoc)
    .filter((doc): doc is FeedingScheduleDoc => doc.type === 'feeding-schedule')
    .sort((a, b) => a.time.localeCompare(b.time))
}

feedingSchedulesRouter.get('/', async (_request, response) => {
  return response.json(await getSchedules())
})

feedingSchedulesRouter.post('/', async (request, response) => {
  const { time, enabled = true } = request.body as { time?: unknown; enabled?: unknown }
  if (typeof time !== 'string' || !TIME_PATTERN.test(time)) {
    return response.status(400).json({ error: 'Waktu pakan harus berformat HH:mm' })
  }
  if (typeof enabled !== 'boolean') {
    return response.status(400).json({ error: 'Status jadwal tidak valid' })
  }

  const schedule: FeedingScheduleDoc = {
    _id: `feeding-schedule:${Date.now()}`,
    type: 'feeding-schedule',
    time,
    enabled,
    timezone: 'Asia/Singapore',
    createdAt: new Date().toISOString(),
  }
  await database.put(schedule)
  return response.status(201).json(schedule)
})

feedingSchedulesRouter.put('/:id', async (request, response) => {
  const { time, enabled } = request.body as { time?: unknown; enabled?: unknown }
  if (typeof time !== 'string' || !TIME_PATTERN.test(time) || typeof enabled !== 'boolean') {
    return response.status(400).json({ error: 'Waktu atau status jadwal tidak valid' })
  }

  try {
    const current = await database.get(request.params.id) as FeedingScheduleDoc & { _rev: string }
    if (current.type !== 'feeding-schedule') return response.status(404).json({ error: 'Jadwal tidak ditemukan' })
    const updated = { ...current, time, enabled }
    await database.put(updated)
    return response.json(updated)
  } catch (error) {
    if ((error as { status?: number }).status === 404) return response.status(404).json({ error: 'Jadwal tidak ditemukan' })
    throw error
  }
})

feedingSchedulesRouter.delete('/:id', async (request, response) => {
  try {
    const current = await database.get(request.params.id) as FeedingScheduleDoc & { _rev: string }
    if (current.type !== 'feeding-schedule') return response.status(404).json({ error: 'Jadwal tidak ditemukan' })
    await database.remove(current._id, current._rev)
    return response.status(204).send()
  } catch (error) {
    if ((error as { status?: number }).status === 404) return response.status(404).json({ error: 'Jadwal tidak ditemukan' })
    throw error
  }
})

feedingSchedulesRouter.post('/feed', async (_request, response) => {
  try {
    publishFeedingCommand(config.mqttDeviceId)
    return response.status(202).json({ deviceId: config.mqttDeviceId, action: 'feed', durationMs: 1000 })
  } catch (error) {
    if (error instanceof Error && error.message === 'MQTT belum terhubung') {
      return response.status(503).json({ error: error.message })
    }
    throw error
  }
})
