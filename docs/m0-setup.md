# M0: first sensor preparation

## Before plugging in the board

Buy/identify the actual board. Send clear front/back photos, module marking, board model/revision, power pin labels and seller schematic/link. Also report sensor label/pin order, bin internal depth/opening, intended wire lengths and multimeter/technician availability. Do not connect sensors yet. GPIOs remain unassigned until review.

## Toolchain

Use Arduino IDE 2 and Espressif's Arduino-ESP32 package for M0; no extra sensor library is required.

1. Install Arduino IDE from [Arduino software](https://www.arduino.cc/en/software/).
2. In File -> Preferences -> Additional Boards Manager URLs, add `https://espressif.github.io/arduino-esp32/package_esp32_index.json`.
3. Open Boards Manager, search `esp32`, install the stable **esp32 by Espressif Systems** package. Record the installed version. Do not change versions during the demonstration build without a reason.
4. Select the board matching the purchased hardware. Classic WROOM and S3 are different targets; do not guess settings from USB shape. For an S3, confirm which USB port and serial settings apply.
5. With no breadboard/sensor connections, physically inspect the board then connect only the USB data cable. Select its COM port. If absent, try a known data cable and inspect Windows Device Manager; install only the USB-UART manufacturer's driver matching the identified chip.
6. Open `firmware/first_sensor/first_sensor.ino`. Leave `WIRING_REVIEWED = false` and pins at `-1`. Verify/compile for the selected board. Upload yourself only after identifying the board. Open Serial Monitor at 115200 baud. Expect a preparation message and `DISABLED` with no sensor pulses.

Official installation reference: [Espressif Arduino installation](https://docs.espressif.com/projects/arduino-esp32/en/latest/installing.html).

Pre-M0 installation status (user-confirmed): Arduino IDE 2.3.10 and the official **esp32 by Espressif Systems v3.3.12** installed successfully with no installation errors. Keep these versions fixed unless troubleshooting requires a change. Installation success does not verify compilation, upload or hardware operation.

Exact board selection, board-specific USB driver assessment, GPIO mapping, compilation and upload remain pending. No Arduino CLI or PlatformIO executable was found in PATH during the earlier environment check; neither is required for the Arduino IDE workflow. No additional sensor library is required for the first-sensor sketch.

## One-sensor connection template: NOT approved until board review

Do not perform this connection step until we replace the placeholders with the exact board GPIO/power labels and a technician reviews it. Unplug USB and all supplies before assembly.

| Sensor / divider point | Destination after approval |
| --- | --- |
| HC-SR04 VCC | Board's verified USB-derived 5V output (only if documented and approved) |
| HC-SR04 GND | Breadboard common GND connected to board GND |
| HC-SR04 TRIG | Approved output-capable GPIO, currently UNASSIGNED |
| HC-SR04 ECHO | 2.2k resistor, other end to divider junction |
| Divider junction | Approved input GPIO, currently UNASSIGNED |
| Divider junction | 3.3k resistor, other end to common GND |

The GPIO receives only the junction voltage, never the unprotected Echo. See the purchase review for breadboard groups, rail splits and safe meter use.

After unpowered checks and supervised voltage verification, enter the approved numeric GPIOs and set `WIRING_REVIEWED = true` in the sketch. This flag documents a human review; software cannot detect a wrong wire. Uploading with the wrong settings is not safe merely because compilation succeeds.

## Actual M0 evidence to collect

Use a flat cardboard target and ruler measured from the transducer face. Record at least ten readings at each of approximately 5, 10 and 15 cm where geometry allows. Compare actual differences and repeated spread; do not assume advertised millimetre accuracy in a miniature bin. Initial practical target: repeatable within about 1 cm on a flat target; investigate larger errors before expansion.

Then test the trial bin empty, partially filled and near its chosen full line. Keep the full line clear of the blind zone. For no-echo/invalid behavior, point toward open space; to test disconnection, power off first, disconnect the sensor, then repower only after checking loose ends cannot short. No-echo must print null and a status, never 0 cm or 0% fill. Some clones fail differently, so record observed behavior.

Expected serial output after enabling: one JSON distance record per second, valid or explicit invalid status. This raw sketch deliberately has no calibrated fill percentages, filtering, alert logic, Wi-Fi or cloud features; those belong to M1/M2.

Report exact board/core version, configured GPIOs, wiring-review result, ruler distances and serial readings. M0 passes only after actual plausible repeatable measurements, including the trial-bin and failure cases. Do not add three/six sensors yet.

## Debug in this order

1. No COM port: data cable, USB port, Device Manager, matching driver.
2. No serial text: correct COM port, baud, USB serial settings and reset; close other serial programs.
3. Disabled message: expected until model/pins/wiring are reviewed.
4. No echo: power off; recheck labels, ground, divider resistor positions, GPIO settings and unobstructed target. Do not bypass the divider.
5. Wrong/unstable distance: test a broad flat target on short wires outside the bin; compare against ruler; try spare sensor after unpowered swap.
6. Reboots/hot components/smell: disconnect power immediately; technician inspection before reuse. Do not repeatedly repower an uncertain circuit.
