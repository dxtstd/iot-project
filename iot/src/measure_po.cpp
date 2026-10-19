#include <Arduino.h>

constexpr uint8_t PO_PIN = 34;
constexpr float ADC_REFERENCE_VOLTAGE = 3.3f;
constexpr int ADC_MAX_VALUE = 4095;

void setup() {
  Serial.begin(9600);
  analogReadResolution(12);
  analogSetPinAttenuation(PO_PIN, ADC_11db);
}

void loop() {
  const int sensorValue = analogRead(PO_PIN);
  const float voltage =
      sensorValue * (ADC_REFERENCE_VOLTAGE / ADC_MAX_VALUE);

  Serial.print("PO raw: ");
  Serial.print(sensorValue);
  Serial.print(" | PO voltage: ");
  Serial.print(voltage, 3);
  Serial.println(" V");

  delay(300);
}
