#include <Arduino.h>
#include <DallasTemperature.h>
#include <OneWire.h>

// --- Pinout ESP32 (Gunakan Pin ADC1 Input-Only) ---
constexpr uint8_t PH_PIN = 34;
constexpr uint8_t TURB_PIN = 35;
constexpr uint8_t DS18B20_PIN = 27;

OneWire oneWire(DS18B20_PIN);
DallasTemperature temperatureSensor(&oneWire);

// --- Spesifikasi ADC & Filter ---
constexpr float ADC_REF_VOLTAGE = 3.3f;
constexpr int ADC_MAX_RESOLUTION = 4095;
constexpr int TOTAL_SAMPLES = 50; // Oversampling peredam noise

// --- Data Kalibrasi pH (Dibaca langsung dari Pin ADC ESP32) ---
constexpr float V_PH7 = 1.44f; //[cite: 6]
constexpr float V_PH4 = 1.72f; //[cite: 3]
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
 * Kalkulasi Nilai Kekeruhan/Turbidity (NTU)
 */
float calculateNTU(float sensorVoltage) {
  if (sensorVoltage >= V_JERNIH_SENSOR) return 0.0f;
  if (sensorVoltage <= V_KERUH_SENSOR) return 3000.0f;
  return ((V_JERNIH_SENSOR - sensorVoltage) / (V_JERNIH_SENSOR - V_KERUH_SENSOR)) * 3000.0f;
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

  Serial.println("--- Triple Sensor System (pH, Turbidity & Temperature) Ready ---");
}

void loop() {
  // 1. Pembacaan Sensor pH
  float phAdcVoltage = readStableADC(PH_PIN);
  float phValue = calculatePH(phAdcVoltage);

  // 2. Pembacaan Sensor Turbidity
  float turbAdcVoltage = readStableADC(TURB_PIN);
  float estimatedTurbSensorVoltage = turbAdcVoltage * DIVIDER_CORRECTION;
  float ntuValue = calculateNTU(estimatedTurbSensorVoltage);

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
  Serial.print(ntuValue, 1);
  Serial.print(" NTU (Est Sensor: ");
  Serial.print(estimatedTurbSensorVoltage, 3);
  Serial.print("V) | Temperature: ");
  if (temperatureCelsius == DEVICE_DISCONNECTED_C) {
    Serial.println("Sensor disconnected");
  } else {
    Serial.print(temperatureCelsius, 2);
    Serial.println(" C");
  }

  delay(500);
}