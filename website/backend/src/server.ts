import 'dotenv/config'
import cors from 'cors'
import express, { type NextFunction, type Request, type Response } from 'express'
import { config } from './config.js'
import { authenticate } from './middleware/authenticate.js'
import { authRouter } from './routes/auth.js'
import { notificationsRouter } from './routes/notifications.js'
import { readingsRouter } from './routes/readings.js'
import { ensureSeedData } from './services/seed.js'
import { startMqttSensorListener } from './services/mqtt.js'

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api/auth', authRouter)
app.use('/api/readings', authenticate, readingsRouter)
app.use('/api/notifications', authenticate, notificationsRouter)

app.use((error: Error, _request: Request, response: Response, _next: NextFunction) => {
  console.error(error)
  response.status(500).json({ error: 'Terjadi kesalahan pada server' })
})

ensureSeedData()
  .then(() => app.listen(config.port, () => {
    console.log(`Lobster Farm Monitor API listening on http://localhost:${config.port}`)
    if (config.sensorMode === 'mqtt') startMqttSensorListener()
    else console.log('Sensor mode: dummy (seed data enabled)')
  }))
  .catch((error: unknown) => {
    console.error('Unable to initialize PouchDB', error)
    process.exitCode = 1
  })
