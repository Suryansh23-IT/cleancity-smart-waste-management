# Final single-zone showcase checkpoint

Final configuration (6 November 2026): **one city / one collection zone / one HEAD-depot / one garbage truck / ten bins**. This supersedes the two-zone/two-truck proposal only for the dedicated showcase. The six retained templates and five ready cities remain untouched.

- Physical channel BIN-001 → municipal BIN-001, similarly002–004.
- VIRTUAL BIN-005–BIN-010: low initial modeled fill, no physical-source claim.
- Ten editable graph access points,22 explicit directed roads (two-way records), one HEAD at show-0-0. The two connected street loops are provisional, not the final physical drawing.
- One truck, capacity3 bin units, configured speed20km/h; all trips start/return/unload at its single depot. The four-bin TEST demand exceeds one trip's capacity, exercising multiple sequential trips and unloads.
- Snapshot preview/capture/freeze/provenance and existing City v1 persistence remain; simulated collection never mutates receiver values. Legacy saved prototype inputs stay preserved; open a fresh showcase to obtain the final defaults. Legacy physical IDs remain protected against fill edits.

## Verification boundaries

This checkpoint task uses fixtures and temporary API/SQLite tests only. The isolated headless showcase runner intercepts Physical API requests with an explicitly unavailable response; it never reads the running receiver or opens a COM port. Actual hardware was NOT retested. Prior real USB controls evidence is in usb-connection-controls-verification.md. The real-COM runner now requires an explicit CLEANCITY_REAL_SERIAL=COM8 flag and fresh user permission.

Headless TEST journey passed: exact10 bins, six virtuals, one zone/head/truck, preview/capture, save/reload, dispatch, simulation, frozen input controls, Analytics and390px no-overflow. Existing TEST fixture calibration remains illustrative16cm/12cm, not a new claim of measured physical acceptance. New source unit assertions check exact identities, single HEAD, one truck, multiple capacity-limited trips, internal roads, unloading, preserved source observations and reconciled Analytics costs.

All source, tests, configs and essential documents are explicitly reviewed before staging. Ignored .local SQLite/sidecars/history, build output, screenshots/video, browser profiles and .vite cache stay local. No credentials or telemetry exports are intended commit content. No reset, squash, amend, push, merge or deployment.

## Next dependencies

Suryakant supplies the final printable physical map (junctions, actual connections/directions, depot and ten labeled sites); Raj assembles the model. Adjust only the dedicated factory/Studio coordinates and explicit roads, keep channel identities stable, regenerate one zone and verify return paths. No physical dimensions or final street layout are assumed. Final mounted calibration/ruler accuracy, repeatability/failure tests and physical-derived eligible-pickup rehearsal remain separate evidence gates.

Ready for F2 implementation after review of this checkpoint: preserve City v1 plus optional provenance envelope, add protected municipal persistence, revisions/migration and immutable scenarios/runs. Existing USB/SQLite remains the local telemetry adapter, not F2 or deployment readiness.

## Final validation results

Full regression run:146/146 tests passed across15 files (104.37s), including showcase/snapshot, one-truck route/unload, USB controls, SQLite/API and all existing city regressions. Standalone TypeScript and production build passed (1611modules); Git whitespace check passed. Actual isolated TEST browser journey passed with no captured application exceptions. Tests deliberately excluded archived build copies. No COM8 access or physical testing in this task.
