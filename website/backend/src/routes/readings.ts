import { Router } from 'express'
import { database } from '../database.js'
import { saveSensorReading } from '../services/readings.js'
import type { DatabaseDoc, ReadingDoc } from '../types.js'

export const readingsRouter = Router()

function getBucketMilliseconds(hours: number) {
  if (hours <= 1) return 5 * 60 * 1000
  if (hours <= 6) return 15 * 60 * 1000
  if (hours <= 12) return 30 * 60 * 1000
  if (hours <= 24) return 60 * 60 * 1000
  if (hours <= 72) return 3 * 60 * 60 * 1000
  return 6 * 60 * 60 * 1000
}

readingsRouter.get('/status', async (_request, response) => {
  const result = await database.allDocs({ include_docs: true, limit: 50000 })
  const latestReading = result.rows
    .map((row) => row.doc as DatabaseDoc)
    .filter((doc): doc is ReadingDoc => doc.type === 'reading')
    .filter((reading) => Number.isFinite(Date.parse(reading.timestamp)))
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))[0]
  const lastSeen = latestReading?.timestamp
  const ageSeconds = lastSeen ? Math.max(0, Math.floor((Date.now() - Date.parse(lastSeen)) / 1000)) : null
  const connected = ageSeconds !== null && ageSeconds <= 90
  return response.json({ connected, lastSeen: lastSeen ?? null, ageSeconds })
})

readingsRouter.get('/current', async (_request, response) => {
  const result = await database.allDocs({ include_docs: true, limit: 50000 })
  const latestReading = result.rows
    .map((row) => row.doc as DatabaseDoc)
    .filter((doc): doc is ReadingDoc => doc.type === 'reading')
    .filter((reading) => Number.isFinite(Date.parse(reading.timestamp)))
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))[0]
  if (!latestReading) return response.status(404).json({ error: 'Belum ada pembacaan sensor' })
  return response.json(latestReading)
})

readingsRouter.get('/range', async (request, response) => {
  const requestedHours = Number(request.query.hours)
  const hours = Number.isFinite(requestedHours) && requestedHours > 0
    ? Math.min(requestedHours, 168)
    : 168
  const cutoff = Date.now() - hours * 60 * 60 * 1000
  const bucketMilliseconds = getBucketMilliseconds(hours)
  const result = await database.allDocs({ include_docs: true, descending: true, limit: 50000 })
  const readings = result.rows
    .map((row) => row.doc as DatabaseDoc)
    .filter((doc): doc is ReadingDoc => doc.type === 'reading')
    .filter((reading) => Date.parse(reading.timestamp) >= cutoff)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))

  const buckets = new Map<number, { temperature: number; turbidity: number; ph: number; count: number }>()
  for (const reading of readings) {
    const timestamp = Date.parse(reading.timestamp)
    if (!Number.isFinite(timestamp)) continue
    const bucketTimestamp = Math.floor(timestamp / bucketMilliseconds) * bucketMilliseconds
    const bucket = buckets.get(bucketTimestamp) ?? { temperature: 0, turbidity: 0, ph: 0, count: 0 }
    bucket.temperature += reading.temperature
    bucket.turbidity += reading.turbidity
    bucket.ph += reading.ph
    bucket.count += 1
    buckets.set(bucketTimestamp, bucket)
  }

  const bucketTimestamps = [...buckets.keys()].sort((a, b) => a - b)
  const aggregatedReadings = []
  const firstTimestamp = bucketTimestamps[0]
  const lastTimestamp = bucketTimestamps[bucketTimestamps.length - 1]
  if (firstTimestamp !== undefined && lastTimestamp !== undefined) {
    for (let timestamp = firstTimestamp; timestamp <= lastTimestamp; timestamp += bucketMilliseconds) {
      const bucket = buckets.get(timestamp)
      aggregatedReadings.push({
        _id: `reading:aggregate:${timestamp}`,
        type: 'reading' as const,
        timestamp: new Date(timestamp).toISOString(),
        temperature: bucket ? Number((bucket.temperature / bucket.count).toFixed(2)) : 0,
        turbidity: bucket ? Number((bucket.turbidity / bucket.count).toFixed(1)) : 0,
        ph: bucket ? Number((bucket.ph / bucket.count).toFixed(2)) : 0,
      })
    }
  }

  return response.json(aggregatedReadings)
})

readingsRouter.post('/', async (request, response) => {
  try {
    return response.status(201).json(await saveSensorReading(request.body))
  } catch (error) {
    if (error instanceof Error && error.message === 'Nilai sensor harus berupa angka') {
      return response.status(400).json({ error: error.message })
    }
    throw error
  }
})
