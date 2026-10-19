#include <Arduino.h>

const uint8_t PH_PIN = A0;
const uint8_t SAMPLE_COUNT = 20;
const float ADC_REFERENCE_VOLTAGE = 5.0f;
const int ADC_MAX_VALUE = 1023;

float readPoVoltage(int& rawValue) {
  long total = 0;

  for (uint8_t sample = 0; sample < SAMPLE_COUNT; ++sample) {
    total += analogRead(PH_PIN);
    delay(5);
  }

  rawValue = total / SAMPLE_COUNT;
  return rawValue * (ADC_REFERENCE_VOLTAGE / ADC_MAX_VALUE);
}

void setup() {
  Serial.begin(9600);
}

void loop() {
  int rawValue = 0;
  const float voltage = readPoVoltage(rawValue);

  Serial.print("PO raw: ");
  Serial.print(rawValue);
  Serial.print(" | PO voltage: ");
  Serial.print(voltage, 3);
  Serial.println(" V");

  delay(300);
}
