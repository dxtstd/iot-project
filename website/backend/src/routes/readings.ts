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

readingsRouter.get('/', async (request, response) => {
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

  const aggregatedReadings = [...buckets.entries()].map(([timestamp, bucket]) => ({
    _id: `reading:aggregate:${timestamp}`,
    type: 'reading' as const,
    timestamp: new Date(timestamp).toISOString(),
    temperature: Number((bucket.temperature / bucket.count).toFixed(2)),
    turbidity: Number((bucket.turbidity / bucket.count).toFixed(1)),
    ph: Number((bucket.ph / bucket.count).toFixed(2)),
  }))

  const latestReading = readings[readings.length - 1]
  return response.json(latestReading ? [...aggregatedReadings, latestReading] : aggregatedReadings)
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
