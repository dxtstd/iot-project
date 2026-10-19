import mqtt from 'mqtt'
import { config } from '../config.js'
import { saveSensorReading, type SensorReadingInput } from './readings.js'

export function startMqttSensorListener() {
  const client = mqtt.connect(config.mqttUrl, {
    ...(config.mqttUsername ? { username: config.mqttUsername } : {}),
    ...(config.mqttPassword ? { password: config.mqttPassword } : {}),
  })

  client.on('connect', () => {
    console.log(`MQTT connected: ${config.mqttUrl}`)
    client.subscribe(config.mqttTopic, (error) => {
      if (error) console.error(`MQTT subscription failed for ${config.mqttTopic}`, error)
      else console.log(`MQTT subscribed: ${config.mqttTopic}`)
    })
  })

  client.on('message', (topic, payload) => {
    if (topic !== config.mqttTopic) return
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

  client.on('error', (error) => console.error('MQTT connection error', error))
  client.on('reconnect', () => console.log('MQTT reconnecting...'))
  return client
}
