# Physical sensor status and safe continuation

The owner reports working ESP32 detection, upload and serial output. HC-SR04 circuit operation has **not** been validated. Hardware debugging is paused until an experienced friend assists; software work continues independently.

## Preserved sketches

- `firmware/first_sensor/first_sensor.ino`: guarded preparation sketch (`WIRING_REVIEWED=false`, unassigned GPIOs). Not verified against hardware in this audit.
- `firmware/hc_sr04_test/hc_sr04_test.ino`: preserved existing Wokwi-labelled test; hardcoded TRIG GPIO5 and ECHO GPIO25, ten samples with 100 ms spacing and a 30 ms timeout. It has **no WIRING_REVIEWED guard**. Its serial PASS means only its local sample-spread criterion, never proof of wiring safety or a passed physical gate. No upload is authorized.

Earlier preparation notes described a different GPIO18 Echo configuration and a guard absent from the actual sketch. Those notes are retained only as [historical provenance](history/first-sensor-preparation.md); do not follow their pin table or upload procedure as current instructions.

## When physical debugging resumes

1. With power disconnected, identify the exact board/revision, GPIO labels, power path, sensor labels and measured resistor values/tolerances. Review the circuit with the experienced helper/technician.
2. Verify common ground and a suitable protected Echo level. Never apply a 5V Echo directly to ESP32. Ten reportedly 2k resistors do not imply 2.2k/3.3k parts exist; divider arithmetic is not circuit approval.
3. Have a technician check the unpowered circuit and supervise voltage verification before energizing it. Ordinary meter averages do not prove safe short-pulse amplitude.
4. Only after review and explicit upload instruction, record one-sensor ruler, empty, partial, full and invalid/no-echo results. Do not expand to two or four before the preceding gate passes.

Record actual board/core/sketch version, checked wiring, expected and observed distances, validity and next action. This file contains no actual sensor measurements and approves no GPIO mapping. See [purchase and safety review](purchase-and-review.md).
