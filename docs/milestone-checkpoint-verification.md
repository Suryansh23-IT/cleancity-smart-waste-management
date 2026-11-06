# F1 and local four-sensor prototype checkpoint

2026-11-06 · branch `codex/municipal-platform` · parent `137858af58fa2068af76a2b17272c39738ae1aa4`.

## Preserved scope

- F1-A Dashboard, Cities and City Studio; F1-B Dispatch, Simulation, Analytics and Physical Lab workflows.
- Six retained curated templates and five simulation-ready cities, browser-local city persistence and compatible JSON import/export.
- Zone-contained directed routes, depot-bound truck responsibility, continuous road-based movement, faint ownership layers, demand seeds and transparent modeled cost comparisons.
- Four-channel USB diagnostic parser, explicit-port serial receiver, loopback Node API, native SQLite persistence, calibration controls and source-aware Physical Lab monitoring.
- Working diagnostic firmware: TRIG `{5,26,19,32}`, ECHO `{18,27,21,33}`, 115200 baud. Header agrees with executable arrays. Only trailing blank lines were removed during this checkpoint; measurement logic was not changed or flashed.

## Fresh software verification

- `npm test`: **140 tests passed in 13 files** (41.26 seconds). Includes nine parser/serial/SQLite/API tests, 13 partition-contract tests, 25 curated-city tests and 27 application integration tests.
- Initial sandbox run: 139 passed, one loopback API test failed with `connect EACCES`. The complete authorized rerun outside the sandbox passed; no serial device was opened by tests.
- `npm run typecheck`: passed.
- `npm run build`: passed; 1,608 transformed modules; bundled JS 398.13 kB, CSS 65.09 kB before gzip.
- Working-tree and staged whitespace checks passed before commit.
- SQLite emits its runtime experimental warning. Previously recorded development-tool advisories remain unresolved; no dependency upgrades were added for this checkpoint. `serialport@13.0.0` is the only new direct dependency relative to the parent.

## Browser and physical evidence boundaries

Previous-session browser evidence is described in the F1 verification reports and `local-iot-demo.md`. It includes desktop/emulated-mobile workflows, five ready-city playback journeys, six retained-template journeys and the local Lab. No new browser verification was performed solely for this Git checkpoint.

With the user's physical intervention and serial authorization, fresh real readings from all four channels reached USB → Node → SQLite → Lab. Receiver restart and retained history were observed. Electrical safety was user-reported, not independently inspected. The receiver remains intentionally stopped; this checkpoint did not open a COM port or manipulate hardware.

**Final physical demo is incomplete.** Dustbin purchase/mounting, measured calibration, independent target/ruler tests, empty/partial/full repeatability and controlled failure/reconnect acceptance remain pending. Uncalibrated channels show distance without invented fill percentages. Local transport success does not prove cloud connectivity or physical collection.

The five ready-city baseline inputs are covered by routing regressions. Arbitrary edits can produce infeasibility; Amberfort's retained one-way template can report unserved pickups under strict partitions. The planner reports these rather than crossing zones or claiming universal feasibility. Cost and forecast outputs are modeled estimates.

## Repository hygiene

Reviewed application, firmware, tests, manifests, configuration, browser acceptance runner and essential documentation only. Local SQLite and sidecars, genuine telemetry history, generated captures/results, browser profiles, dependencies/build output and unfinished tutorial tooling are excluded. Existing local measurements and tutorial files are preserved; no migration or deletion was performed. A personal screenshot directory was removed from the new documentation.

Historical F1/architecture reports retain their dated findings; this report and the local IoT guide describe the current checkpoint. Future MongoDB/full-stack work, final physical acceptance, deployment, push and merge remain outside this checkpoint.
