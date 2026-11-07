# CleanCity F1–F3 software audit

7 November 2026. User authorized independent F3 work while F2 real Atlas acceptance remains pending. No commit, push, deployment, actual Atlas credential access or hardware operation was performed. Existing uncommitted F2 changes, root preview PNG, browser saves and SQLite history were preserved.

## Sequential implementation and verification inventory

| Order | Area | Implemented and checked | Evidence boundary |
| --- | --- | --- | --- |
| 1 | Dashboard | Municipal KPIs, actionable alerts, navigation, modeled plan versus actual playback progress and capacity exceptions | Core/component suite, fresh seven-screen Chrome journey; visible ChatGPT browser inspection |
| 2 | Cities | Six retained templates/five ready cities, CRUD/copy/local save/import/export; new explicit authenticated database workspace | Component/HTTP tests and fresh F2 browser save/import/retry/reload journey; MongoDB durability not established |
| 3 | City Studio | Existing graph/bin/depot/road editing, bulk tools, inspectors, undo/redo, camera/search/layers and mode distinctions preserved | Existing editing regressions and fresh seven-screen workflow; no redesign |
| 4 | Fleet/Dispatch | Dijkstra paths, AutoZone, strict zone-contained trips, availability/capacity and scheduling, pending reasons | Existing graph/zoning/partition/curated tests; added all-twelve-scenario legality/load/return/total regression; browser fleet edit/dispatch |
| 5 | Simulation | Directed movement, playback/pause/resume/step/reset, service pickups, unloading/return and terminal results | Fresh Chrome run and terminal invariant regression; completion floating-point defect fixed below |
| 6 | Analytics | Distance, elapsed versus summed vehicle time, cost formula, baseline coverage and full-round policy distinction; both existing forecast horizons | Existing core/insights/forecast/component tests and browser Analytics checks; no new optimizer, forecast or what-if behavior |
| 7 | Physical Lab/showcase | Local receiver/SQLite/USB controls retained; four channel identities and six low-fill virtual bins; single zone/head/truck; frozen provenance; approved A1–A4 map unchanged | Automated local API/parser/SQLite and showcase tests; browser uses offline physical responses and explicit TEST fixtures, never COM8 |
| 8 | F2 persistence/auth | Salted scrypt, opaque hashed sessions/expiry, CSRF/Origin/workspace protection, revision CRUD/restore, cursor pagination, backup/selected retry-safe migration, immutable snapshots and canonical server replay/results | HTTP tests use TEST repository. Isolated desktop/mobile F2 journey passed login, duplicate-free saves, other-tab conflict/draft revision preservation, import retry, snapshot, completed simulation, saved result, session/history reload |
| 9 | Production preparation | Hosted Node adapter with lazy fail-closed initialization; no listener or local hardware imports; CSP/no-sniff/referrer headers and upload exclusions; operations/rollback gate checklist | Two hosted HTTP tests and local bundling; no platform build/deployment or hosted cookies/Atlas networking claim |

## Fresh results

- **169 tests passed; one real MongoDB test skipped.** 20 passing files and one skipped file. Skip reason: no explicit Atlas test URI; it is not a database pass.
- TypeScript and Vite production build passed. Hosted adapter bundled locally with esbuild (38.2 kB, external packages). Browser bundle scan found no privileged password-hash/Mongo credential patterns. Git whitespace checks passed.
- Seven-screen Chrome product journey: six PASS groups covering fleet edit/dispatch/playback/results/reset, honest offline Lab, 1536/768/390 px navigation/layout, zero demand and unavailable fleet. The old harness assumed the template tab was initially selected; the isolated audit copy explicitly selects Templates and intercepts physical requests. This was a test-harness mismatch, not a product defect.
- Separate fourteen-screen checks (all seven screens at 1536 and 390 px) passed overflow, exposed-button accessible-name and Tab-focus assertions. No uncaught application exceptions in these journeys. This is a bounded accessibility spot check, not full WCAG, screen-reader or real-touch-device certification.
- Fresh F2/showcase TEST journey passed. Four eligible physical-derived fixtures collected, six 19–24% virtual bins skipped; two capacity-limited trips; zero pending; 6.13 modeled km, 36.4 virtual minutes and INR 171.07 reconcile with server replay. No result is represented as physical collection or real Atlas persistence.
- Actual visible ChatGPT browser inspected Dashboard → Cities → Studio → Dispatch → Simulation → Analytics; the Analytics no-run state correctly distinguishes zero pickups/travel from planned estimates. Physical Lab's full fresh acceptance was isolated Chrome with offline physical API interception.

## Defects and corrections

1. **Finished truck could remain unloading:** `trip.end` is calculated as start plus a sum, while state inspection added durations incrementally; rounding differences could leave positive load at the exact recorded end. `tripState` now honors the authoritative terminal boundary; terminal pickup advancement likewise honors a completed trip. All eleven retained cities plus the approved showcase now reconcile capacity, legal directed edges, unique pickups, totals, completed work and unloaded depot returns.
2. **Archived-copy false save acknowledgment:** a retry-safe create could return its existing archived record as if it were active. It now returns 409 with explicit restore guidance, covered by a regression.
3. **Hosted municipal API missing:** added `api/[...path].ts` and shared `hosted.ts`; configuration failure returns sanitized 503 and hosted initialization rejects local-demo password hashes. Existing separate physical routes are retained. Platform routing still needs actual release acceptance.

No routing strategy, scheduler objective, forecasting model, map geometry, fixture definitions or physical circuit was redesigned.

Server history now uses engine version `f3-terminal-boundary-v2` for the corrected terminal semantics. Earlier snapshots/results remain readable; the existing version guard prevents silently replaying them under the corrected engine. New snapshots can be captured from retained inputs.

## Performance evidence

`build/f3-evidence/performance.json` records twelve plan calculations for each of the eleven retained cities, Node v24.11.0 on Windows. Westhaven (100 bins): median about 4.94 ms, sampled p95 about 6.17 ms. This small local sample is planning-only and not a guarantee under server concurrency, slow devices or hosted rendering. Frame/memory profiling and cross-engine/real-device acceptance remain qualifications below; no unmeasured fps claim is made.

## Remaining tasks by category

| Category | Remaining gate |
| --- | --- |
| Software verification / production security | Confirm hosting-level distributed request/login limiting; current process-local limiter is not shared across serverless instances. Complete selected-runtime routing/header/CSP/cookie/body/response-limit qualification, actual cross-engine/real-device checks and sustained playback/frame/memory profiling. These are not passed by unit tests or viewport emulation. No known failing local regression remains. |
| Atlas acceptance (F2) | Dedicated development Atlas connection; actual authenticated browser → API → DB writes, restart/read-back, revision conflicts, migration retry/history and outage/recovery. Driver test intentionally skipped; no credentials read or network connection attempted in this audit. |
| Physical F4 | Mount four real bins/sensors; physical electrical review; measured empty/depth calibration; simultaneous stability/repeatability and genuine live snapshot → existing collection workflow. Six bins stay virtual. No map changes required by this software audit. |
| Deployment | Strong production operator password and least-privilege production Atlas setup, environment/target approval, platform acceptance, backup/restore validation, production smoke tests and rollback rehearsal. Local laptop USB does not become remotely accessible through deployment. |

## Exact readiness statement

**F3 local software audit, defect fixes and deployment preparation are complete for this pass. The entire product is NOT yet certified deployment-ready.** Real Atlas acceptance and the listed release/security/runtime qualifications remain open. F4 and final deployment have not started. See [production release checklist](production-release-checklist.md) and [F2 setup](f2-local-setup.md).

## Evidence and changed files

F3 source/config: `src/core/simulation.ts`, `src/core/finalAcceptance.test.ts`, `server/municipal/app.ts`, `server/municipal/app.test.ts`, new `server/municipal/hosted.ts`/`hosted.test.ts`, new `api/[...path].ts`, `vercel.json`, `.vercelignore`. This report and the production checklist document scope and release gates. All earlier F2 files remain uncommitted.

Ignored evidence: `build/f3-evidence/` (planning metrics, hosted bundle, ChatGPT screenshot and fourteen-screen accessibility/browser results); `build/f2-e2e/` (TEST-memory F2/showcase screenshots/results); `build/f1-a-e2e/` (fresh seven-screen journey screenshots/results). Screenshots/logs/backups are not staged as source.
