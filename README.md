# CleanCity

Smart City Waste Collection & Route Management System: six physical bins, one ESP32, two manually moved trucks, and a separate 60-bin simulation.

Pipeline: HC-SR04 sensors -> ESP32 -> 2.4 GHz hotspot -> AWS IoT Core (MQTT/TLS) -> IoT Rule -> Lambda -> DynamoDB. React + Vite polls API Gateway -> Lambda for dashboard data and collection actions.

## Current status

M0 preparation only. No board purchased/identified, GPIOs assigned, circuit verified, firmware compiled/uploaded, sensor tested, or AWS resources deployed. The first-sensor sketch is deliberately disabled until board and wiring review.

Start with [purchase and safety review](docs/purchase-and-review.md), then [M0 setup](docs/m0-setup.md). See [roadmap](docs/roadmap.md) for the four milestones and team tasks.

## Minimal stack

- Firmware: Arduino C++ with Espressif's Arduino-ESP32 core; Arduino IDE 2 for the first upload.
- Frontend later: React + Vite + TypeScript; ordinary HTTP polling.
- Cloud later: Node.js/TypeScript Lambda, API Gateway HTTP API, DynamoDB, AWS IoT Core. Select a supported runtime and record dependency versions at M2.
- Maps: local road graph and SVG; Dijkstra plus a simple two-truck route heuristic.
- One Git repository; no Docker, Express server, paid map APIs or database server.

## Folder ownership

`firmware/` first-sensor sketch now; `docs/` preparation and real test records now. Add `frontend/`, `cloud/` and `data/` when their milestone starts, rather than filling them with speculative implementations.

## Git workflow

Review `git status --short` and `git diff` before staging named files. Run relevant checks, then commit with an honest description. A preparation commit is not a passed hardware milestone. Commit verified milestones separately. Never add private keys, credentials or local secrets. A private GitHub repository is useful for backup but does not make committed secrets safe.

The original project brief is supplied in chat. Safety and reliability clarifications are recorded in the review; architectural direction and four milestones are preserved.
