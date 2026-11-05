> Historical snapshot preserved from the working tree before the municipal-platform audit. Superseded by the approved Final Master Execution Prompt v1.0 and current README/roadmap. This is not active architecture or wiring/upload guidance.

# One HC-SR04 test preparation

User reports prior ESP32 Dev Module upload, COM8 and Serial Monitor success. This session does not independently verify those results. Board currently disconnected; no serial access, upload or physical test performed. M0 remains incomplete.

Open firmware/hc_sr04_test/hc_sr04_test.ino. Original first_sensor sketch is preserved. Uses only Arduino core, GPIO5 TRIG, GPIO18 protected ECHO, 115200 baud, a nominal 500ms start-to-start sampling interval, bounded 25ms Echo timeout and explicit invalid output. WIRING_REVIEWED defaults false and prevents sensor pin setup/pulses until physical review; compilation does not approve wiring.

## Wiring review before connection

Unplug all supplies. Verify actual GPIO labels, soldered headers, sensor pin labels, resistor values/tolerance, rail continuity and absence of shorts with a multimeter/technician. Board power header direction/capacity is board-dependent. Confirm the actual board can provide the required USB-derived 5V to one sensor; do not assume a VIN label proves it. GPIO5 is a classic ESP32 strapping pin: do not add a pull-up/down to TRIG, and review any startup problem with power off. No final physical wiring verification has occurred remotely.

| Connection | Destination |
| --- | --- |
| HC-SR04 VCC | Verified board USB-derived 5V header, only after checking the actual board power path |
| HC-SR04 GND | ESP32 GND / common ground rail |
| HC-SR04 TRIG | GPIO5 (actual GPIO label, not header position 5) |
| HC-SR04 ECHO | Two measured 2k resistors in series (4k upper leg), then junction J |
| Junction J | GPIO18 |
| Junction J | Three measured 2k resistors in series (6k lower leg), then common GND |

Five resistors total, with no other connections to the series midpoints. Nominal junction voltage: 5V * 6k / (4k + 6k) = 3.0V. Keep divider near ESP32. Confirm actual resistor tolerance, supply and safe output range before energizing. Ten purchased resistors suffice for this one-sensor test, subject to verification.

Do not substitute a pair of equal 2k resistors: 2.5V nominal is close to the classic ESP32 minimum HIGH level of 0.75 * VDD (2.475V at 3.3V); tolerances can make detection unreliable. Do not connect raw 5V Echo directly. Source: https://documentation.espressif.com/esp32_datasheet_en.pdf

Breadboard groups of five holes connect on each side of the center gap; opposite sides do not connect. Power rails can split. Keep divider resistors in separate intended nodes, not shorted in one connected row. A normal multimeter average may miss short Echo peaks; use a technician-approved static divider check or oscilloscope where available. Disconnect power before rewiring. Never use continuity mode on a powered circuit or current mode across power rails.

## Later upload and ruler test

1. Finish physical review above. Only then change WIRING_REVIEWED to true and save.
2. Arduino IDE: open this sketch, select esp32 by Espressif Systems -> ESP32 Dev Module; retain the previously working board/upload settings and core 3.3.12. Click Verify with hardware disconnected if desired.
3. Connect the approved circuit through the board's USB only. Do not also apply external VIN/5V power. Select COM8 only if it is the actual current board port; its number can change.
4. Click Upload. After successful upload, open Serial Monitor at 115200 baud; press EN/reset once if necessary. A DISABLED message means the review flag was not enabled in the uploaded sketch.
5. Aim at broad flat cardboard at about 5, 10 and 20cm, measured from transducer face; record at least ten readings per position. Expect approximately the ruler distance every 500ms, not a guaranteed precision. Keep clear of the blind zone and nearby walls.
6. Aim toward open space for a no-echo test: expect TIMEOUT or explicit invalid status, never a fabricated zero. Some modules respond differently; report observed output. Do not unplug signal/power wires live. For disconnection testing, power off and review isolated loose leads before repowering.

Report upload outcome, exact error if any, actual ruler distances and serial lines. Stop at one sensor until evidence is reviewed. No sensor or upload success is claimed by this preparation.

## Offline verification in this session

No Arduino CLI in PATH, Arduino IDE at the standard inspected locations, or standard LocalAppData Arduino15 package directory was accessible to the preparation environment. This does not disprove the user's installed IDE/core on their testing computer. Target compilation is unverified; use Arduino IDE Verify above. No new tools installed.
