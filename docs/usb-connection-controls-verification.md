# IoT Lab USB controls — verification

The local Node backend must be running: `npm run iot:local`. This starts API/SQLite without choosing a device. In Physical IoT Lab use Detect ports, explicitly Select a COM port, then Connect selected port. Browser controls call only the loopback backend; no Web Serial/browser hardware access or automatic arbitrary-port open. Close Arduino Serial Monitor first. Disconnect receiver stops retries and closes the port; history/calibration remain stored. After USB loss, the selected receiver retries that same path. Disconnect before choosing a different port.

## Implementation

- `server/local/manager.ts`: single-owner serialized connect/disconnect; concurrent requests rejected, port re-enumerated before opening, disconnect awaited before reconnect.
- `server/local/main.ts`: injected manager wraps proven SerialReceiver and SerialPort115200. Open completion is resolved from callback on success AND failure; this fixes a hang found during real unplug testing. Startup remains disconnected unless CLI `--port` explicitly supplied.
- `server/local/http.ts`: GET `/api/physical/serial/ports`; bounded local-origin JSON POST `/serial/connect` and `/serial/disconnect`. Existing snapshot/history/calibration routes preserved. These are loopback controls, not public production authentication.
- `SerialConnection.tsx` / PhysicalLab: Detect, unselected initial port dropdown, Connect, Disconnect, pending/error feedback, automatic connected/port/four-channel freshness status. Existing one-second polling unchanged. No firmware changes.

## Evidence

User explicitly authorized COM8 open/close tests with Serial Monitor closed and physically performed USB unplug/replug. Initial backend was the older process; only our receiver was restarted. Genuine isolated Chrome test passed Detect → explicitly select COM8 → Connect → four fresh card timestamps → Disconnect → Reconnect → advancing readings, retained histories/calibration and390px no page overflow. Screenshots: ignored `build/f1-a-e2e/usb-controls-{connected,disconnected,reconnected,mobile}.png`.

Actual unplug observation: connectedfalse, COM8 absent from detection, opening error surfaced, all four channels retained history. Duplicate Connect rejected409. A failed retry exposed a disconnect wait bug; fixed callback completion, restarted backend and retested missing-port409, unplugged Disconnect200, then repeated live button workflow after user reconnect. No sensor wiring or firmware altered. Busy-port open/retry and selected-path unplug/recovery are additionally covered by fake-port tests; we did not deliberately occupy COM8 with Arduino to create a real competing-device busy condition.

Automated non-App suite:119 passed across14 files, including2 new control/API tests and existing9 parser/receiver/SQLite/API tests. Current App suite27 tests also passed separately. An initial focused invocation additionally discovered27 archived handoff tests because it omitted the build exclusion; those duplicate archive tests are not added to the current-source total. Final checks exclude build artifacts. TypeScript/production build results are recorded in the task reply.

## Limits

This verifies USB transport controls and software persistence; it is not electrical safety, calibrated mounting accuracy, final physical map acceptance or proof of physical collection. Existing16/12cm configuration and TEST fixtures are preserved; trial calibration settings are not promoted into measured evidence. Backend must be started locally; a webpage cannot launch a stopped Node process. COM detection cannot identify every listed UART as an ESP32; the user must select the correct board. No cloud, F2/F3, deployment, commit or push.
