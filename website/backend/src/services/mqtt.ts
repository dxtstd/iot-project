import mqtt from 'mqtt'
import { config } from '../config.js'
import { saveSensorReading, type SensorReadingInput } from './readings.js'
import type { MqttClient } from 'mqtt'

let mqttClient: MqttClient | null = null

export function startMqttSensorListener() {
  const urls = [...new Set([config.mqttUrl, config.mqttBackupUrl])]
    .filter((url): url is string => typeof url === 'string' && url.length > 0)
  let urlIndex = 0
  let switching = false

  const connectNext = () => {
    const url = urls[urlIndex]
    if (!url) return
    const client = mqtt.connect(url, {
      ...(config.mqttUsername ? { username: config.mqttUsername } : {}),
      ...(config.mqttPassword ? { password: config.mqttPassword } : {}),
      reconnectPeriod: 0,
    })

    client.on('connect', () => {
      console.log(`MQTT connected: ${url}`)
      mqttClient = client
      switching = false
      client.subscribe(config.mqttSensorTopic, (error) => {
        if (error) console.error(`MQTT subscription failed for ${config.mqttSensorTopic}`, error)
        else console.log(`MQTT subscribed: ${config.mqttSensorTopic}`)
      })
    })

    client.on('message', (topic, payload) => {
      if (topic !== config.mqttSensorTopic) return
      try {
        const input = JSON.parse(payload.toString()) as SensorReadingInput
        void saveSensorReading(input).then((reading) => {
          console.log(`Sensor reading saved: ${reading.timestamp}`)
        }).catch((error: unknown) => {
          console.error('Invalid MQTT sensor reading', error)
        })
      } catch (error) {
        console.error('Invalid MQTT JSON payload', error)
      }
    })

    client.on('error', (error) => console.error(`MQTT connection error for ${url}:`, error))
    client.on('close', () => {
      if (mqttClient === client) mqttClient = null
      if (switching) return
      switching = true
      urlIndex = (urlIndex + 1) % urls.length
      setTimeout(connectNext, 5000)
    })
  }

  connectNext()
  return mqttClient
}

export function publishFeedingCommand(deviceId: string, durationMs = 1000) {
  if (!mqttClient?.connected) throw new Error('MQTT belum terhubung')
  const topic = deviceId === config.mqttDeviceId
    ? config.mqttCommandTopic
    : `lobster-farm/${deviceId}/command`
  const payload = JSON.stringify({ deviceId, action: 'feed', durationMs })
  mqttClient.publish(topic, payload, { qos: 1 }, (error) => {
    if (error) console.error(`MQTT command publish failed for ${topic}`, error)
  })
}
