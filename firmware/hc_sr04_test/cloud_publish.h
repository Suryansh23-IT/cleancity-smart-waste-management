#pragma once

#if __has_include("secrets.h")
#include "secrets.h"
#include <HTTPClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <esp_system.h>
#include <time.h>

namespace Cloud {
struct Diagnostic {
  unsigned long pulseUs;
  bool beforeHigh;
  bool afterHigh;
};

struct Batch {
  Diagnostic sensors[4];
  uint32_t sequence;
  time_t sampledAt;
};

static QueueHandle_t outgoing;
static char bootId[33];
static uint32_t nextSequence;

static int publish(const Batch& batch) {
  char body[640];
  int size = snprintf(body, sizeof(body),
    "{\"deviceId\":\"%s\",\"bootId\":\"%s\",\"seq\":%lu,\"sampledAtMs\":%lld,\"readings\":[",
    CLOUD_DEVICE_ID, bootId, (unsigned long)batch.sequence, (long long)batch.sampledAt * 1000);
  if (size < 0 || size >= (int)sizeof(body)) return 400;
  for (int i = 0; i < 4; i++) {
    const auto& row = batch.sensors[i];
    int written = snprintf(body + size, sizeof(body) - size,
      "%s{\"binId\":\"BIN-00%d\",\"pulseUs\":%lu,\"beforeHigh\":%s,\"afterHigh\":%s}",
      i ? "," : "", i + 1, row.pulseUs, row.beforeHigh ? "true" : "false", row.afterHigh ? "true" : "false");
    if (written < 0 || written >= (int)sizeof(body) - size) return 400;
    size += written;
  }
  if (size + 2 >= (int)sizeof(body)) return 400;
  body[size++] = ']';
  body[size++] = '}';
  body[size] = '\0';

  WiFiClientSecure client;
  client.setCACert(CLOUD_ROOT_CA);
  client.setHandshakeTimeout(4);
  HTTPClient http;
  http.setConnectTimeout(4000);
  http.setTimeout(4000);
  if (!http.begin(client, CLOUD_INGEST_URL)) return -1;
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + CLOUD_DEVICE_TOKEN);
  const int status = http.POST(reinterpret_cast<uint8_t*>(body), size);
  http.end();
  return status;
}

static void worker(void*) {
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(false);
  configTime(0, 0, "pool.ntp.org", "time.google.com");
  unsigned long lastConnect = millis() - 15000;
  unsigned long retryAt = 0;
  Batch pending{};
  bool hasPending = false;
  int attempts = 0;
  for (;;) {
    const unsigned long now = millis();
    if (xQueueReceive(outgoing, &pending, 0) == pdPASS) {
      hasPending = true;
      attempts = 0;
      retryAt = now;
    }
    if (WiFi.status() != WL_CONNECTED) {
      if (now - lastConnect >= 15000) {
        WiFi.begin(CLOUD_WIFI_SSID, CLOUD_WIFI_PASSWORD);
        lastConnect = now;
      }
    } else if (hasPending && (int32_t)(now - retryAt) >= 0) {
      if (time(nullptr) - pending.sampledAt > 45) hasPending = false;
      else {
        const int status = publish(pending);
        attempts++;
        const bool retryable = status < 0 || status == 429 || status >= 500;
        hasPending = retryable && attempts < 3;
        retryAt = millis() + (attempts == 1 ? 5000 : 10000);
      }
    }
    vTaskDelay(pdMS_TO_TICKS(250));
  }
}

static void begin() {
  if (strncmp(CLOUD_INGEST_URL, "https://", 8) != 0 ||
      strlen(CLOUD_DEVICE_TOKEN) < 32 || strlen(CLOUD_ROOT_CA) < 64) return;
  for (int i = 0; i < 4; i++) snprintf(bootId + i * 8, 9, "%08lx", (unsigned long)esp_random());
  outgoing = xQueueCreate(1, sizeof(Batch));
  if (outgoing && xTaskCreate(worker, "cloud-publish", 12288, nullptr, 1, nullptr) != pdPASS) {
    vQueueDelete(outgoing);
    outgoing = nullptr;
  }
}

static void submit(const Diagnostic (&sensors)[4], time_t sampledAt) {
  static unsigned long lastSample = millis() - 10000;
  if (!outgoing || sampledAt < 1735689600 || millis() - lastSample < 10000) return;
  lastSample = millis();
  Batch batch{};
  memcpy(batch.sensors, sensors, sizeof(batch.sensors));
  batch.sequence = nextSequence++;
  batch.sampledAt = sampledAt;
  xQueueOverwrite(outgoing, &batch);
}
}

#else
#include <time.h>
namespace Cloud {
struct Diagnostic { unsigned long pulseUs; bool beforeHigh; bool afterHigh; };
static void begin() {}
static void submit(const Diagnostic (&)[4], time_t) {}
}
#endif
