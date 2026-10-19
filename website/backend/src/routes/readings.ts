import { Router } from 'express'
import { database } from '../database.js'
import { saveSensorReading } from '../services/readings.js'
import type { DatabaseDoc, ReadingDoc } from '../types.js'

export const readingsRouter = Router()

readingsRouter.get('/', async (_request, response) => {
  const result = await database.allDocs({ include_docs: true, descending: true, limit: 100 })
  const readings = result.rows
    .map((row) => row.doc as DatabaseDoc)
    .filter((doc): doc is ReadingDoc => doc.type === 'reading')
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
