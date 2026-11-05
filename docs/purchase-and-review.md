> Current authority: Final Master Execution Prompt v1.0. Four physical bins; independent municipal simulator; Vercel + Supabase; AWS on hold. ESP32 operation is owner-reported as working. HC-SR04 testing is paused pending experienced assistance. The older M0/day-wise/USB-only/AWS procedure below is retained as historical preparation; current architecture/checkpoints are in README.md and docs/roadmap.md. Electrical safety requirements remain active. No pin mapping or upload is authorized by these notes.

# Hardware procurement and project review

Updated 4 November 2026. Current scope: four physical bins, one ESP32, one manually operated truck, flat 2D city map and separate 60-bin simulation. The original six-bin shopping plan is superseded by this inventory. No actual upload or sensor tests have passed.

## Purchased inventory (user-reported)

| Component | Quantity / status |
| --- | --- |
| ESP32-WROOM-family development board | 1; 30-pin, Micro-USB, apparently CP2102 based on the user's photo description. Exact model/revision and chip marking not independently verified |
| HC-SR04 | 4; standard 5V units expected; confirm actual labels. No spare reported |
| Breadboard | 1; size, continuity and board fit unverified |
| Resistors | 10 reportedly 2k; measure values and identify tolerance before use |
| Jumpers | M-M, M-F, F-F; 20cm; quantity and grip unverified |
| Micro-USB cable | 1; data capability unverified until COM detection |
| Adapter and multimeter | Availability not confirmed; do not assume purchased |

Use the purchased board subject to identification and inspection. Confirm soldered male headers before breadboard use; if absent, arrange skilled soldering rather than loose pin insertion. No GPIO or power mapping is approved. Record front/back markings and seller pinout/schematic. Do not buy a replacement board merely because the original preference was USB-C.

Keep ESP32/breadboard central and the four sensors close. Check actual cable paths and slack, not straight-line map distances; 20cm wires can be consumed quickly by mounting height. Avoid chains of loose extensions and keep bins removable until reach and sensing geometry are tested. Labels BIN-001..004 must match software identities. One manual truck needs no motor control hardware.

## Resistor assessment: no wiring approval yet

Do not assume the original 2.2k/3.3k parts are available. Two equal 2k resistors divide a nominal 5V Echo to 2.5V, which is too close to the classic ESP32's minimum HIGH threshold (0.75 times its supply, approximately 2.475V at 3.3V) to recommend as a reliable design. Supply/resistor tolerances can remove that small margin.

A candidate using only verified equal 2k parts is 4k above the junction (two in series) and 6k below it (three in series), giving nominally 3.0V at a 5V Echo. That uses five resistors per sensor: ten parts cover two sensors only, and four sensors require twenty (ten more of the same verified value). Evaluate actual supply, tolerance, output HIGH level and wiring before approval; this calculation is not a tested circuit. A three-part 2k/4k arrangement gives 3.33V nominal with less upper-voltage margin and is not our default recommendation. We will choose the simplest verified option before the one-sensor wiring step.

Source: [Espressif ESP32 electrical characteristics](https://documentation.espressif.com/esp32_datasheet_en.pdf). Borrow a multimeter and technician assistance before any sensor circuit power-on. Resistor values/tolerances and soldered headers remain physical checks, not software checks.

## The important physical-model change

Choose the four bins based on sensing tests rather than appearance alone. HC-SR04 is specified for roughly 2-400 cm and has a sensing cone; narrow walls, sloping garbage and objects near the transducers can cause wrong readings. The manufacturer recommends large, smooth targets, so miniature-bin performance needs direct testing.

Starting geometry to trial, not a guaranteed minimum: about 15-20 cm from sensor face to empty bottom, a generous opening that fits the approximately 45 mm sensor, and a defined full line at least 4-5 cm below the transducers. Test one bin with a flat cardboard target at several heights before choosing all four. A raised sensor support can add clearance. Do not block the two metal transducers. Keep final supports adjustable.

At 80% fill, the distance is emptyDistance - 0.8 * (emptyDistance - fullDistance). This percentage refers to calibrated usable height, not measured garbage volume or mass.

Source: [HC-SR04 manufacturer datasheet hosted by SparkFun](https://cdn.sparkfun.com/datasheets/Sensors/Proximity/HCSR04.pdf). Clone specifications/behavior may differ.

## Electrical rules to lock before wiring

Every Echo must use its own reviewed divider; never connect 5V Echo directly to a GPIO. The upper network goes from Echo to the GPIO junction; the lower network goes from that junction to common GND. Network values remain provisional as assessed above. Sensor and ESP32 grounds must connect. TRIG will use an approved output GPIO after exact-board review. No final pin-to-pin instructions yet.

- Use only one approved power input to the board. Do not connect an adapter to VIN/5V while laptop USB is attached unless the exact board documentation explicitly permits that arrangement.
- M0 intended arrangement, subject to actual schematic review: laptop USB powers board; documented USB-derived 5V header powers one sensor; common GND. Do not assume a pin labeled VIN provides USB power out.
- Four sensors later: approve the complete board/header/cable power path and measure sensor-end supply under load. Do not casually introduce a second supply or connect positive rails together.
- Breadboard center: each group of five holes on one side connects internally; the center trench separates sides. Long power rails may split midway and opposite-side rails are not automatically connected. Verify with an unpowered continuity test. Printed red/blue lines do not enforce polarity.
- Red = 5V, black = GND, yellow = TRIG, blue = protected Echo, with BIN-001..004 tags at both ends. Use a separate color for 3V3 if used.
- Keep bare leads from touching, route each signal beside a ground where practical, secure extensions against pulling, and keep Wi-Fi antenna area clear. Never chain numerous loose jumpers for the final demo.
- Power off before changes. Never use resistance/continuity mode on an energized circuit; never put a meter in current mode across power rails.
- A technician checks rail continuity/shorts and divider topology unpowered, then supervises voltage checks using an approved source. An ordinary meter may miss short Echo pulses: verify divider behavior with a supervised static test or oscilloscope if available. A meter average is not proof of safe pulse amplitude.

No board-specific GPIO table is approved yet. Reserve four output-capable TRIG pins and four valid input pins, avoiding flash/PSRAM, boot strapping and programming pins for the chosen variant. Some classic ESP32 GPIOs are input-only; these may serve Echo but cannot drive TRIG.

## Software and integration clarifications

1. **Timing:** Fire only one sensor at a time. Start with at least 60ms between any triggers, including different sensors. Five samples across four sensors take at least about 1.2 seconds plus processing; use a tentative 3-second full cycle, then measure it. A cycle means one filtered update per bin, not each raw ping. Require at least three valid samples out of five. Confirm timing/cross-talk physically before reducing intervals.
2. **Invalid readings:** Reject out-of-range raw measurements before clamping a valid calibrated fill percentage. Use `distanceCm: null`, `fillPct: null` for invalid data, plus an explicit status. A displayed last-good reading must show its age. Treat sensor health, connectivity and collection demand as separate states; errors never erase existing jobs.
3. **Threshold ownership:** Firmware supplies local status for M1; cloud independently validates and owns authoritative jobs. Keep one versioned threshold/calibration configuration. Count three consecutive distinct, fresh, valid cycles; duplicates do not count, invalid cycles reset qualification streaks. Urgent has its own >=90% streak. Latch an active job through noisy readings; clear it only through the collection lifecycle.
4. **One active job:** Use conditional database writes, and transactions where job and bin state change together. A non-atomic read-then-create check can create duplicates. Proposed states: OPEN -> ASSIGNED -> PENDING_VERIFICATION -> VERIFIED/CLOSED. Repeated pickup clicks return the same pending state.
5. **Fresh pickup proof:** Store the pickup-request time and latest measurement identity. Require a distinct valid measurement captured after confirmation, below 20%, and recent enough for the freshness window. Server arrival time alone is insufficient: delayed/replayed pre-pickup readings must not close jobs. Synchronize device clock for production telemetry; carry capture time, uptime, boot ID and cycle sequence. If ordering/freshness cannot be proved, remain pending. One fresh reading is the stated minimum; more may be required if physical tests show noisy empty readings.
6. **Message identity:** Add `schemaVersion`, `mode`, `deviceId`, random boot/session ID, sequence, capture time, uptime and calibration version. Each bin includes stable ID, validity/status, valid sample count, distance and fill. Sequence alone restarts after a reboot. Reject duplicate/out-of-order telemetry atomically and validate the full four-bin batch before mutation. Maintain per-bin dedup state so retry after a partial batch failure does not count bins twice.
7. **Cloud consistency:** Keep per-device processing serialized initially, or implement ordering-aware updates; retries must not lose a valid qualification cycle. Do not count every retry as another cycle. Backend checks device/bin allowlists and schema, numeric bounds and timestamps. An invalid sensor may send a fresh message while the bin remains unhealthy.
8. **Connectivity:** Local sampling must continue while Wi-Fi/MQTT is down; bounded reconnect attempts/backoff rather than infinite blocking loops. Synchronize time before TLS certificate validation; never disable certificate verification. Publish current snapshots on reconnect; historical queued readings must not affect current alerts or pickup proof. Set MQTT buffer size for the actual serialized four-bin message and check publish failures.
9. **Dashboard freshness:** Poll every 5 seconds initially; start with a configurable 20-second stale limit for 3-second publishing and tune from evidence. Show errors, last good value/age and pending pickup distinctly. Confirm button means pickup claimed, never automatic empty verification.
10. **Roads and simulation:** Graph distances follow roads, include return to depot, and use explicit units. Physical model centimetres do not justify real-city litres/time claims. Compare identical demand, depot, graph and single-truck constraints under a fixed seed and stated baseline. Document speed, service time and fuel assumptions; heuristic savings can be zero or negative. Do not claim globally optimal routes or measured real fuel savings.

Datasheet timing source: [HC-SR04](https://cdn.sparkfun.com/datasheets/Sensors/Proximity/HCSR04.pdf). The remaining numeric settings above are initial engineering choices to test, not device guarantees.

## AWS and Git decisions missing from the brief

- Account owner controls billing; enable MFA on root, do not create root access keys, and use a scoped developer identity. Use one agreed AWS region for IoT, Lambda, DynamoDB and API Gateway; review actual account eligibility and region-specific pricing before deployment.
- An ordinary AWS budget alert is a notification, not an automatic hard spending cap. Check the actual account plan and credits, configure a small budget and email recipient, short log retention and API throttling. No paid resources are deployed in M0.
- Explicitly choose dashboard hosting: localhost on the demo laptop is the simplest initial choice. Public hosting is optional later. The browser talks to API Gateway; it never receives IoT private keys or AWS administrator credentials.
- Protect write endpoints server-side. CORS and a Vite `.env`/API key embedded in JavaScript do not authenticate a user. For the classroom demo, agree a small backend-validated operator login/token; use HTTPS, keep the secret out of bundles/Git, and restrict CORS to the intended origin. No need for an elaborate user system.
- One ESP32 uses one IoT device certificate with permission only for its own client ID and telemetry topic; it represents four bins, not four separate AWS devices. Keep private key material in ignored local files and out of screenshots/logs.
- Before GitHub upload, inspect staged files and run secret checks. Use a private repository and checkpoint each verified milestone. If a key is exposed, revoke/rotate it; deleting the visible file alone is insufficient.
- Keep a demo failure path: show honest offline/last-seen state and local serial readings. A recorded demo may be labeled as a recording, never presented as live cloud success. Record resource names and cleanup steps when M2 deploys.

Sources: [AWS Free Tier](https://aws.amazon.com/free/), [AWS Budgets](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html), [AWS IoT pricing](https://aws.amazon.com/iot-core/pricing/). Verify account-specific eligibility and complete service costs at M2; no zero-cost promise is made.
