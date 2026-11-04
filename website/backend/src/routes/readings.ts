import { Router } from 'express'
import { database } from '../database.js'
import { saveSensorReading } from '../services/readings.js'
import type { DatabaseDoc, ReadingDoc } from '../types.js'

export const readingsRouter = Router()

readingsRouter.get('/', async (request, response) => {
  const requestedHours = Number(request.query.hours)
  const hours = Number.isFinite(requestedHours) && requestedHours > 0
    ? Math.min(requestedHours, 168)
    : 168
  const cutoff = Date.now() - hours * 60 * 60 * 1000
  const result = await database.allDocs({ include_docs: true, descending: true, limit: 50000 })
  const readings = result.rows
    .map((row) => row.doc as DatabaseDoc)
    .filter((doc): doc is ReadingDoc => doc.type === 'reading')
    .filter((reading) => Date.parse(reading.timestamp) >= cutoff)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  return response.json(readings)
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
