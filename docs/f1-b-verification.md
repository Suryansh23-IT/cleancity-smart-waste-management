# F1-B frontend verification

Date: 2026-11-06. Branch: `codex/municipal-platform`. F1-A and F1-B remain uncommitted for visual approval. This record supplements, rather than replaces, `f1-a-verification.md`.

## Delivered frontend behavior

- **Fleet & Dispatch:** city-specific demand, availability, planned distance, fleet completion time and unserved pickups; explicit next step; expandable truck/trip assignments with named stops, road legs, capacity and service events; working truck-on-map inspection. Existing fleet forms have positive-capacity validation and draft-save protection. Preparing a plan now stays on Dispatch for review.
- **Simulation:** existing deterministic playback, per-truck movement and modeled collection/unloading remain intact. Paused state has the correct heading; completion summarizes completed, remaining and unserved pickups and links directly to Analytics. Movement and progress are explicitly virtual.
- **Analytics:** actual completed progress is separated from full-plan estimates; fleet elapsed time is distinguished from summed vehicle working time. Cost inputs and equation, same-coverage baseline eligibility and heuristic limitations are explicit. Existing forecast and performance panels remain available. No saved run history is claimed.
- **Physical IoT Lab:** consistent light appearance, four real-data-only slots, absent/invalid/stale/receiver-unavailable states, receipt age, last usable history value where available, and clear endpoint errors. The local receiver path is planned, not working connectivity. The footer no longer incorrectly requires cloud infrastructure.
- All seven destinations retain the current city and shared navigation. Saved city inputs remain browser-local; plans and playback remain tab/session state. The six curated cities and graph/JSON/algorithm contracts are preserved.

## Defects corrected and coverage

- Unapplied truck fields could be mistaken for saved city inputs: the existing draft guard now also protects fleet forms. Regression test exercises blocked Save city, applying truck changes and replanning.
- Existing zone heads were not consistently preselected when a saved city loaded: initialize/update head selection from the city's zones. Covered by dispatch regression.
- Plan collection skipped review by navigating immediately to playback: keep Dispatch visible and offer Review simulation.
- Paused collection retained a running heading: display the paused state correctly. Covered by simulation journey and DOM regression.
- Physical errors implied a cloud-only connection: use receiver/endpoint language and preserve honest unknown values. Regression tests cover unavailable endpoint and mixed invalid/stale/missing readings.

## Automated evidence

- `npm test -- --run`: **99 tests passed in 11 files**, including three added F1-B regressions. Existing engine, telemetry, map geometry/interaction, saved-city, CRUD, modal focus/Escape and simulation tests pass.
- `npm run typecheck`: passed.
- `npm run build`: passed; Vite transformed 1,606 modules.
- Browser runner: `scripts/f1-a-browser.cjs`; isolated installed headless Chrome, fresh disposable browser profile. User browser saves are not used or changed.
- F1-B browser run: **6 grouped checks passed**, no captured JavaScript exceptions: complete seven-screen journey with edited Aster capacity; honest offline Lab; navigation/layout at 1536, 768 and 390 pixels; no-demand, unavailable-fleet and unreachable-demand fixtures.
- Separate six-city browser rerun: **6 of 6 complete map journeys passed**, no captured JavaScript exceptions: Cedar, Meadowbrook, Willowbridge, Ironworks, Amberfort and Aster. Each exercised asset CRUD/undo, export/import, save/reload, planning, playback and Analytics agreement with its original input plan. Results are in `build/f1-a-e2e/results-six-cities.json`.
- The Aster edited-capacity journey completed 63 eligible pickups and displayed recalculated 35.26 km, 44.4 fleet minutes, and 306.8 summed vehicle minutes. These are modeled outputs for the edited fixture, not measured municipal results.
- Browser playback exercised Start, Pause, Resume, Step, Finish, Replay and Reset, followed by Analytics. Native invalid-capacity validation and route inspection were exercised.
- Browser runner timing corrections: Reset does not always show a confirmation; reload must wait for rendered content rather than a fixed short delay. These were harness assumptions, not product failures.

## Visual evidence and review

The actual host preview was also opened in the **visible ChatGPT in-app browser** at `http://127.0.0.1:5178/`. Dispatch, completed guided-demo playback, Analytics and offline Lab were inspected there. The tab is left open for review. No desktop capture or existing Chrome-window control was used.

Application-only headless screenshots are in ignored `build/f1-a-e2e/`:

- `f1b-dispatch.png`, `f1b-simulation.png`, `f1b-analytics.png`, `f1b-physical.png`.
- `f1b-{dispatch,simulation,analytics,physical}-{1536,768,390}.png`.
- `results-f1b.json` records the six grouped checks and captured exceptions.

Visual findings: shared white/green hierarchy, readable summaries, expandable route detail, no page-level horizontal overflow at tested widths, and neutral empty physical gauges. Mobile uses stacked controls/cards and drawer navigation. The long operational pages still require vertical scrolling. Existing modal keyboard/focus checks are automated DOM coverage; this is not a complete assistive-technology audit or real-device/cross-browser certification.

## Scope limits and handoff

No backend, MongoDB, receiver, hardware test, cloud provisioning, deployment, commit, push or merge. F2 owns durable run history/backend persistence; F3 owns new scheduling/optimization capabilities; H0–H4 owns actual local receiver and physical evidence. Forecasts, cost and truck positions remain modeled, not measured or live GPS. The physical endpoint is unavailable in this preview, intentionally shown without invented values.

Review the visible preview: Cities → View a curated city → City Studio → Dispatch → Plan collection → inspect a truck → Review simulation → Start/Pause/Finish → View collection analysis. Separately review Physical IoT Lab's four empty slots. F1 remains subject to user visual approval.
