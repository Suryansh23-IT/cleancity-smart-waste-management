# Purchase checklist and whole-project review

Reviewed 3 November 2026. Architecture and four milestones are suitable for the demonstration. These practical clarifications reduce failure risk; no plan can guarantee zero errors or a short-free circuit without physical inspection.

## Board decision before buying

Prefer a full-size, pre-soldered classic ESP32-WROOM-32E development board, with onboard PCB antenna, documented pinout/schematic and USB-to-UART programming. A documented USB-C variant is a good budget choice; connector type alone is not a model identifier or proof of quality. At least 4 MB flash is sufficient for this planned firmware. Prefer an exact seller part number and return/replacement option.

| Option | Cost comparison | Six-sensor fit and limitations |
| --- | --- | --- |
| Documented classic WROOM-32/32E full-size USB-C dev board | Budget choice; seller-specific quote needed | Enough GPIO on suitable 30/38-pin layouts, established Arduino support, 2.4 GHz Wi-Fi; clone power circuits/pinouts vary, inspect exact unit |
| Espressif ESP32-DevKitC V4 with WROOM-32E | Reference option; Evelta listing observed at about INR 948 incl. GST, reconfirm before buying | Documented pinout and power schematic, USB-UART, 2.4 GHz Wi-Fi; official reference uses Micro-USB; some pins reserved/input-only |
| ESP32-S3-DevKitC-1 with onboard antenna | Usually a higher-cost full-size option; obtain exact module/revision quote | Ample GPIO and 2.4 GHz Wi-Fi; verify USB connector/port and flash/PSRAM-reserved pins; requires its own mapping, not the classic ESP32 mapping |

USB-C is preferred, but choose documented power/GPIO information over an unidentified board. No need to pay for extra PSRAM, displays, camera or external antenna. Avoid selecting a tiny C3/SuperMini merely because it says ESP32: twelve independent sensor signals leave little room on small layouts.

All options need a verified 5V sensor supply and six protected Echo inputs. Do not assume the 3V3 regulator powers 5V sensors. Do not assume the USB connector, VIN/5V pin direction or current capacity is identical across boards.

Sources: [Espressif DevKitC V4 guide](https://docs.espressif.com/projects/esp-dev-kits/en/latest/esp32/esp32-devkitc/user_guide.html), [reference schematic](https://dl.espressif.com/dl/schematics/esp32_devkitc_v4-sch.pdf), [S3 guide](https://documentation.espressif.com/esp-dev-kits/en/latest/esp32s3/esp32-s3-devkitc-1/user_guide_v1.0.html), [Evelta listing](https://evelta.com/esp32-devkitc-32e-esp32-wroom-32e-development-board-4mb-flash-pcb-antenna/). Prices, revisions and stock are not guaranteed shop quotes.

## Buy / arrange today

| Item | Quantity | Purchase check |
| --- | --- | --- |
| Suitable ESP32 development board | 1; optional identical spare if budget permits | USB programming, pre-soldered headers, readable pin labels, onboard antenna, exact model/schematic |
| Standard HC-SR04 | 7 | Six active plus one spare; inspect VCC/TRIG/ECHO/GND labels and straight headers; request a sensor demonstration if possible |
| 830-point breadboard | 1 minimum | Try board fit; wide boards can cover all useful holes. A second breadboard is a reasonable fallback if needed for usable access and six dividers |
| Jumper wires | Assorted M-M, M-F and some F-F; approximately 60-80 pieces total | Firm-fitting connectors; correct lengths for the real model; include 40-60 cm M-F extensions where needed, rather than many chained short jumpers |
| 2.2 kohm and 3.3 kohm resistors | 10 of each, 1/4 W; 1% preferred | Six divider pairs plus spares; keep values in labeled bags |
| USB data cable matching actual board | 1; spare if available | A charging-only cable cannot program; ask for a tested data cable |
| Regulated 5V USB supply | 1, reputable 1A minimum / 2A preferred | Fixed 5V operation; adapter rating alone does not validate board/header/breadboard current paths |
| Multimeter with probes | Borrow from college, or buy if borrowing unavailable | Required access before new-circuit power-on; arrange a lab technician |
| Ruler, labels, ties, insulation | 1 small set | Heat-shrink is optional for suitably insulated extensions, not a substitute for firm contacts |
| Trial dustbin and removable support | 1 first, then six matching bins | Sensor fit and repeatable readings must be proven before permanent model construction |
| Miniature bins | 6 total | Validate one trial bin before permanent mounting; match the approved dimensions across all six |
| Manually moved toy trucks | 2 | No motors, driver boards, GPS or batteries required for truck automation |
| Model materials | As planned | Keep sensor supports, bins and electronics removable |

Shop handover: ask for a full-size, pre-soldered ESP32-WROOM-32E dev board with at least 4MB flash and onboard PCB antenna; a documented WROOM-32/32D dev board is an acceptable fallback subject to exact-board review. USB-C preferred, matching data cable essential. Confirm the actual module AND development-board model/revision, USB connector, USB-UART chip marking (CP210x/CH340/CH341 or other documented chip), readable pinout/schematic and at least six usable output GPIOs plus six separate input GPIOs after excluding reserved pins. Header count alone does not establish usable GPIO count. If choosing S3, identify native USB versus USB-UART ports explicitly. Do not install drivers at the shop from an unknown download.

Check the board physically fits the breadboard with accessible connection holes; do not force pin rows to fit. For wires, a practical approximately 80-piece assortment is 40 M-F, 30 M-M and 10 F-F, including the required longer lengths, with firm connectors and intact insulation. HC-SR04 has male headers, so female ends are needed at the sensors. Take board/sensor photos, seller details and a receipt before leaving. Keep all final GPIO assignments and power wiring pending actual-board review. No circuit assembly or sensor power-on today.

Six nominal 15mA sensors total about 90mA; ESP32 Wi-Fi adds transient demand. This is a preliminary estimate, not measured power approval. Start with short wires and one sensor; evaluate power path and voltage again at three/six and with Wi-Fi.

## The important physical-model change

Do not buy six tiny narrow bins based on appearance alone. HC-SR04 is specified for roughly 2-400 cm and has a sensing cone; narrow walls, sloping garbage and objects near the transducers can cause wrong readings. The manufacturer recommends large, smooth targets, so miniature-bin performance needs direct testing.

Starting geometry to trial, not a guaranteed minimum: about 15-20 cm from sensor face to empty bottom, a generous opening that fits the approximately 45 mm sensor, and a defined full line at least 4-5 cm below the transducers. Test one bin with a flat cardboard target at several heights before choosing all six. A raised sensor support can add clearance. Do not block the two metal transducers. Keep final supports adjustable.

At 80% fill, the distance is emptyDistance - 0.8 * (emptyDistance - fullDistance). This percentage refers to calibrated usable height, not measured garbage volume or mass.

Source: [HC-SR04 manufacturer datasheet hosted by SparkFun](https://cdn.sparkfun.com/datasheets/Sensors/Proximity/HCSR04.pdf). Clone specifications/behavior may differ.

## Electrical rules to lock before wiring

Every Echo must use this divider, located near the ESP32:

`sensor ECHO -> 2.2k resistor -> junction -> ESP32 input`

`junction -> 3.3k resistor -> common GND`

At a 5V Echo, the junction is nominally 5 * 3.3 / (2.2 + 3.3) = 3.0V. Do not reverse the resistors. Each sensor gets its own pair. Sensor grounds and ESP32 ground must connect. TRIG goes to an approved output GPIO; direct 3.3V trigger normally works with the HC-SR04 TTL input, but verify the purchased module if it does not respond. Never increase ESP32 GPIO voltage to make a trigger work.

- Use only one approved power input to the board. Do not connect an adapter to VIN/5V while laptop USB is attached unless the exact board documentation explicitly permits that arrangement.
- M0 intended arrangement, subject to actual schematic review: laptop USB powers board; documented USB-derived 5V header powers one sensor; common GND. Do not assume a pin labeled VIN provides USB power out.
- Six sensors later: approve the complete board/header/cable power path and measure sensor-end supply under load. Do not casually introduce a second supply or connect positive rails together.
- Breadboard center: each group of five holes on one side connects internally; the center trench separates sides. Long power rails may split midway and opposite-side rails are not automatically connected. Verify with an unpowered continuity test. Printed red/blue lines do not enforce polarity.
- Red = 5V, black = GND, yellow = TRIG, blue = protected Echo, with BIN-001..006 tags at both ends. Use a separate color for 3V3 if used.
- Keep bare leads from touching, route each signal beside a ground where practical, secure extensions against pulling, and keep Wi-Fi antenna area clear. Never chain numerous loose jumpers for the final demo.
- Power off before changes. Never use resistance/continuity mode on an energized circuit; never put a meter in current mode across power rails.
- A technician checks rail continuity/shorts and divider topology unpowered, then supervises voltage checks using an approved source. An ordinary meter may miss short Echo pulses: verify divider behavior with a supervised static test or oscilloscope if available. A meter average is not proof of safe pulse amplitude.

No board-specific GPIO table is approved yet. Reserve six output-capable TRIG pins and six valid input pins, avoiding flash/PSRAM, boot strapping and programming pins for the chosen variant. Some classic ESP32 GPIOs are input-only; these may serve Echo but cannot drive TRIG.

## Software and integration clarifications

1. **Timing:** Fire only one sensor at a time. Start with at least 60ms between any triggers, including different sensors. Five samples across six sensors take at least about 1.8 seconds plus processing; use a tentative 3-second full cycle, then measure it. A cycle means one filtered update per bin, not each raw ping. Require at least three valid samples out of five. Confirm timing/cross-talk physically before reducing intervals.
2. **Invalid readings:** Reject out-of-range raw measurements before clamping a valid calibrated fill percentage. Use `distanceCm: null`, `fillPct: null` for invalid data, plus an explicit status. A displayed last-good reading must show its age. Treat sensor health, connectivity and collection demand as separate states; errors never erase existing jobs.
3. **Threshold ownership:** Firmware supplies local status for M1; cloud independently validates and owns authoritative jobs. Keep one versioned threshold/calibration configuration. Count three consecutive distinct, fresh, valid cycles; duplicates do not count, invalid cycles reset qualification streaks. Urgent has its own >=90% streak. Latch an active job through noisy readings; clear it only through the collection lifecycle.
4. **One active job:** Use conditional database writes, and transactions where job and bin state change together. A non-atomic read-then-create check can create duplicates. Proposed states: OPEN -> ASSIGNED -> PENDING_VERIFICATION -> VERIFIED/CLOSED. Repeated pickup clicks return the same pending state.
5. **Fresh pickup proof:** Store the pickup-request time and latest measurement identity. Require a distinct valid measurement captured after confirmation, below 20%, and recent enough for the freshness window. Server arrival time alone is insufficient: delayed/replayed pre-pickup readings must not close jobs. Synchronize device clock for production telemetry; carry capture time, uptime, boot ID and cycle sequence. If ordering/freshness cannot be proved, remain pending. One fresh reading is the stated minimum; more may be required if physical tests show noisy empty readings.
6. **Message identity:** Add `schemaVersion`, `mode`, `deviceId`, random boot/session ID, sequence, capture time, uptime and calibration version. Each bin includes stable ID, validity/status, valid sample count, distance and fill. Sequence alone restarts after a reboot. Reject duplicate/out-of-order telemetry atomically and validate the full six-bin batch before mutation. Maintain per-bin dedup state so retry after a partial batch failure does not count bins twice.
7. **Cloud consistency:** Keep per-device processing serialized initially, or implement ordering-aware updates; retries must not lose a valid qualification cycle. Do not count every retry as another cycle. Backend checks device/bin allowlists and schema, numeric bounds and timestamps. An invalid sensor may send a fresh message while the bin remains unhealthy.
8. **Connectivity:** Local sampling must continue while Wi-Fi/MQTT is down; bounded reconnect attempts/backoff rather than infinite blocking loops. Synchronize time before TLS certificate validation; never disable certificate verification. Publish current snapshots on reconnect; historical queued readings must not affect current alerts or pickup proof. Set MQTT buffer size for the actual serialized six-bin message and check publish failures.
9. **Dashboard freshness:** Poll every 5 seconds initially; start with a configurable 20-second stale limit for 3-second publishing and tune from evidence. Show errors, last good value/age and pending pickup distinctly. Confirm button means pickup claimed, never automatic empty verification.
10. **Roads and simulation:** Graph distances follow roads, include return to depot, and use explicit units. Physical model centimetres do not justify real-city litres/time claims. Compare identical demand, depot, graph and two-truck constraints under a fixed seed and stated baseline. Document speed, service time and fuel assumptions; heuristic savings can be zero or negative. Do not claim globally optimal routes or measured real fuel savings.

Datasheet timing source: [HC-SR04](https://cdn.sparkfun.com/datasheets/Sensors/Proximity/HCSR04.pdf). The remaining numeric settings above are initial engineering choices to test, not device guarantees.

## AWS and Git decisions missing from the brief

- Account owner controls billing; enable MFA on root, do not create root access keys, and use a scoped developer identity. Use one agreed AWS region for IoT, Lambda, DynamoDB and API Gateway; review actual account eligibility and region-specific pricing before deployment.
- An ordinary AWS budget alert is a notification, not an automatic hard spending cap. Check the actual account plan and credits, configure a small budget and email recipient, short log retention and API throttling. No paid resources are deployed in M0.
- Explicitly choose dashboard hosting: localhost on the demo laptop is the simplest initial choice. Public hosting is optional later. The browser talks to API Gateway; it never receives IoT private keys or AWS administrator credentials.
- Protect write endpoints server-side. CORS and a Vite `.env`/API key embedded in JavaScript do not authenticate a user. For the classroom demo, agree a small backend-validated operator login/token; use HTTPS, keep the secret out of bundles/Git, and restrict CORS to the intended origin. No need for an elaborate user system.
- One ESP32 uses one IoT device certificate with permission only for its own client ID and telemetry topic; it represents six bins, not six separate AWS devices. Keep private key material in ignored local files and out of screenshots/logs.
- Before GitHub upload, inspect staged files and run secret checks. Use a private repository and checkpoint each verified milestone. If a key is exposed, revoke/rotate it; deleting the visible file alone is insufficient.
- Keep a demo failure path: show honest offline/last-seen state and local serial readings. A recorded demo may be labeled as a recording, never presented as live cloud success. Record resource names and cleanup steps when M2 deploys.

Sources: [AWS Free Tier](https://aws.amazon.com/free/), [AWS Budgets](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html), [AWS IoT pricing](https://aws.amazon.com/iot-core/pricing/). Verify account-specific eligibility and complete service costs at M2; no zero-cost promise is made.
