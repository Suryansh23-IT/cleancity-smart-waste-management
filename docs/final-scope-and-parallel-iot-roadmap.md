# CleanCity — final frozen scope and parallel four-sensor roadmap

Audit date: 6 November 2026. Read-only investigation except this report. No application edits, dependency installation, test execution, browser/desktop access, hardware actions or Git mutation performed by this audit.

## A. Executive snapshot and evidence standard

CleanCity is currently a browser-local municipal simulator with a substantial editable city/map frontend and useful tested planning/playback foundations. It is not yet a database-backed municipal platform or a validated physical four-bin system. Remaining work is completion of the frozen scope, not discovery of additional features.

Branch: `codex/municipal-platform`. HEAD: `137858a` (approved blueprint documentation); application baseline `2079179`. F1-A, its final polish and six authored cities remain uncommitted and visually unapproved. Do not reset, squash, stage or commit them as part of this report.

Evidence reviewed: the blueprint, original audit, upgrade roadmap, F1-A verification history, current Git state, package/API/telemetry/firmware sources and stored headless results. Recorded latest validation is 96 tests across 11 files with TypeScript/build/diff checks passing. `build/f1-a-e2e/results.json` contains six PASS city journeys and an empty observed-exception array. This supports the previous execution record; it is **not a fresh independent rerun**. Ignored artifacts can be removed by future cleanup, so retain appropriate evidence at an authorized checkpoint. Physical measurements, working Atlas configuration, cloud ingestion and real deployment are UNKNOWN/not established.

Status vocabulary: **IT** implemented with recorded tests; **IV** implemented but incompletely verified; **P** partial foundation; **A** approved/unimplemented; **D** deferred optional; **S** superseded architecture. Passing tests apply to their assertions, not every possible interaction or real-world operation.

## B. Current architecture and complete feature inventory

Today: React/Vite/TypeScript → pure graph/model/route/simulation modules → component state and browser localStorage. Separate Physical Lab → `/api/physical`; existing physical API → Supabase REST/RPC only if configured. No Mongo driver or Express dependency exists in `package.json`. A static Vite server is not a running physical API service.

Target: same React frontend → protected Node/TypeScript/Express application → MongoDB Atlas. Pure algorithms are shared, not rewritten. Playback remains local; bounded immutable inputs/results are saved through the API. Parallel local hardware adapter feeds the same physical validation/service contract and a Physical Lab read endpoint. Deployment later packages the frontend and API for Vercel; persistent USB serial reading stays on the local computer.

File references in the following tables are relative to the repository root. Completion phase means remaining verification/productization, not permission to rebuild a working feature.

| Feature | User purpose | Status / test evidence | Known limit | Relevant files | Completion phase |
| --- | --- | --- | --- | --- | --- |
| App shell, selected city, navigation | Know context and move between tasks | IT; DOM/headless journeys | Seven destinations exist; consistent polish beyond first three unfinished | `src/App.tsx`, `src/main.tsx` | F1/F4 |
| Dashboard KPIs | See demand/readiness/coverage | IT; core/DOM and browser render | Simulated model values, not municipal live feeds | `components/Dashboard.tsx`, `core/workspace.ts` | F1/F4 |
| Actionable urgent/pending filters | Find and fix collection problems | IT; capacity-recovery regression | Not every action independently browser-clicked | Dashboard, `App.test.tsx` | F1/F4 |
| Cities library/search | Find templates and local saves | IT/IV; browser library, static search review | Browser-origin-local; search edge cases not exhaustive | `components/Cities.tsx`, `core/storage.ts` | F1/F2 |
| Six authored maps | Demonstrate different cities | IT; scenario invariants and six browser journeys | Stylized educational inputs, no real geographic accuracy | `core/curated.ts`, `curated.test.ts` | F1 visual approval/F4 |
| Blank/seeded custom creation | Build a personal city | IT; DOM/headless | Not every seed/size combination benchmarked | Cities, `core/studio.ts` | F1/F4 |
| View/edit/copy/rename/delete cities | Manage reusable inputs | IT; mixed browser/DOM | Saved-library deletion has no advertised restore; current open city retained | Cities, App, storage | F1/F2 |
| Browser save/reload | Keep city inputs | IT; real reload checks | 50-city cap, no cross-device persistence; plans/history session-only | storage, App | F2 |
| Save & open / cancel/discard | Switch without accidental draft loss | IT; DOM/headless | Buffered property edits must be applied separately | App, Inspector | F1/F4 |
| JSON download/import | Backup/transfer city data | IT; actual browser files and validation | City-v1 inputs only, not full historical archives | Cities, `core/model.ts` | F2 archive/migration |
| Invalid/corrupt data recovery | Avoid overwriting bad storage | IT; corrupt value preserved | No complete guided corruption repair or true quota-exhaustion browser test | model, storage, App tests | F1/F2/F4 |
| Direct junction/bin/road forms | Create assets without internal IDs | IT; per-city browser creation/edit/recovery | Visual placement still needs operator judgment | `StudioCreate.tsx` | F1 visual review |
| Junction/head/unload-point properties | Define road access and depots | IT/IV; schema/DOM; browser head inspection | Exact pins/physical locations unrelated; every head deletion path not browser-tested | Inspector, model | F1/F4 |
| Directed-road CRUD | Define allowed travel and explicit distance | IT; duplicate-edge validation and directed path tests | Two-way is two directed records; no turn-state restrictions | Inspector, StudioCreate, App | F1/F3 optional rules |
| Bin CRUD, capacity, fills/history | Represent service demand | IT; browser and core tests | Bin units are model units, not measured waste volume | Inspector, model | F1/F3 |
| Visual marker/access association | Move marker without inventing road access | IT; geometry/model tests | Drag/touch permutations incompletely verified | CityCanvas, Inspector, zoning | F4 |
| Contextual object list/inspector | Find and understand editable objects | IT; new draft-save regression | Two save layers remain: apply properties, then save city | Inspector, App | F1/F4 |
| Undo/redo and edit invalidation | Recover editor mistakes safely | IT; DOM/browser | Bounded session history; switching city clears it; not database revision history | App, `core/studio.ts` | F1/F2 |
| Bulk bins/fill/delete/generation | Make larger edits efficiently | IT; existing regressions | Full manual mobile bulk audit unfinished | `StudioTools.tsx`, studio | F1/F4 |
| Road surfaces/context/markers | Read the city visually | IT/IV; screenshots/geometry tests | Context is illustrative, never geographic service coverage | MapSurface, mapGeometry, CityCanvas | F1 visual approval |
| Pan/zoom/fit/search/layers/modes | Explore or inspect the actual graph | IT/IV; component/DOM/browser slices | Full keyboard/touch gestures and every layer combination unverified | CityCanvas, camera | F1/F4 |
| Zoning and manual responsibilities | Assign bins to heads | IT/P; zoning tests/browser inspections | Heuristic grouping; no guarantee of best balance/geographic contiguity | `core/zoning.ts`, App, Inspector | F3 |
| Head-return reachability | Avoid impossible round trips | IT; directed/reference validation | A drawn outline is not proof of reachability | graph, zoning, routing | F3/F4 |
| Truck roster/availability/capacity/speed | Configure usable vehicles | IT; fleet regressions | Full per-field browser audit incomplete; no stream/crew capability model | FleetPanel, model, Inspector | F1/F3 |
| Zone assignments and dispatch | Allocate trucks and plan service | IT/P; browser planning and unit tests | Same-zone parallelism can be inefficient | FleetPanel, App, routing | F1/F3 |
| Directed shortest paths/cache | Travel only on legal roads | IT; graph tests | No traffic/turn/access-state optimizer | `core/graph.ts` | Reuse F3 |
| Urgency/nearest feasible planning | Prioritize threshold demand | IT/P; capacity and legal-edge tests | Greedy heuristic; not global cost/time optimum | `core/routing.ts` | F3 |
| Capacity, trips, return/unload | Model feasible collection loads | IT; conservation/trip tests | Simplified initial-location/head operations; queues/shifts deferred | routing, simulation | F3 |
| Playback/pause/step/finish/reset/replay | Understand operations over virtual time | IT; browser and simulation tests | Local execution, no durable run history or actual truck GPS | simulation, App | F1/F2/F4 |
| Progress, remaining stops, workloads | See operational progress | IT; insights tests | Modeled progress; advanced workload balancing incomplete | OperationsInsights, `core/insights.ts` | F1/F3 |
| Distance/time/labor/cost analysis | Compare resource estimates | IT/P; reconciled totals | Fixed lexical baseline; equal-demand checks needed before savings | routing, OperationsInsights, App | F3 |
| Two forecast horizons | Estimate pickup/overflow timing | IT/P; history-quality tests | Small recent average, any-drop reset; no trained ML/calibrated probability | `core/forecast.ts`, OperationsInsights | F3 |
| What-if assumptions | Experiment with inputs | P; editable settings/replan | No durable controlled scenario comparison library | App, model | F2/F3 |
| Physical four-slot UI | Show real measurements separately | IT/P; parsing/offline/StrictMode tests | No demonstrated physical telemetry; cloud-centric error text | PhysicalLab, `core/physical.ts` | Local H4/F1 |
| Telemetry validation/calibration/token helpers | Reject malformed measurements | IT; telemetry unit tests | Not a local receiver or complete ingestion deployment | `server/telemetry.ts` | H0/F2 reuse |
| Existing ingest/snapshot APIs | Authenticate device writes/read physical snapshot | P/S; code scaffold, helper tests | Supabase-specific REST/RPC; actual cloud state UNKNOWN | `api/ingest.ts`, `api/physical.ts` | Adapt in F2/H4 |
| Firmware preparation | Begin safe one-sensor evidence | P; source inspection only | No validated circuit; sketches do not implement four-sensor telemetry | `firmware/first_sensor`, `firmware/hc_sr04_test` | H0–H3 |

### Role-wise usability

- **Beginner:** Cities → example or blank city → named Add to city forms → inspect → save. Needs visual acceptance and complete keyboard/touch review; should not need graph IDs.
- **Municipal operator:** Dashboard alerts, filtered bins, zone responsibility, saved city and latest modeled operation. Needs durable history and honest source/save indicators; no real municipality service claim.
- **Planner/engineer:** Studio, directed weights, heads, bulk tools, manual zoning, validation and JSON. Existing advanced tools remain; complex restriction models are optional deferred work.
- **Dispatcher:** roster, availability/capacity, pending reasons, plan review/playback/results. Needs remaining F1 composition and F3 objective/balance/explanation work; no new role/auth subsystem implied.
- **IoT demonstrator:** Physical Lab freshness/errors and real four-bin readings. Needs local receiver plus hardware evidence; currently can only demonstrate scaffold/offline behavior honestly.

## C. Frozen innovations and recommendations

| Innovation | Actual algorithm / workflow | Remaining approved work and proof |
| --- | --- | --- |
| 1 AutoZone | Heuristic head-based responsibility over actual graph; manual edits | Workload/contiguity/round-trip diagnostics, stable membership for harmless edits; known fixtures and imbalance measurements |
| 2 Cost-aware routes | Dijkstra directed legs, urgency/nearest feasible selection; evaluated costs | Explicit time-first/distance-first objectives, transparent trade-offs; tiny references, legal edges and cost reconciliation |
| 3 Smart scheduling | Threshold/urgency and capacity trip packing | Same-zone finish-time balancing, deterministic reasons; audited idle-truck case and identical 1/2/3-truck demand comparisons |
| 4 Capacity | Fill fraction × bin units, finite truck units, trips/service/unload | Clearer starts/depot transit/unload behavior; heterogeneous, unavailable, oversized and excess-fleet tests |
| 5 Savings | Fixed-order reference and modeled km/vehicle-hours | Fair operator reference, same coverage/demand/constraints, negative/zero savings and full breakdown |
| 6 Overflow | Recent-history average; duplicate/stale/noisy/insufficient handling, two horizons | Seeded growth, explicit pickup events/windowing and synthetic backtests; retain uncertainty/quality labels |
| 7 Closure/traffic | A — no scenario layer | Pre-dispatch actual road disablement/speed multipliers; disconnected demand pending, immutable originals; mid-route incidents optional |
| 8 Depot placement | A — editable heads are not an optimizer | Candidate-node directed round-trip demand objective; bounded heuristic, tiny exact comparisons and unreachable penalties |
| 9 Sensor planning | A — physical devices are not a placement planner | Budget/risk/coverage selection with transparent objective and tiny reference checks; no circuitry-success guarantee |
| 10 What-if | P — settings editable but comparisons not immutable | F2 snapshots/results then F3 controlled same-demand experiments and changed-assumption display |

All 26 approved IDs remain accounted for:

| IDs | Current / required completion | Classification |
| --- | --- | --- |
| U01 edit preservation, U02 read-only modes | Implemented foundations and regressions; F1 acceptance/F4 full audit | Core |
| U03 authoring, U04 navigation, U05 layers | Implemented; finish human/device acceptance rather than redesign engine | Core F1/F4 |
| U06 objective/balance | Greedy foundations; F3 finish-time vs distance-first verification | Core |
| U07 route inspection | Existing routes/trucks; finish readable per-truck legs/state and explanation | Core F1/F3 |
| U08 zone diagnostics | Validity foundation; balance/contiguity diagnostics incomplete | Core F3 |
| U09 incidents | Pre-dispatch closures/traffic missing | Core F3; dynamic breakdown/rerouting D |
| U10 snapshots | City saves exist; immutable scenario/run storage absent | Core F2/F3 |
| U11 baselines | Existing fixed-order comparator needs fair reference audit | Core F3 |
| U12 bin access | Visual offsets/access association exist | Core retained; explicit service-offset costs optional |
| U13 roster | Availability/progress foundations; improve coherent dispatch view | Core F1/F3 |
| U14 forecasts/growth | Average forecast exists; seeded demand/event reset absent | Core F3; forecast-driven optional pickup later |
| U15 reports | City JSON only; reconciled operations CSV/print absent | Core F3 |
| U16 realism | Basic service/unload/return exists; make starts explicit | Core F3; queues/shifts D |
| U17 recovery/accessibility | Draft protection/validation exists; durable conflict/migration and full accessibility incomplete | Core F1/F2/F4 |
| U18 performance | 100-bin exercised, not statistical planning/frame/memory certification | Core F4; worker only if measured need |
| N01 streams | Compatibility missing | Core F3 single stream; multi-compartment D |
| N02 turns/access | Missing | D; no new mandatory path-state rewrite |
| N03 commitments | Due/overdue service missing | Core F3 simple commitments; complex recurring windows D |
| N04 crew/equipment | Missing | D; no staffing-law claims |
| N05 uncertainty | Missing | Core F3 bounded seeded trials after deterministic reliability |
| N06 emissions | Missing | Core F3 editable modeled travel/service/idle factors |
| N07 verification lab | Existing invariants; strengthen independent tiny path/stop-order references | Core F3/F4; no large-instance optimum claim |
| N08 explanations | Pending reasons exist; structured selection/tie-break rationale incomplete | Core F3 |

Deferred concepts are not required for final core acceptance: dynamic mid-route incidents, complex queues/shifts/windows, turn/access state, crew/equipment, multi-compartment optimization. Real GPS/traffic feeds, calibrated ML, paid maps, elaborate multi-tenancy and large durable experiment infrastructure are outside the frozen core. Do not promote them through this audit.

## D. Finish F1 without reopening architecture

F1-A is implemented but pending user visual acceptance. Six maps have recorded legal/capacity/completion tests and actual browser CRUD/export/reload/simulation evidence. Counts: Cedar 12 bins/1 zone/1 truck; Meadowbrook 36/3/3; Willowbridge 32/2/2; Ironworks 30/2/2; Amberfort 45/2/2; Aster 100/4/8. Recorded completed pickups 8/23/20/19/29/63, all zero pending for those fixtures. These records do not prove all gestures or optimal allocation.

Required F1 closure: review appearance/task clarity; inspect remaining draft-loss permutations, full keyboard-only paths, drag/pan/touch, all inspector fields and library search/limit errors; keep recorded limitations explicit. No newly identified P0 failure is established by this read-only audit. Minor-risk follow-ups are two-step property/city saving, short-lived notifications, crowded dense marker views and partial coverage of secondary controls; reproduce before changing.

Remaining F1 screens already function but need coherent product polish: Fleet & Dispatch (objective/roster/routes/pending hierarchy using current engine), Simulation (controls/vehicle state/remaining work/results handoff), Analytics (selection, comparability and quality labels), Physical Lab (local-source-aware empty/error/freshness states). Do not display future F3 buttons as working functionality. Finish navigation context/dirty protection across these screens, desktop/tablet/mobile and honest session-only run history. Acceptance is end-to-end task completion, not just restyling.

## E. F2 — one protected backend and durable data

Ordered implementation slices, each separately authorized:

1. Separate Express app from local listener/provider adapter; runtime validation and safe errors; reuse pure City validation/path/planning modules. Preserve City-v1 import/export inside a server envelope.
2. One operator session: server-only bootstrap secret, expiring HttpOnly opaque cookie, hashed stored tokens, CSRF/Origin validation, scoped workspace queries, rate/body limits. No frontend credentials, unrestricted writes or client-provided authority.
3. Real dedicated development Mongo vertical slice: browser create → protected API → database write → fresh read/restart. Mocks alone cannot establish integration.
4. Bounded embedded City aggregate; server revision/schema/timestamps/soft-delete. Compare-and-set updates; stale save preserves draft and returns conflict. Scope every query to the session workspace.
5. Safe migration: raw backup → per-item parse/preview → explicit selection → idempotent server identities/provenance → read-back comparison. Never automatically clear originals. Include corrupt entry, quota, retry and partial-failure tests.
6. Immutable `scenarios` with full input snapshot/hash/source revision/seed/engine version; bounded `runs` with scenario reference, verified terminal results/events/pending/summary. Replay/validate browser results through the same engine before verified status. No per-frame writes. Explicit revision-checked apply-run action is separate from saving history.
7. Typed frontend repository integration, clear local/draft/saving/server-saved/offline/conflict indicators, bounded retries and duplicate prevention. Keep older snapshots readable when engine versions change.

Contracts already approved: health/readiness, session create/delete, city list/create/read/update/delete/duplicate/restore, import preview/commit, scenario list/create/read, plan, run save/read and explicit apply-run. Use documented 400/401/403/404/409/413/422/428/429/503 behavior. Index scoped city lists, scenario/run chronology, unique idempotency keys and expiring sessions. Physical device/reading collections remain a separate domain within the same backend boundary.

Use one reused bounded MongoClient connection promise per runtime instance; reset failed initialization, set bounded wait/selection limits, close on local shutdown rather than every request. No database URI logging. Real credentials/account/network state are UNKNOWN. Local Mongo is an optional development substitute; selected target remains Atlas. Local-first does not mean remote Atlas is offline-capable.

F2 gate: isolated database/API tests, real browser persistence after restart, unauthorized/cross-workspace/CSRF rejection, stale two-tab saves, failed writes, migration recovery, duplicate retries and historical immutability. No production resources required to claim local integration.

## F. F3 — complete frozen municipal intelligence

Dependency order: independent tiny verification fixtures → same-zone coordination/objectives/explanations → starts/head/unload/workload diagnostics → fair baseline/reporting → controlled snapshots/what-if → pre-dispatch closures/traffic → depot and sensor planners → seeded growth/commitments/stream compatibility → bounded uncertainty/emissions. F2 supplies durable experiment history; deterministic engine fixtures can be developed independently beforehand, without pretending persistence exists.

Each user-facing feature needs a meaningful workflow and a precise model. Depot/sensor objective definitions precede UI claims. Compare identical demand/constraints and show pending work before savings. Test zero demand/budget, unreachable candidates, ties, heterogeneous/excess/unavailable trucks and oversized jobs. Reject illegal edges, duplicate service, overload and time reversal; reconcile distance, elapsed fleet time, summed vehicle time, loads and costs. Do not claim mathematically optimal results for heuristics or measured emissions for editable factors.

## G. F4 and mandatory deployment gates

F4 consolidates reliability; it does not add features. Required gates:

- Full seven-screen action/CRUD matrix with actual browser/API/database evidence, complete reset/replay and migration/recovery exercises.
- Tests/typecheck/build, independent algorithm invariants and six scenario smoke runs; clean attributable console/network errors, source separation and honest failure handling.
- Keyboard/focus/error announcements, contrast and mobile/tablet overflow/gestures; real assistive-technology/device checks where available, otherwise explicit limits.
- Repeated planning latency/frame/memory tests on a named machine at 10/20/50/100 bins. Blueprint targets are proposed budgets, not current measured achievements. Optimize only confirmed bottlenecks.
- Security review of sessions, scoped data access, CSRF, limits, device credentials/replay, secret exclusion, logs and least privilege. Never equate CORS with authentication.
- Versioned schemas/engine records, recoverable backups/imports, dedicated test DB cleanup, DB outage/reconnect and safe retry tests.
- Reproducible local setup, example variable names, dependency/runtime checks, deployment packaging, rollback and post-deploy smoke checklist.

Deployment blockers: no protected municipal backend/DB currently; unresolved data migration/conflict contracts; missing core F3 workflows; secret/auth/authorization failures; broken production API routing; non-recoverable data handling; failed build or essential end-to-end paths. Optional restrictions/queues/visual extras are not blockers. Hardware is not a blocker to a clearly labeled municipal-only deployment; it is a blocker to claiming a finished integrated physical demonstration.

## H. Four-sensor local track

### Reuse and gaps established from source

`server/telemetry.ts` already checks device ID, boot ID, sequence, 1–4 unique BIN-001..004 readings and null or 2–400cm distances; limits JSON to 8192 bytes; hashes/checks bearer tokens; converts calibrated distance to fill. These are useful helpers, not physical proof. `src/core/physical.ts` checks PHYSICAL responses, four allowed bin identities, up to 30 history entries, valid distance/fill/timestamps and freshness (90-second threshold, future allowance). PhysicalLab polls the physical endpoint with timeouts, handles malformed HTML/offline responses and retains explicit errors. Freshness/error wording must be reconciled with the new local sampling contract, not copied blindly from older cloud notes.

`api/ingest.ts` authenticates against Supabase devices and calls `ingest_readings`; `api/physical.ts` requires configured storage and PUBLIC_PHYSICAL_DEMO before snapshot access. These adapters and any SQL RPC preparation are Supabase-specific historical foundations, **not** approved Mongo integration or a ready USB bridge. This audit does not validate deployed SQL/RLS or any external service.

`firmware/first_sensor/first_sensor.ino`: serial-only gated first-sensor sketch; `WIRING_REVIEWED=false`, pins -1, bounded timeout, invalid/null states. It lacks the complete batch device/boot/calibration contract. `firmware/hc_sr04_test/hc_sr04_test.ino`: Wokwi-labelled diagnostics with hardcoded GPIO5/25 and sample summaries, not a safe approved physical mapping or structured four-bin transmitter. Do not flash either based on this report.

### Simplest local architecture: USB serial first

Recommend **ESP32 → USB newline-delimited JSON → small local Node receiver adapter → shared telemetry validation/service → `/api/physical` → Physical Lab**. This is a recommendation under the frozen local telemetry scope, not implementation permission. USB removes Wi-Fi credentials/AP/firewall/reconnect dependencies for first measurements and supports ruler/debug evidence. Only one process opens the serial port; close the IDE monitor before receiver use. The precise serial driver/library and COM port are UNKNOWN until preparation; prefer existing tooling and introduce only necessary serial support when authorized.

Local Wi-Fi is the secondary transport after USB proves readings: same validated batches to a protected local Node endpoint on a deliberately allowed LAN interface. It needs network reachability, device secret and allowed origins/transport policy; never ship credentials in frontend code or assume classroom Wi-Fi works. No AWS IoT, MQTT cloud or extra database service is necessary. No remote tunnel is implied.

Receiver is an adapter, not a second backend: same payload parser, calibrator, snapshot model and route/service interface as F2. Before F2, a bounded in-memory latest snapshot/history is sufficient for local display; label it volatile and offline from database persistence. Recorded fixtures are test fixtures, never PHYSICAL live evidence. Later F2 supplies the repository implementation and durable device/readings storage without redesigning the transport.

Contract to settle at H0: schema/source version; device ID; new boot ID each reboot; monotonic sequence/uptime; per-bin identity, distance-or-null, validity/reason, calibration version and valid-sample count. Receiver supplies receivedAt; device capture-time confidence is separate. USB clocks need not pretend to be synchronized UTC. Dedup/order by device+boot+sequence, reject malformed/oversized/unknown-bin batches, preserve last-good reading with age, mark invalid current samples, and bound history. Missing slots display UNKNOWN, never zero-fill. Exactly four final physical slots, never simulator IDs mixed into them. Physical collection verification/jobs, if later authorized, cannot rely on arrival time alone.

### Hardware stages and evidence gates

| Stage | Deliverable / required human action | Evidence to pass |
| --- | --- | --- |
| H0 preparation | Identify exact board/revision/pin labels and power path; inspect actual sensors, resistor values/tolerance and schematic with friend/teammate; define common payload/calibration and receiver boundary | Reviewed wiring/power record, measured parts and approved one-sensor test plan; software fixtures/parser tests may proceed separately |
| H1 one sensor | Teammate verifies unpowered circuit/divider, then supervises energizing; ruler/flat target at empty/intermediate/full positions; filtered distance, calibration | Actual raw/filtered samples, invalid/no-echo test, repeatability/calibrated usable height and structured BIN-001 records |
| H2 two sensors | Independent identities, sequential triggering, cross-talk checks, isolate failed sensor | Two distinct channels track separate targets, no swap/false fill, disconnect/failure behavior and stable local transmission |
| H3 four sensors | All four on reviewed power path, sequential sampling, bounded timeouts, full-cycle timing measured | Repeated four-bin batches; stale/invalid/disconnected states; reconnect/reboot/sequence handling; update frequency chosen from measured stability |
| H4 local Lab | Reuse existing UI with local source-aware statuses and shared receiver endpoint | Genuine changes in all four bins visible with distance/fill/time, invalid versus offline distinguished, receiver/USB restart recovers; no simulated substitution |

Tentative timing/filtering from existing purchase notes (not measured guarantees): sequential triggers, conservative inter-trigger spacing, enough valid samples before a filtered reading and a complete-cycle update rather than treating every ping as a new independent observation. Tune only from cross-talk and latency evidence. Fill is calibrated usable height, not measured garbage volume/mass.

Safety is unchanged: never 5V Echo directly to ESP32 GPIO; no invented GPIO/power table; power off before rewiring; exact board/actual resistor review; multimeter/experienced teammate sign-off before energizing an unverified circuit. Existing reported ten 2k parts are not independently verified or automatically sufficient for four protected Echo circuits. Do not turn the historical divider discussion into wiring approval. Never remotely flash, power or manipulate hardware.

Software can proceed without circuit access: payload fixtures, parsing/range/duplicate/order tests, calibration math, bounded receiver state, stale/error/history contract and mocked UI tests explicitly labeled nonphysical. Measurements required: Echo voltage safety, target geometry, calibration distances, interference, filtering/timing stability, power integrity and all four live end-to-end readings. ESP32 working is owner-reported; HC-SR04/four-sensor success is not established.

## I. One synchronized execution roadmap

| Work package | Dependencies | Concrete completion gate / manual action |
| --- | --- | --- |
| F1-A acceptance/checkpoint | Current uncommitted work | User visual review; resolve confirmed issues; authorized named-file checkpoint only |
| Remaining F1 frontend | Existing engine and F1-A contracts | Fleet/Simulation/Analytics/Physical Lab task polish, complete navigation and actual responsive acceptance |
| H0 + offline telemetry software | No F2 requirement | Teammate board/component review; pure parser/receiver-contract tests can run alongside F1 |
| F2 vertical slices | Stable frontend save contract; account setup separately authorized | Operator configures dedicated dev Atlas secrets/network; real protected write/read/restart and migration gates |
| H1 → H2 → H3 | Previous physical gate, teammate present | One → two → four actual verified channels; no shortcut based on simulated data |
| H4 local display | Valid readings + common local service contract; can precede F2 DB | Local four-bin end-to-end demonstration; in-memory state explicitly volatile |
| F3 core | Stable deterministic engine; F2 needed for durable experiment library | Frozen innovation/recommendation gates, fair comparisons and bounded experiments |
| F4 integration | F1/F2/F3 vertical slices; H4 for integrated physical acceptance | Browser/API/DB quality/security/performance/recovery evidence; separately labeled hardware evidence |
| Municipal deployment | F4 software blockers cleared and explicit deployment authorization | Production secrets/DB/network/packaging/rollback, then authenticated smoke tests |
| Final integrated presentation | Municipal local core + H4, deployment if promised | Demonstrate all required core features plus four genuine local sensor channels; labels distinguish online/local/simulated |

The local Physical Lab can be demonstrated before Atlas exists. Municipal deployment can proceed without hardware if advertised as municipal software with physical monitoring unavailable. An online frontend cannot automatically reach a USB receiver or private ESP32; combined local demo uses the local frontend/proxy. Optional remote hardware access is a later separately approved connection path, not a hidden requirement of deployment.

## J. Deployment plan and final definition of done

Preferred target remains Vercel-hosted Vite assets with a compatible Node/Express API adapter and Atlas. One project or separately hosted frontend/API are packaging options within the same application boundary; choose the simplest supported configuration after a local vertical slice. Existing `vercel.json` specifies Vite build/dist and a non-API SPA fallback, but it does not validate an Express adapter, authentication, database or correct production routing.

Before deployment, recheck current provider documentation/runtime/region/plan terms. **Exact current free quotas, costs, inactivity rules, connection/request/body limits and account eligibility are UNKNOWN in this repository-only audit.** Do not promise zero cost or unlimited demonstrations. Review bandwidth/function usage/log retention/build limits and Atlas storage/connections/availability/backup limits, set bounded pools/payloads/retention, inspect billing and obtain approval before paid resources. No price or legal service eligibility claim is made here.

Server-only environment contract: Mongo URI and database name, operator bootstrap/session secret material, allowed frontend origin, session configuration and later device credential hashes. Names/examples may be committed; actual secrets must not. Keep physical device tokens out of frontend bundles. Separate local/test/production data and disable unsafe public physical demo exposure by default. Restrict Atlas access to the chosen hosting connection arrangement; do not casually substitute unrestricted network access. Use HTTPS in production and an explicit localhost-only development cookie policy.

Build/package smoke gates: API paths never return SPA HTML; login/session/CSRF and expiry work; unauthenticated writes fail; create/update/conflict/duplicate/delete/restore and read-back survive restarts; snapshots/runs persist; server/database outage errors preserve drafts; fixtures remain simulated; Physical Lab unavailable states remain honest. Check logs for redaction, run health/readiness, test backups/import recovery and document rollback to the last valid application/schema version. No long-running playback or USB polling in serverless requests.

Four distinct claims must remain separate:

1. **Local municipal software:** genuine browser workflows and engine results, initially local saves then protected persistence.
2. **Local physical demo:** four independently measured bins through receiver/Lab, no internet claim.
3. **Online municipal platform:** protected deployed API and Atlas with production smoke evidence.
4. **Optional remote hardware monitoring:** separately secured device-to-online path, not established by item 3.

Finished core product means: all seven screens complete their real user tasks; ten innovations meet their declared bounded models; all 26 recommendations have implemented-core or explicit-deferred disposition; City CRUD/migration/history/security/recovery work end-to-end; deterministic planning and results reconcile; accessibility/mobile/performance gates have evidence; local four-sensor measurements and failures are demonstrated; promised deployment is smoke-tested; documentation identifies assumptions, deferrals, operating setup and limitations. User visual acceptance and hardware teammate sign-off cannot be replaced by test counts.

## K. Genuine contradictions, risks and minimal resolutions

- Historical M0-only/AWS restrictions and Supabase architecture coexist in docs. Latest approved frozen Node/Mongo roadmap governs future software; electrical safety remains active. Preserve history, add current authority links during authorized documentation maintenance, do not resurrect obsolete milestones.
- Existing telemetry adapters depend on Supabase while the chosen backend is Mongo. Reuse domain validation/calibration and replace the repository/adapter boundary when authorized; do not provision both systems or claim migration already happened.
- PhysicalLab errors say cloud unavailable even for the proposed local receiver. Minimal future fix: source-aware connectivity wording and same response shape, not a second dashboard.
- Existing firmware output lacks full receiver envelope and four-sensor batching; Wokwi pins are hardcoded. H0 defines the contract; teammate-approved H1 firmware follows. No physical wiring approval can be inferred from source.
- Blueprint originally suggested eight curated fixtures; subsequent authorized replacement established six. Six is the current approved library, not a missing requirement to add two more.
- Browser results and uncommitted code are not a Git checkpoint or user acceptance. Preserve them, obtain visual decision and checkpoint only when authorized.
- Two-step property/city saving and nonpersistent run history remain potential confusion. Keep explicit prompts now; F2 resolves durability without falsely labeling local state cloud-saved.
- Physical freshness thresholds differ across historical notes/current code. Choose one versioned, measured local contract at H0/H3; do not silently mix 20s and 90s assumptions.
- Sensor range validity is not bin-health/calibration validity. Null/unknown, last-good age, current validity and transport freshness must remain distinct.
- One local demonstration does not establish internet sensor reachability, optimal routing or measured city savings. Scope each final claim to its actual evidence.

Next authorized work is a decision on remaining F1 and H0 preparation, followed by separately scoped execution prompts. This audit authorizes none of their implementation and leaves the working tree intact apart from this report.
