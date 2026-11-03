// CleanCity M0 only. Default mode exercises Serial without driving sensor pins.
// Confirm the EXACT board and physically review wiring before changing these.
#include <Arduino.h>
#include <driver/gpio.h>

constexpr bool WIRING_REVIEWED = false;
constexpr int TRIG_PIN = -1;  // Replace only after board-specific review.
constexpr int ECHO_PIN = -1;  // Must receive the resistor-divider junction.
constexpr unsigned long ECHO_TIMEOUT_US = 25000;
constexpr unsigned long SAMPLE_INTERVAL_MS = 1000;
constexpr float MIN_DISTANCE_CM = 2.0f;
constexpr float MAX_DISTANCE_CM = 400.0f;

bool sensorEnabled = false;
uint32_t sampleSequence = 0;

void setup() {
  Serial.begin(115200);
  delay(1500);  // Bounded; does not wait forever for a serial terminal.
  Serial.println("CleanCity M0: first-sensor preparation; no Wi-Fi or AWS.");

  if (!WIRING_REVIEWED || TRIG_PIN < 0 || ECHO_PIN < 0 ||
      TRIG_PIN == ECHO_PIN || !GPIO_IS_VALID_OUTPUT_GPIO(TRIG_PIN) ||
      !GPIO_IS_VALID_GPIO(ECHO_PIN)) {
    Serial.println("DISABLED: identify board, review wiring, then configure pins.");
    return;
  }

  // GPIO capability checks do NOT detect reserved/boot/USB pins or bad wiring.
  digitalWrite(TRIG_PIN, LOW);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  sensorEnabled = true;
  Serial.println("ENABLED: raw distance test; use ruler and approved circuit.");
}

void loop() {
  if (!sensorEnabled) {
    delay(SAMPLE_INTERVAL_MS);
    return;
  }

  ++sampleSequence;
  if (digitalRead(ECHO_PIN) == HIGH) {
    Serial.printf("{\"binId\":\"BIN-001\",\"seq\":%lu,\"uptimeMs\":%lu,"
                  "\"status\":\"echo_stuck_high\",\"distanceCm\":null}\n",
                  static_cast<unsigned long>(sampleSequence), millis());
    delay(SAMPLE_INTERVAL_MS);
    return;
  }

  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  const unsigned long durationUs = pulseIn(ECHO_PIN, HIGH, ECHO_TIMEOUT_US);
  const float distanceCm = durationUs * 0.0343f / 2.0f;
  const bool valid = durationUs != 0 && distanceCm >= MIN_DISTANCE_CM &&
                     distanceCm <= MAX_DISTANCE_CM;

  Serial.printf("{\"binId\":\"BIN-001\",\"seq\":%lu,\"uptimeMs\":%lu,",
                static_cast<unsigned long>(sampleSequence), millis());
  if (valid) {
    Serial.printf("\"status\":\"valid\",\"distanceCm\":%.2f}\n", distanceCm);
  } else {
    Serial.printf("\"status\":\"%s\",\"distanceCm\":null}\n",
                  durationUs == 0 ? "timeout" : "out_of_range");
  }
  delay(SAMPLE_INTERVAL_MS);
}
