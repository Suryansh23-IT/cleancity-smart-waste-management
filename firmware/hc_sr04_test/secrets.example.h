#pragma once

// Copy to ignored secrets.h and fill locally before compiling for Wi-Fi.
#define CLOUD_WIFI_SSID ""
#define CLOUD_WIFI_PASSWORD ""
#define CLOUD_INGEST_URL "https://YOUR-APP/api/telemetry/ingest"
#define CLOUD_DEVICE_ID "device-cleancity-esp32"
#define CLOUD_DEVICE_TOKEN ""
static const char CLOUD_ROOT_CA[] = R"PEM(
-----BEGIN CERTIFICATE-----
Replace with the trusted CA certificate for the deployed endpoint
-----END CERTIFICATE-----
)PEM";
