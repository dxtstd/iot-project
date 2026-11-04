export const config = {
  port: Number(process.env.PORT ?? 3000),
  jwtSecret: process.env.JWT_SECRET ?? 'change-this-development-secret',
  authUsername: process.env.AUTH_USERNAME ?? 'test',
  authPassword: process.env.AUTH_PASSWORD ?? '123',
  pouchDbPath: process.env.POUCHDB_PATH ?? './data/lobster-farm-monitor',
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
  sensorMode: process.env.SENSOR_MODE === 'mqtt' ? 'mqtt' as const : 'dummy' as const,
  mqttUrl: process.env.MQTT_URL ?? 'mqtt://localhost:1883',
  mqttTopic: process.env.MQTT_TOPIC ?? 'lobster-farm/sensors',
  mqttUsername: process.env.MQTT_USERNAME,
  mqttPassword: process.env.MQTT_PASSWORD,
}
