import 'dotenv/config'
import cors from 'cors'
import express, { type NextFunction, type Request, type Response } from 'express'
import { config } from './config.js'
import { authenticate } from './middleware/authenticate.js'
import { authRouter } from './routes/auth.js'
import { notificationsRouter } from './routes/notifications.js'
import { readingsRouter } from './routes/readings.js'
import { feedingSchedulesRouter } from './routes/feedingSchedules.js'
import { ensureSeedData } from './services/seed.js'
import { startMqttSensorListener, publishFeedingCommand } from './services/mqtt.js'
import { database } from './database.js'
import type { DatabaseDoc, FeedingScheduleDoc } from './types.js'

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api/auth', authRouter)
app.use('/api/readings', authenticate, readingsRouter)
app.use('/api/feeding-schedules', authenticate, feedingSchedulesRouter)
app.use('/api/notifications', authenticate, notificationsRouter)

app.use((error: Error, _request: Request, response: Response, _next: NextFunction) => {
  console.error(error)
  response.status(500).json({ error: 'Terjadi kesalahan pada server' })
})

ensureSeedData()
  .then(() => app.listen(config.port, () => {
    console.log(`Lobster Farm Monitor API listening on http://localhost:${config.port}`)
    if (config.sensorMode === 'mqtt') {
      startMqttSensorListener()
      startFeedingScheduler()
    }
    else console.log('Sensor mode: dummy (seed data enabled)')
  }))
  .catch((error: unknown) => {
    console.error('Unable to initialize PouchDB', error)
    process.exitCode = 1
  })

function startFeedingScheduler() {
  let lastTriggeredMinute = ''
  const checkSchedules = async () => {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Singapore',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date())
    const hour = parts.find((part) => part.type === 'hour')?.value
    const minute = parts.find((part) => part.type === 'minute')?.value
    if (!hour || !minute) return
    const currentMinute = `${hour}:${minute}`
    if (currentMinute === lastTriggeredMinute) return

    const result = await database.allDocs({ include_docs: true, limit: 50000 })
    const schedules = result.rows
      .map((row) => row.doc as DatabaseDoc)
      .filter((doc): doc is FeedingScheduleDoc => doc.type === 'feeding-schedule' && doc.enabled && doc.time === currentMinute)
    for (const schedule of schedules) {
      try {
        publishFeedingCommand(config.mqttDeviceId)
        console.log(`Feeding command sent for ${schedule._id} at UTC+8 ${currentMinute}`)
      } catch (error) {
        console.error('Unable to send scheduled feeding command', error)
      }
    }
    lastTriggeredMinute = currentMinute
  }
  setInterval(() => void checkSchedules().catch((error) => console.error('Feeding scheduler failed', error)), 10000)
}
