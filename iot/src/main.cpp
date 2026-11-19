#include <Arduino.h>
#include <DallasTemperature.h>
#include <ESP32Servo.h>
#include <PubSubClient.h>
#include <OneWire.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>

#include "secrets.h"

// --- Pinout ESP32 (Gunakan Pin ADC1 Input-Only) ---
constexpr uint8_t PH_PIN = 34;
constexpr uint8_t TURB_PIN = 35;
constexpr uint8_t DS18B20_PIN = 27;
constexpr uint8_t SERVO_PIN = 25;
constexpr unsigned long MQTT_INTERVAL_MS = 30000;
constexpr unsigned long WIFI_TIMEOUT_MS = 10000;

const char* const WIFI_SSIDS[] = {
    WIFI_SSID,
    WIFI_BACKUP_SSID_1,
    WIFI_BACKUP_SSID_2,
};
constexpr size_t WIFI_NETWORK_COUNT =
    sizeof(WIFI_SSIDS) / sizeof(WIFI_SSIDS[0]);

OneWire oneWire(DS18B20_PIN);
DallasTemperature temperatureSensor(&oneWire);
Servo servo;
WiFiClientSecure wifiClient;
PubSubClient mqttClient(wifiClient);
unsigned long lastPublishAt = 0;
unsigned long servoDetachAt = 0;
bool servoActive = false;
size_t mqttServerIndex = 0;

// --- Spesifikasi ADC & Filter ---
constexpr float ADC_REF_VOLTAGE = 3.3f;
constexpr int ADC_MAX_RESOLUTION = 4095;
constexpr int TOTAL_SAMPLES = 50; // Oversampling peredam noise

// --- Data Kalibrasi pH (Dibaca langsung dari Pin ADC ESP32) ---
constexpr float V_PH7 = 1.465f; //[cite: 6]
constexpr float V_PH4 = 1.76f; //[cite: 3]
constexpr float PH_SENSITIVITY = (V_PH4 - V_PH7) / (7.0f - 4.0f); // 0.0933 V/pH

// --- Data Kalibrasi Turbidity ---
// Voltage Divider: R1 = 12 kOhm, R2 = 20 kOhm -> Faktor pengali = 1.6x
constexpr float DIVIDER_CORRECTION = (12.0f + 20.0f) / 20.0f;
constexpr float V_JERNIH_SENSOR = 3.00f; // 0 NTU (Output modul sensor sebelum divider)[cite: 7]
constexpr float V_KERUH_SENSOR  = 0.10f; // 3000 NTU (Output modul sensor sebelum divider)

/**
 * Membaca nilai analog dengan filter rerata sampel
 */
float readStableADC(uint8_t pin) {
  long sumRaw = 0;
  for (int i = 0; i < TOTAL_SAMPLES; i++) {
    sumRaw += analogRead(pin);
    delayMicroseconds(200);
  }
  float avgRaw = static_cast<float>(sumRaw) / static_cast<float>(TOTAL_SAMPLES);
  return avgRaw * (ADC_REF_VOLTAGE / static_cast<float>(ADC_MAX_RESOLUTION));
}

/**
 * Kalkulasi Nilai pH (Regresi Linier 2 Poin)
 */
float calculatePH(float adcVoltage) {
  return 7.0f + ((V_PH7 - adcVoltage) / PH_SENSITIVITY);
}

/**
 * Kalkulasi persentase kekeruhan: 0% jernih, 100% paling keruh
 */
float calculateTurbidityPercentage(float sensorVoltage) {
  if (sensorVoltage >= V_JERNIH_SENSOR) return 0.0f;
  if (sensorVoltage <= V_KERUH_SENSOR) return 100.0f;
  return ((V_JERNIH_SENSOR - sensorVoltage) /
          (V_JERNIH_SENSOR - V_KERUH_SENSOR)) * 100.0f;
}

void connectWiFi() {
  while (WiFi.status() != WL_CONNECTED) {
    for (size_t networkIndex = 0;
         networkIndex < WIFI_NETWORK_COUNT &&
         WiFi.status() != WL_CONNECTED;
         ++networkIndex) {
      Serial.print("Connecting to Wi-Fi: ");
      Serial.println(WIFI_SSIDS[networkIndex]);
      WiFi.begin(WIFI_SSIDS[networkIndex], WIFI_PASSWORD);

      const unsigned long attemptStartedAt = millis();
      while (WiFi.status() != WL_CONNECTED &&
             millis() - attemptStartedAt < WIFI_TIMEOUT_MS) {
        delay(500);
        Serial.print(".");
      }

      if (WiFi.status() != WL_CONNECTED) {
        Serial.println("\nSSID unavailable, trying next network.");
        WiFi.disconnect();
      }
    }

    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("All Wi-Fi networks failed, retrying in 5 seconds.");
      delay(5000);
    }
  }

  Serial.println();
  Serial.print("Wi-Fi connected, IP: ");
  Serial.println(WiFi.localIP());
  WiFi.enableIpV6();
  Serial.print("Wi-Fi global/local IPv6: ");
  Serial.println(WiFi.localIPv6());
}

void connectMQTT() {
  static const char* MQTT_SERVERS[] = { MQTT_SERVER, MQTT_BACKUP_SERVER };
  static const uint16_t MQTT_PORTS[] = { MQTT_PORT, MQTT_BACKUP_PORT };

  while (!mqttClient.connected()) {
    Serial.print("Connecting to MQTT ");
    Serial.print(MQTT_SERVERS[mqttServerIndex]);
    Serial.print("...");
    mqttClient.setServer(MQTT_SERVERS[mqttServerIndex], MQTT_PORTS[mqttServerIndex]);
    if (mqttClient.connect(DEVICE_ID, MQTT_USERNAME, MQTT_PASSWORD)) {
      Serial.println("connected");
      mqttClient.subscribe(MQTT_COMMAND_TOPIC);
    } else {
      Serial.print("failed, state=");
      Serial.print(mqttClient.state());
      mqttServerIndex = (mqttServerIndex + 1) % 2;
      Serial.print(", trying backup in 5 seconds: ");
      Serial.println(MQTT_SERVERS[mqttServerIndex]);
      delay(5000);
    }
  }
}

void handleCommand(char* topic, byte* payload, unsigned int length) {
  if (strcmp(topic, MQTT_COMMAND_TOPIC) != 0) return;

  char command[128];
  const size_t copyLength = min(static_cast<size_t>(length), sizeof(command) - 1);
  memcpy(command, payload, copyLength);
  command[copyLength] = '\0';

  if (strstr(command, "\"action\":\"feed\"") == nullptr) {
    Serial.println("Unknown MQTT command");
    return;
  }

  int durationMs = 1000;
  const char* duration = strstr(command, "\"durationMs\":");
  if (duration != nullptr) {
    durationMs = atoi(duration + 13);
  }
  durationMs = constrain(durationMs, 100, 10000);

  servo.write(45);
  servoActive = true;
  servoDetachAt = millis() + static_cast<unsigned long>(durationMs);
  Serial.print("Feeding command received for ");
  Serial.print(durationMs);
  Serial.println(" ms");
}

void setup() {
  Serial.begin(115200);

  // Konfigurasi ADC ESP32 12-bit & Attenuation 11dB (0 - 3.3V)
  analogReadResolution(12);
  analogSetPinAttenuation(PH_PIN, ADC_11db);
  analogSetPinAttenuation(TURB_PIN, ADC_11db);

  pinMode(PH_PIN, INPUT);
  pinMode(TURB_PIN, INPUT);
  temperatureSensor.begin();

  servo.attach(SERVO_PIN);
  servo.write(0);
  delay(1000);
  servo.write(45);
  delay(1000);
  servo.write(0);
  Serial.println("SG90 bergerak dari 0 ke 45 derajat pada GPIO 25");

  wifiClient.setInsecure();
  mqttClient.setCallback(handleCommand);
  connectWiFi();
  connectMQTT();

  Serial.println("--- Triple Sensor System with MQTT Ready ---");
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  if (!mqttClient.connected()) {
    connectMQTT();
  }
  mqttClient.loop();
  if (servoActive && millis() >= servoDetachAt) {
    servo.write(0);
    servoActive = false;
  }

  if (lastPublishAt != 0 &&
      millis() - lastPublishAt < MQTT_INTERVAL_MS) {
    delay(100);
    return;
  }

  // 1. Pembacaan Sensor pH
  float phAdcVoltage = readStableADC(PH_PIN);
  float phValue = calculatePH(phAdcVoltage);

  // 2. Pembacaan Sensor Turbidity
  float turbAdcVoltage = readStableADC(TURB_PIN);
  float estimatedTurbSensorVoltage = turbAdcVoltage * DIVIDER_CORRECTION;
  float turbidityPercentage =
      calculateTurbidityPercentage(estimatedTurbSensorVoltage);

  // 3. Pembacaan sensor suhu DS18B20
  temperatureSensor.requestTemperatures();
  const float temperatureCelsius =
      temperatureSensor.getTempCByIndex(0);

  // 4. Output ke Serial Monitor
  Serial.print("pH: ");
  Serial.print(phValue, 2);
  Serial.print(" (ADC: ");
  Serial.print(phAdcVoltage, 3);
  Serial.print("V) | Turbidity: ");
  Serial.print(turbidityPercentage, 1);
  Serial.print(" % (Est Sensor: ");
  Serial.print(estimatedTurbSensorVoltage, 3);
  Serial.print("V) | Temperature: ");
  if (temperatureCelsius == DEVICE_DISCONNECTED_C) {
    Serial.println("Sensor disconnected");
  } else {
    Serial.print(temperatureCelsius, 2);
    Serial.println(" C");
  }

  char payload[192];
  const int payloadLength = snprintf(
      payload,
      sizeof(payload),
      "{\"deviceId\":\"%s\",\"temperature\":%.2f,\"turbidity\":%.1f,\"ph\":%.2f}",
      DEVICE_ID,
      temperatureCelsius,
      turbidityPercentage,
      phValue);

  if (payloadLength > 0 &&
      payloadLength < static_cast<int>(sizeof(payload)) &&
      mqttClient.publish(MQTT_SENSOR_TOPIC, payload)) {
    Serial.print("MQTT published: ");
    Serial.println(payload);
  } else {
    Serial.println("MQTT publish failed");
  }

  lastPublishAt = millis();
}