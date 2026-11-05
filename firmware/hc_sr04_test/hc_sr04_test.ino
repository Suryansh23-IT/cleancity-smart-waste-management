
#include <Arduino.h>
#include <math.h>

const int TRIG_PIN = 5;
const int ECHO_PIN = 25;

const unsigned long TIMEOUT_US = 30000UL;
const int SAMPLE_COUNT = 10;

float distances[SAMPLE_COUNT];

float readDistance(unsigned long &pulse) {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(5);

  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  pulse = pulseIn(ECHO_PIN, HIGH, TIMEOUT_US);

  if (pulse == 0) return NAN;

  float cm = pulse * 0.0343f / 2.0f;

  if (cm < 2.0f || cm > 400.0f) return NAN;

  return cm;
}

void setup() {
  Serial.begin(115200);

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  digitalWrite(TRIG_PIN, LOW);

  delay(1000);

  Serial.println();
  Serial.println("===============================");
  Serial.println("CLEANCITY - WOKWI SENSOR TEST");
  Serial.println("===============================");
  Serial.println("TRIG: GPIO5");
  Serial.println("ECHO: GPIO25");
  Serial.println("Testing automatically...");
}

void loop() {
  int valid = 0;
  float minimum = 9999.0f;
  float maximum = 0.0f;
  float sum = 0.0f;

  Serial.println();
  Serial.println("-------- NEW BATCH --------");

  for (int i = 0; i < SAMPLE_COUNT; i++) {
    // Keep ultrasonic triggers well separated
    delay(100);

    unsigned long pulse = 0;
    float cm = readDistance(pulse);

    Serial.print("Test ");
    Serial.print(i + 1);

    Serial.print(" | Pulse: ");
    Serial.print(pulse);
    Serial.print(" us");

    if (pulse == 0) {
      Serial.println(" | FAIL: TIMEOUT");
    }
    else if (isnan(cm)) {
      Serial.println(" | FAIL: INVALID PULSE");
    }
    else {
      Serial.print(" | Distance: ");
      Serial.print(cm, 2);
      Serial.println(" cm");

      distances[valid++] = cm;
      sum += cm;

      if (cm < minimum) minimum = cm;
      if (cm > maximum) maximum = cm;
    }
  }

  Serial.println();
  Serial.println("-------- RESULT --------");

  Serial.print("Valid readings: ");
  Serial.print(valid);
  Serial.print("/");
  Serial.println(SAMPLE_COUNT);

  if (valid == 0) {
    Serial.println("[FAIL] No valid distance");
    Serial.println("Check GPIO25 divider junction");
    Serial.println("Check GPIO5 trigger connection");
    Serial.println("Check sensor 5V and GND");
  }
  else {
    float average = sum / valid;
    float spread = maximum - minimum;

    Serial.print("Average: ");
    Serial.print(average, 2);
    Serial.println(" cm");

    Serial.print("Spread: ");
    Serial.print(spread, 2);
    Serial.println(" cm");

    if (valid >= 9 && spread <= 2.0f) {
      Serial.println("[PASS] Stable sensor readings");
    }
    else {
      Serial.println("[WARN] Sensor readings unstable");
    }
  }

  Serial.println("--------------------------");
  delay(1000);
}
