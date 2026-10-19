import { database } from '../database.js'
import { sendTelegramAlert } from './telegram.js'
import type { ReadingDoc } from '../types.js'

export type SensorReadingInput = {
  temperature?: unknown
  turbidity?: unknown
  ph?: unknown
  timestamp?: unknown
}

export function parseSensorReading(input: SensorReadingInput): Omit<ReadingDoc, '_id' | 'type'> {
  const { temperature, turbidity, ph, timestamp } = input
  if (typeof temperature !== 'number' || typeof turbidity !== 'number' || typeof ph !== 'number' || ![temperature, turbidity, ph].every(Number.isFinite)) {
    throw new Error('Nilai sensor harus berupa angka')
  }
  return {
    timestamp: typeof timestamp === 'string' ? timestamp : new Date().toISOString(),
    temperature,
    turbidity,
    ph,
  }
}

export async function saveSensorReading(input: SensorReadingInput) {
  const values = parseSensorReading(input)
  const reading: ReadingDoc = { _id: `reading:${Date.now()}`, type: 'reading', ...values }
  await database.put(reading)
  if (reading.temperature > 35 || reading.turbidity > 40 || reading.ph < 6.5 || reading.ph > 8.5) {
    await sendTelegramAlert(reading)
  }
  return reading
}
