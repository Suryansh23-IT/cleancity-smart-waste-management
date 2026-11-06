# Local four-channel Physical IoT demo

The real four-channel USB serial → Node → SQLite → Physical IoT Lab pipeline has been demonstrated with user-connected hardware. Final physical acceptance is incomplete: dustbin purchase/mounting, measured calibration and repeatability/failure testing remain pending. No independent electrical verification is implied. The receiver is intentionally stopped; stored readings remain local.

## Start without hardware

Use installed Node 24.11.0. `serialport@13.0.0` is the only added direct dependency. SQLite is built into Node and currently emits an experimental warning on this runtime.

From the project directory:

```powershell
npm run iot:local
```

Without `--port`, this starts only the loopback API and SQLite. It never selects or opens a serial device. It listens at `127.0.0.1:8787` when started; the receiver is stopped at this checkpoint.

Start the frontend with `npm run dev` and use the localhost address printed by Vite. Select Physical IoT Lab. Vite proxies only `/api/physical` to the local API; historical cloud adapters are not used. No internet service is needed at runtime after dependencies are installed.

## Real serial access — authorization required

Before live access, confirm: exact COM port from Arduino Tools → Port; Serial Monitor is closed; four sensors remain connected and reportedly operating; safe Echo level shifting has been reviewed; and permission to open that exact port. Do not change wiring, GPIO arrays or firmware. Opening a serial port can reset some development boards; startup banners are ignored. This does not authorize further physical manipulation without appropriate protection review.

Listing ports does not open them:

```powershell
npm run iot:ports
```

Only after authorization, stop the existing no-device receiver using its own terminal's Ctrl+C (not the frontend), then run the following with the confirmed port, not this example blindly:

```powershell
npm run iot:local -- --port COM7
```

115200 baud is fixed. The receiver sends no serial commands, never silently changes ports, retries the same selected COM path every three seconds and reports busy/open/disconnect errors. If Windows changes the port number, stop and explicitly select the new confirmed port.

## Data and calibration

- Database: `.local/physical-demo.sqlite`, plus SQLite WAL/SHM sidecars. All are ignored by Git. Do not delete them to restart the service.
- Four identities: BIN-001…004, sensor numbers 1…4. Executable TRIG/ECHO pin arrays are `{5,26,19,32}` and `{18,27,21,33}`; the diagnostic firmware header matches these arrays. This records the demonstrated sketch, not approval to rewire another board.
- A 512-character bounded framer handles split chunks, CRLF, banners and malformed records. At most four latest channel observations are retained per incoming chunk and pending flush; writes coalesce at one-second intervals.
- Accepted measurements have matching channel/pins, plausible pulse and 2–400 cm distance. NO ECHO is stored distinctly. Inconsistent measurements become invalid rather than an invented distance.
- Latest observation and last valid observation are stored separately. Invalid data never overwrites last-valid history with a successful reading. Restart preserves original receipt times and starts disconnected.
- History retention: up to 10,000 rows/channel and 24 hours, cleaned in bounded transactions when channel samples are written. API history is limited to 100 rows, snapshot history to 30.
- UI polls every second; local observations are stale after ten seconds without a new accepted channel observation. Tune the threshold only after measuring actual cadence. Receiver connection and channel validity are independent.
- Calibration: enter measured empty distance and usable depth for that sensor mounting. Full distance = empty distance − usable depth and must be at least 2 cm. Save persists configuration. Subsequent readings calculate clamped usable-height fill; historical records retain their originally stored values. Fill is not mass or measured garbage volume.
- Keep BIN-001 (or the actual selected channel) calibrated for the real bin. Other channels can show valid distances with no fill percentage. Do not copy dimensions to all four.

API: GET `/api/physical`, GET `/api/physical/health`, GET `/api/physical/history/BIN-001?limit=30`, GET/PUT `/api/physical/calibration/BIN-001`. Calibration writes require local host/origin, JSON, bounded body and valid measurements. There is no public ingest/replay endpoint and no fixture mode in the running receiver. SQLite errors are surfaced rather than silently claiming storage success.

## Verification and rollback

Final regression results are recorded in `docs/milestone-checkpoint-verification.md`. Earlier isolated headless Chrome verified the real no-device API through the Vite proxy, four empty cards/disconnected status, invalid calibration rejection and 390px layout. Later live checks observed fresh real readings on all four channels, persisted history and Lab display. Receiver restart restored incoming readings while retaining earlier history. These are prior-session observations, not new hardware testing during the Git checkpoint. Generated captures and results remain excluded from Git.

The user confirmed the selected serial port, closed Serial Monitor, connected hardware and reported safe Echo protection. The receiver read existing diagnostics at 115200 baud; no firmware upload or measurement-logic change was performed. A connected port with stale samples was observed and distinguished from fresh telemetry. Local SQLite now contains genuine observations; it is preserved locally and excluded from this commit. Fill percentages remain unavailable until measured calibration.

Offline tests use explicitly labeled prerecorded fixtures, mocked serial ports, temporary SQLite files and ephemeral loopback HTTP servers. They are not physical evidence. Browser checks use a fresh isolated profile against the no-device API, checking four empty cards, disconnected state, invalid calibration rejection and desktop/mobile layout. No simulated municipal values are injected into physical monitoring.

D4 is partial: real four-channel transport/storage/display and receiver restart were observed. Pending: mounted-bin measurements against a ruler, independent channel/target checks, measured empty/depth calibration, empty/partial/full repeatability, no echo, quiet/stale channel and controlled user-performed USB disconnect/reconnect. Final four-bin acceptance requires each actual mounting to be calibrated separately. Software tests do not establish physical acceptance.

Rollback: stop only the local receiver and its frontend preview; keep the SQLite file and all project work. Firmware, municipal saved cities and unrelated frontend services remain intact. Future F2 integration can reuse parser/domain boundaries and replace the isolated SQLite repository/API adapter; no MongoDB or competing municipal backend is introduced.

Known environment note: npm audit reports existing Vite/Vitest/mocker advisories (moderate/high/critical); serialport was not listed. No force upgrades or unrelated F1 changes were performed. Address dev-toolchain upgrades in a separately scoped task before broader exposure.
