> Historical snapshot preserved from the working tree before the municipal-platform audit. Superseded by the approved Final Master Execution Prompt v1.0 and current README/roadmap. This is not active architecture or wiring/upload guidance.

# CleanCity

Smart City Waste Collection & Route Management System: four physical bins, one ESP32, one manually moved truck, and a separate 60-bin simulation.

Pipeline: HC-SR04 sensors -> ESP32 -> 2.4 GHz hotspot -> AWS IoT Core (MQTT/TLS) -> IoT Rule -> Lambda -> DynamoDB. React + Vite polls API Gateway -> Lambda for dashboard data and collection actions.

## Current status

Pre-M0 preparation only; M0 is not complete. User-confirmed on 3 November 2026: Arduino IDE 2.3.10 and official esp32 by Espressif Systems v3.3.12 installed successfully; AWS Free Plan active with $100 credits, showing 183 days remaining and expiry 3 May 2027. Hyderabad (ap-south-2) activation was initiated, but availability and suitability for the complete service pipeline are not confirmed. Root MFA and billing alerts are unconfirmed. No AWS application resources deployed; AWS Agent Toolkit intentionally skipped. Git/GitHub foundation setup is complete. Exact board selection, GPIO assignments, board-specific drivers, electrical verification, compilation, upload and sensor tests remain pending. The first-sensor sketch is deliberately disabled until board and wiring review.

AWS project usage must stay below $10 before credits; $100 credit availability is not permission to spend it. Plan for $5 or less and stop/review at $5 to preserve headroom for delayed billing. No Paid Plan upgrade without explicit user approval. See the roadmap evidence log for pending security and cost controls.

Start with [purchase and safety review](docs/purchase-and-review.md), then [M0 setup](docs/m0-setup.md). See [roadmap](docs/roadmap.md) for the four milestones and team tasks.

4 November procurement update (user-reported): one ESP32-WROOM-family 30-pin Micro-USB board, apparently CP2102; four HC-SR04 sensors; one breadboard; ten reportedly 2k resistors; assorted 20cm jumpers; one Micro-USB cable. Exact board/revision, USB chip, soldered headers, resistor values/tolerance and cable data capability remain unverified. No upload or sensor test has passed. This update supersedes the earlier unpurchased-board status above.

Physical model: flat 2D road/building map, BIN-001..004 and one manually moved truck. Keep electronics central and bins close enough for the actual 20cm wiring routes; verify reach before mounting. Local serial-to-dashboard integration comes after local sensor gates; any temporary localhost bridge/backend will be scoped before implementation and does not replace the final AWS architecture. No implementation authorized by this procurement update.

## Minimal stack

- Firmware: Arduino C++ with Espressif's Arduino-ESP32 core; Arduino IDE 2 for the first upload.
- Frontend later: React + Vite + JavaScript + Tailwind CSS; ordinary HTTP polling.
- Cloud later: JavaScript on Node.js Lambda, API Gateway HTTP API, DynamoDB, AWS IoT Core. Node.js 24 selected; reconfirm runtime support and record dependency versions at M2.
- Maps: local road graph and SVG; Dijkstra plus a simple single-truck route heuristic.
- One Git repository; no Docker, Express server, paid map APIs or database server.

## Folder ownership

`firmware/` first-sensor sketch now; `docs/` preparation and real test records now. Add `frontend/`, `cloud/` and `data/` when their milestone starts, rather than filling them with speculative implementations.

## Git workflow

Review `git status --short` and `git diff` before staging named files. Run relevant checks, then commit with an honest description. A preparation commit is not a passed hardware milestone. Commit verified milestones separately. Never add private keys, credentials or local secrets. A private GitHub repository is useful for backup but does not make committed secrets safe.

The original project brief is supplied in chat. Safety and reliability clarifications are recorded in the review; architectural direction and four milestones are preserved.
