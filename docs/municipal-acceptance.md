# Municipal software M1–M3 acceptance — 5 November 2026

Continued from `9d6b975` on `codex/municipal-platform`. These M1–M3 names refer to the latest scoped municipal brief, not the superseded physical/AWS milestones. No architecture restart, cloud configuration, hardware work, deployment, push or merge.

## Implemented

- **M1:** predominantly white/off-white workspace; restrained emerald branding; coordinated sidebar, cards, forms, inspector and canvas; light SVG roads, nodes and readable status indicators; View/Edit/Simulate controls; stable drag geometry; reduced-motion support. Modal Tab/Shift+Tab is trapped and Escape cancels, with focus restoration.
- **M2:** actual travelled and planned kilometres, completed/remaining scheduled stops, pending jobs and elapsed virtual minutes. Each truck shows status, completion progress, travelled/planned distance, current load/capacity, trip count, road endpoints/interpolation position and scheduled utilization. Zone table reports normal/collection/urgent counts, current pickup load, planned trips/distance/vehicle minutes and pending bins. Unassigned bins and infeasible head-return responsibilities remain explicit. Replay restores the original snapshot before dispatching again.
- **M3:** both configurable forecast horizons (default 80% pickup, 90% urgent), percentage-point growth per virtual hour and history quality for every bin. Forecasts use 4–5 unique valid samples after the latest decrease; insufficient, zero-growth, noisy, future and stale history produce explicit limitations. Stale means older than three virtual hours against the scenario clock, not wall time. Baseline comparison now includes road distance, elapsed fleet time, summed vehicle labor, total modeled INR cost, trips and pending bins. Non-comparable pickup sets suppress savings; zero and negative reductions remain visible.

Metrics derive from the existing authoritative city, trip segments and simulation state; no extra city store or static results. Current demand falls after collection while plan totals retain the dispatch snapshot. Scheduled truck utilization = its planned busy minutes / fleet completion time; it is a modeled scheduling measure, not measured engine productivity. Truck positions follow existing directed road geometry. No paid map dependencies or new packages.

## Executed verification

| Check | Evidence |
| --- | --- |
| `npm test` | **56 passed**, five test files; 30 core, 10 React DOM, 6 new metric/forecast acceptance, 8 mocked API and 2 physical-response tests. Final run has no HTML nesting warnings. |
| `npm run typecheck` | PASS. |
| `npm run build` | PASS; main JS 305.58 kB / 96.03 kB gzip. Not a performance benchmark. |
| 10/20/50/100 presets | Automated overflow scenarios complete all bins with multiple capacity-constrained trips; partial distance, final distance, progress, replay and zone totals checked. |
| Unreachable work | Automated infeasible preset retains its pending bin after the scheduled collection finishes. |
| Desktop browser | Light layout inspected at 1440×960. Generated three zones and four trips, then started/paused/stepped/resumed. Final metrics: **41.23/41.23 km, 19 completed, 0 remaining, 0 pending, 86.2 virtual minutes**. Replay and reset exercised. |
| Analytics browser | Both forecast columns, quality labels and expanded distance/time/labor/cost comparison rendered. Browser warning/error log empty after final verification. |
| Mobile browser | 390×844 viewport override; content width 375 px. Found table-induced page overflow, constrained grid cards and scroll containers, reloaded final build: document width = viewport content width = 375 px in dashboard and analytics. |
| Files/persistence | Actual Export scenario download and file chooser re-import succeeded. Saved scenario reloaded in browser. Existing DOM tests cover blank-city head/bin CRUD, reference-protected deletion, save/reload, road edits and undo/redo. |
| Keyboard/pointers | Browser Shift+Tab wraps Cancel to Confirm, Escape dismisses without resetting; regression test added. Actual node drag changed its stored X/Y coordinates. Prior checkpoint's bin snap support retained. |

Screenshot: `cleancity-light-acceptance.jpg` in this chat's visualization artifacts. The preview is local frontend only and was stopped after verification; launch with `npm run dev` or build and `npm run preview`.

## Limits and next boundary

- No actual touchscreen-device test, exhaustive browser matrix or formal WCAG audit. Mobile viewport testing is not physical touch verification. No software blocker remains in the exercised acceptance flows.
- Historical simulation presets include synthetic trends; forecasts and modeled savings are illustrative, neither trained ML nor physically validated results. The heuristic is not globally optimal. Zone hulls remain visual guides, not road constraints.
- Collection resets/replay restore the original dispatch scenario. Browser persistence requires Save; generated plans and playback must be recalculated after reload. JSON import/export retains city data, not an active running job.
- C4/physical cloud preparation remains separate: finalize telemetry identity/freshness ordering, test SQL/RLS/RPCs in the intended development project, and implement/compile safe calibrated TLS firmware. No live cloud success or readiness for an actual physical demonstration is claimed. Hardware remains paused pending experienced assistance. Obtain authorization before starting excluded cloud configuration/deployment work.
