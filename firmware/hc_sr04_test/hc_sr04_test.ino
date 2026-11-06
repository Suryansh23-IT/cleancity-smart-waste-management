
/*
  ESP32 + 4 HC-SR04
  COMPLETE DIAGNOSTIC TEST

  Sensor 1: TRIG 5,  ECHO 18
  Sensor 2: TRIG 26, ECHO 27
  Sensor 3: TRIG 19, ECHO 21
  Sensor 4: TRIG 32,  ECHO 33

  IMPORTANT:
  Each Echo must be safely level-shifted
  from 5V to 3.3V.
*/

const int TOTAL_SENSORS = 4;

const int trigPins[4] = {5, 26, 19, 32};
const int echoPins[4] = {18, 27, 21, 33};

void setup() {
  Serial.begin(115200);
  delay(1000);

  for (int i = 0; i < TOTAL_SENSORS; i++) {
    pinMode(trigPins[i], OUTPUT);
    pinMode(echoPins[i], INPUT);

    digitalWrite(trigPins[i], LOW);
  }

  Serial.println("============================");
  Serial.println("4 SENSOR DIAGNOSTIC SYSTEM");
  Serial.println("============================");
}

void testSensor(int sensorNumber) {

  int index = sensorNumber - 1;

  int trig = trigPins[index];
  int echo = echoPins[index];

  // Check Echo before triggering
  int echoBefore = digitalRead(echo);

  // Generate ultrasonic trigger
  digitalWrite(trig, LOW);
  delayMicroseconds(5);

  digitalWrite(trig, HIGH);
  delayMicroseconds(10);
  digitalWrite(trig, LOW);

  // Measure Echo pulse
  unsigned long duration =
      pulseIn(echo, HIGH, 30000UL);

  // Check Echo after measurement
  int echoAfter = digitalRead(echo);

  Serial.print("Sensor ");
  Serial.print(sensorNumber);

  Serial.print(" | TRIG:");
  Serial.print(trig);

  Serial.print(" ECHO:");
  Serial.print(echo);

  Serial.print(" | Before:");
  Serial.print(echoBefore == HIGH ? "HIGH" : "LOW");

  Serial.print(" | Pulse:");
  Serial.print(duration);
  Serial.print("us");

  Serial.print(" | After:");
  Serial.print(echoAfter == HIGH ? "HIGH" : "LOW");

  if (duration == 0) {

    Serial.println(" | NO ECHO");

  } else {

    float distance = duration * 0.0343 / 2.0;

    Serial.print(" | Distance:");
    Serial.print(distance, 2);
    Serial.println(" cm");
  }
}

void loop() {

  Serial.println();
  Serial.println("========== NEW TEST ==========");

  for (int i = 1; i <= TOTAL_SENSORS; i++) {

    testSensor(i);

    // Reduce sensor interference
    delay(70);
  }

  Serial.println("==============================");

  delay(500);
}
