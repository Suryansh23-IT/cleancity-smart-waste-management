# CleanCity full-stack product rebuild blueprint

Planning checkpoint: 6 November 2026. Branch `codex/municipal-platform`, application commit `2079179`.

**Planning only.** The new brief selects React/Vite/TypeScript/Tailwind, a Node.js API and MongoDB Atlas for future implementation. Existing source, tests, dependencies, history and data remain unchanged. Historical AWS/Supabase proposals are not instructions for this new work. Physical integration and production deployment remain separately authorized follow-ons.

## 1. Evidence-based assessment

Inspected the current checkpoint, package manifest, core model/storage/forecasting, graph and routing implementation, operator components, telemetry scaffold, product-quality audit and approved upgrade roadmap. The working tree was clean. The completed UX-rescue checkpoint reports 82 passing tests and successful TypeScript/build/browser checks; these are historical results, not tests rerun for this planning document.

Existing value includes versioned City JSON, irregular generation, map authoring/navigation, bulk operations, directed weighted roads and Dijkstra, zoning/heads, capacity-aware planning, fleet playback, modeled costs, two forecast horizons, import/export and browser-local persistence. Preserve these rather than rebuild their algorithms.

Current boundaries and gaps:

- `src/core/storage.ts` persists a validated library under `cleancity.scenarios.v1`, capped at 50 cities. This is browser-local City persistence, not shared database persistence or immutable operating history.
- `package.json` has no MongoDB driver or general municipal API framework. Existing `server/telemetry.ts`, `api/ingest.ts` and `api/physical.ts` are physical telemetry scaffolding, not evidence of Atlas connectivity.
- Capacity/urgency/trip packing are foundations; balanced same-zone scheduling and globally optimal routing are not established. Preserve the audited idle-truck counterexample as a future acceptance fixture.
- Forecasting averages recent growth and resets after a fill decrease. Its two horizons are estimates with quality limitations, not trained prediction.
- Modeled baseline comparisons exist, but a fixed lexical reference does not establish universal savings. Equal service demand and coverage must be checked.
- Controlled closures/traffic, depot placement, sensor deployment planning and immutable what-if comparisons need substantive implementations.

The new F1–F4 sequence replaces the old A/B/C grouping for future execution, while preserving all 26 recommendations. Do not repeat the completed UX rescue.

## 2. Reusable code and systems

| System | Source | Reuse decision |
| --- | --- | --- |
| City schema, parsing, references | `src/core/model.ts` | Preserve version-1 JSON; add server metadata outside it |
| Directed graph/Dijkstra | `src/core/graph.ts` | Retain graph truth; no decorative connectivity or pixel-derived costs |
| AutoZone | `src/core/zoning.ts` | Retain heuristic; add diagnostics before replacing behavior |
| Capacity, routes, costs | `src/core/routing.ts` | Extend only through independently verified fixtures |
| Playback/progress | `src/core/simulation.ts` | Keep animation local; persist bounded terminal results |
| Forecast/insights | `forecast.ts`, `insights.ts` | Expose assumptions and history quality |
| Generation/editing/camera | `presets.ts`, `studio.ts`, `workspace.ts`, `camera.ts` | Preserve seeds, edit impact and navigation semantics |
| Operator/map UI | `Dashboard.tsx`, `CityCanvas.tsx`, `MapSurface.tsx`, `Inspector.tsx`, `FleetPanel.tsx`, `OperationsInsights.tsx` | Improve composition incrementally, retain proven interactions |
| Library and JSON | `src/core/storage.ts` | Preserve recovery/import source throughout migration |
| Physical monitoring | `PhysicalLab.tsx`, `src/core/physical.ts`, telemetry scaffold | Isolate from simulation; no invented readings |
| Existing tests | Core/component/telemetry suites | Preserve fixtures; test changed behavior, not implementation copies |

Shared engine modules remain pure TypeScript, independent of React, HTTP, database and browser storage. Extract only a necessary Node import boundary; no greenfield repository rewrite.

## 3. Frontend architecture and visual system

Primary navigation: Dashboard, Cities, City Studio, Fleet & Dispatch, Simulation, Analytics and Physical IoT Lab. Keep selected city/revision visible across municipal screens; carry city/filter/run context through links. Historical runs identify their captured inputs. Unavailable/deleted cities offer recovery or explicit selection, never a silent switch.

Use white/off-white surfaces, gray-green municipal map context, emerald primary actions, blue selection and amber/red exceptions. Include status text/icons, not color alone. Target roughly 14px body, 12px supporting text, 24–30px titles and an 8px spacing rhythm. Prefer compact tables and a dominant map to repetitive oversized KPI cards. Maintain visible focus, contrast, labels and touch targets.

Desktop uses compact navigation, contextual header, dominant workspace and optional inspector. Mobile uses accessible navigation, map/list switching and inspector sheets without horizontal page overflow. Keep map controls inside the map; engineering details belong to Engineering mode. Background geography must never imply nonexistent routable connections.

Every editing screen distinguishes local draft, saving, saved revision, offline and conflict. Only server acknowledgment means database-saved. Leaving a dirty editor offers save, retain draft or explicit discard. A result cannot silently rewrite its source city.

### Curated library

Propose eight versioned irregular fixtures: Greenfield 40-bin capacity exception; Riverside 20-bin directed corridor; Market 50-bin urgent demand; Three-Depot 40-bin imbalance; Shared-Zone 40-bin coordination; Industrial 50-bin directed access; Metro 100-bin performance; Sparse 30-bin disconnected demand. These are planned fixtures, not claims about existing presets.

Each needs a reproducible seed, cohesive context, thumbnail, learning objective, expected engine checks and declared assumptions. Templates are read-only; customization duplicates to a user city. Intentional failures have clear recovery tasks. Custom authoring/import remains prominent.

## 4. Screen-by-screen specifications

### Dashboard

- **Purpose/user:** commissioner or supervisor deciding the next operational action.
- **Data:** selected city/revision/save state, urgent demand, fleet readiness, latest plan/run and unresolved exceptions; simulated demand excludes physical telemetry.
- **Hierarchy:** city context and one primary next action, large readable map, compact demand/fleet summary, ranked actionable exceptions and latest operation.
- **Actions/navigation:** inspect filtered bins, focus exception, open Studio, prepare dispatch, resume simulation or open results; preserve city/filter/run context.
- **Empty/edit workflow:** no city offers template/create/import; no plan offers Prepare dispatch. Stale plan explains changed inputs. Edit operational inputs in their dedicated workspace with a return link.
- **Success:** a beginner finds urgent demand and enters the correct collection workflow without interpreting graph IDs.

### Cities

- **Purpose/user:** planner managing reusable municipal inputs.
- **Data/hierarchy:** searchable user cities, curated templates and local drafts; meaningful thumbnails/counts, revision and saved time; distinguish templates from owned data.
- **Actions/navigation:** create/view/edit/duplicate/rename/delete/restore/export/import/save/reload; select city for Dashboard or Studio.
- **Empty/edit workflow:** guided creation asks name/layout/demand/heads/fleet and previews defaults. Templates duplicate before editing. Soft-delete identifies the city and offers restore. Invalid import preserves current work.
- **Success:** duplicate/edit/save/close/reload restores the exact city while original templates and unrelated saved cities survive.

### City Studio

- **Purpose/user:** planner authoring roads, bins, zones and depots without graph expertise.
- **Data/hierarchy:** dominant map, concise tool rail, searchable object list, contextual inspector and validation/save summary. Friendly names precede IDs.
- **Actions/navigation:** draw/connect roads, place/edit bins/heads/zones, bulk actions, undo/redo, fit/search/layers and map modes; validate then continue to Fleet.
- **Empty/edit workflow:** guided first head/road/bin or seeded generation. Inspect is read-only. Destructive topology edits explain affected plans; harmless metadata edits preserve valid assignments. Visual bin position remains separate from routing access node.
- **Success:** author an irregular 30–45-bin, three-head city with mixed directions/bulk edits; validate references, undo safely and reload exact topology.

### Fleet & Dispatch

- **Purpose/user:** supervisor assigning service and reviewing a defensible plan.
- **Data/hierarchy:** zone workload/coverage, roster/availability/capacity, selected truck route/legs and pending reasons. Put objective/settings before Plan.
- **Actions/navigation:** assign/enable trucks, edit assumptions, plan, inspect routes, resolve exceptions; review then Simulate. Expose time-first/distance-first only when implemented.
- **Empty/edit workflow:** absent heads/zones/trucks link to the precise corrective editor. Infeasible plans remain inspectable. Input edits mark earlier plans stale.
- **Success:** explain which truck serves each bin and why demand remains; unavailable trucks never appear ready, and capacity recovery changes the actual plan.

### Simulation

- **Purpose/user:** supervisor/student observing reproducible modeled operations.
- **Data/hierarchy:** active-route map and identifiable trucks, playback/virtual clock, selected vehicle state/load/stops/distance, concise event timeline and coverage.
- **Actions/navigation:** play/pause/speed/reset/select/follow/inspect; finish opens Analytics for the run. Save result explicitly.
- **Empty/edit workflow:** no plan routes to Dispatch. Inputs are snapshot-locked; edits start a new session. Reset restores exact fills/inputs. Distinguish transit, service, unloading, idle, complete and infeasible.
- **Success:** trucks follow real directed roads, service completion triggers pickups, totals reconcile, and no database operation occurs per animation frame.

### Analytics

- **Purpose/user:** commissioner comparing policies and supervisor reviewing modeled outcomes.
- **Data/hierarchy:** scenario/run identity and comparability banner, outcomes, cost/time/distance breakdown, coverage/pending work, truck/zone details and forecast panel.
- **Actions/navigation:** compare snapshots, vary a controlled assumption, inspect source/routes, export CSV/print; copy historical inputs back to Dispatch.
- **Empty/edit workflow:** no run offers a guided operation. Mismatched demand/coverage is explained before savings. Assumption changes create another scenario, never rewrite history.
- **Success:** totals reconcile with inputs/events; zero/negative savings remain visible; both forecast horizons expose quality/units/unavailable states. Savings and emissions are explicitly modeled.

### Physical IoT Lab

- **Purpose/user:** hardware integration team inspecting genuine measurements later.
- **Data/hierarchy:** physical-source banner, configured devices, last received/device time, freshness/validation, device history and integration status.
- **Actions/navigation:** inspect/filter/export genuine readings when available; documentation links. Protected device registration belongs to later integration.
- **Empty/edit workflow:** honest Not connected/No validated readings today; no fake chart. Simulation generation/import cannot populate physical readings.
- **Success:** absence remains visible; later acceptance requires a genuine authenticated measurement stored and displayed. F1–F4 do not authorize hardware activity.

## 5. End-to-end workflows

1. First use: template/create/import → preview/validate → local draft → Studio → save → Dashboard. F1 labels browser-local saving; F2 requires API acknowledgment.
2. Operate: select revision → inspect demand → validate zones/fleet → plan → inspect pending work → capture snapshot → playback → terminal result → explicit save → Analytics/report.
3. Recover demo capacity exception: inspect pending reason → modify suitable capacity/assignment in a copy → replan → verify coverage and changed costs. Never delete demand or permit overload to make the demo pass.
4. Experiment: duplicate snapshot → change one variable (1/2/3 trucks, capacity, zoning, closure) → run identical initial demand/seed → compare coverage, fleet completion time, summed vehicle time, distance and costs.
5. Resume: reload exact saved city/scenario/result independently. Preserve drafts separately. Applying completed simulated fills to the city is an explicit revision/hash-checked operation.
6. Failure/conflict: retain draft on stale save/outage; offer compare/reload/save-as-copy/export/retry. Idempotent retries must not duplicate runs/imports.

## 6. MongoDB data model

Embed the bounded City aggregate because graph, bins, zones and assignments are read, validated and saved together. Reference independently growing history/telemetry, following MongoDB's [modeling guidance](https://www.mongodb.com/docs/manual/data-modeling/best-practices/).

| Collection | Fields and lifecycle | Initial indexes |
| --- | --- | --- |
| cities | UUID _id, server workspaceId, schemaVersion, revision, existing version-1 City, template provenance, timestamps, deletedAt; embed nodes/roads/bins/zones/trucks/settings | workspaceId/deletedAt/updatedAt/_id library pagination |
| scenarios | Immutable validated full input snapshot, source city/revision, hash, seed, assumptions, engine version, label | workspaceId/sourceCityId/createdAt/_id |
| runs | Scenario reference, engine version, verified plan, bounded terminal events/fills/summary, pending reasons, verification status, requestKey | workspaceId/scenarioId/createdAt; unique workspaceId/requestKey |
| sessions | Hashed opaque token, workspace scope, created/expiry time | unique tokenHash; expiry TTL plus explicit request-time expiry check |
| future devices | Physical identity, hashed credential, enabled state, bin mapping | unique workspaceId/deviceId |
| future sensorReadings | Physical source, device/bin, bootId/sequence, deviceTime/receivedAt, raw/validated reading and quality | unique device/bootId/sequence; workspaceId/binId/receivedAt |

Telemetry retention is a later explicit decision; no silent deletion of evidence. No per-frame positions in MongoDB. Begin with a 2 MB import ceiling and explicit entity/event limits validated by profiling. Split runEvents only if measured history growth justifies it. Keep server metadata outside existing City export; offer a separately versioned archive for full history.

Use atomic compare-and-set saves filtered by workspace, ID and expected revision; validate the full aggregate and increment revision once. Enforce nested-ID uniqueness, references, finite valid units and assignment consistency in the service validator. Ordinary City saves need no multi-document transaction. Soft-delete/restore City while retaining historical snapshots/runs.

Treat browser results as untrusted. Deterministically verify/replay against captured inputs and engine version before marking verified. Save terminal results, not frames. Unsupported historical engine versions remain readable; do not silently recalculate old evidence under a new algorithm.

## 7. Node API structure and contracts

Recommend TypeScript Express, native MongoDB driver and one runtime validation library in F2; avoid duplicate ORM schemas. Separate application initialization from local listener. Routes call services, services enforce domain rules, repositories scope database access. Shared core remains browser-independent. Keep existing physical APIs isolated until an authorized migration.

| Endpoint | Contract |
| --- | --- |
| GET /api/health, /api/ready | Distinguish process health from real database readiness; sanitized response |
| POST /api/session; DELETE /api/session | Protected operator login/logout and expiring opaque session |
| GET/POST /api/cities | Scoped paginated list/create; server identity/revision |
| GET/PUT/DELETE /api/cities/:id | Read/validate whole aggregate/soft-delete; expected revision required |
| POST /api/cities/:id/duplicate, /restore | New identity copy or explicit restore |
| POST /api/imports/preview, /commit | Bounded validation, selected imports, idempotent commit |
| GET/POST /api/scenarios; GET /api/scenarios/:id | Immutable input snapshots |
| POST /api/plans | Validated captured inputs to canonical plan/warnings/version |
| GET/POST /api/runs; GET /api/runs/:id | Verify/save terminal result; retrieve scoped history |
| POST /api/cities/:id/apply-run | Explicit source revision/hash-checked simulated outcome |

Whole-City PUT is sufficient initially. Add typed nested PATCH only for a demonstrated need; never accept arbitrary Mongo update operators/field paths. Idempotency keys bind to input hashes; reusing a key with changed input returns 409.

Success envelope: `{data, meta}`. Error envelope: `{error:{code,message,fields?,requestId}}`. ETag/revision on reads, If-Match on updates: 428 absent, 409 stale. Also use 400 malformed, 401 unauthenticated, 403 forbidden, 404 unavailable, 413 oversized, 422 domain validation, 429 rate limited, 503 database unavailable. Return actionable field errors, not raw driver messages.

Minimal authentication: single operator workspace initially. A strong server bootstrap secret establishes an expiring HttpOnly opaque session. No secret in frontend environment variables or localStorage. Hash stored tokens; rate-limit login/writes; validate Origin and CSRF token for cookie-authenticated mutations; derive workspace scope from session, never the request body. Secure cookies on HTTPS with a documented localhost-only HTTP development setting. Exact-origin CORS is not authorization. Public demo uses bundled read-only data; multi-user invitations/RBAC remain deferred.

Keep URI/session secrets in ignored server environment files; examples contain variable names only. Use least-privilege DB access, restricted Atlas network access and separate development/test data. Sanitize logs and reject unrecognized query fields. No unrestricted public writes, raw query passthrough or credential-bearing logs.

## 8. Local architecture and migration

Vite at 127.0.0.1:5173 proxies relative /api requests to Node at 127.0.0.1:3001. F2 separately authorizes a dedicated Atlas development database. Optional local MongoDB supports offline backend development; local-first does not make Atlas work offline. Bundled demos/local drafts remain usable with honest connectivity/save states.

Reuse one cached MongoClient initialization promise per process/function instance, reset rejected initialization, bound pool/wait/server-selection limits and close on local shutdown rather than each request. Concurrent instances have separate pools; load-test aggregate connections. Follow the driver's [pool documentation](https://www.mongodb.com/docs/drivers/node/current/connect/connection-options/connection-pools/), not relational pooling assumptions.

Migration: read existing storage unchanged → offer raw backup/export → validate each city independently → preview valid/invalid items → explicitly select imports → create server identities with provenance/local mapping → read back and compare normalized contents → mark migration complete. Retries use idempotency keys. One corrupt entry cannot discard other cities. Never automatically clear localStorage; cleanup requires verified backup and explicit operator action. Failed migration preserves originals, export and local drafting.

Version schema transformations and test round-trip compatibility. Reject unknown future schemas without overwriting originals. Integration tests use isolated database namespaces; cleanup must never target the operator library.

## 9. Feature inventory and completeness

| Core innovation | Current completeness | Planned meaningful implementation |
| --- | --- | --- |
| 1 AutoZone | Existing heuristic, not geographic optimum | F3 workload/contiguity/round-trip diagnostics; stable fill-only edits and manual override |
| 2 Cost-aware routes | Directed distance, urgency/nearest heuristics and cost evaluation; no global guarantee | F3 explicit objectives, component costs, feasible comparisons and transparent trade-offs |
| 3 Smart scheduling | Threshold/urgency/trip-packing foundation | F3 candidate finish-time assignment, deterministic ties, 1/2/3-truck balance and decision explanations |
| 4 Capacity | Existing loads/trips/unload foundation | F3 heterogeneous vehicles, explicit starts/returns/unload states; oversized jobs remain infeasible |
| 5 Savings | Modeled comparison; lexical baseline weak | F3 operator-defined reference/reproducible policy, equal-demand coverage gate and negative/zero outcomes |
| 6 Overflow | Two recent-average horizons with quality limits | F3 seeded growth, explicit pickup reset/window controls and synthetic backtesting; no ML claim |
| 7 Closures/traffic | Missing scenario layer | F3 pre-dispatch disabled roads and declared speed multipliers over actual graph; original graph unchanged |
| 8 Depot placement | Heads editable, optimizer missing | F3 candidate-node, demand-weighted directed round-trip k-site heuristic with unreachable penalties; tiny exact enumeration reference |
| 9 Sensor deployment | Physical scaffold, planner missing | F3 budgeted bin selection with explicit risk/criticality/coverage objective, greedy marginal gain, tiny exact checks and sensitivity |
| 10 What-if | Editable inputs; controlled history missing | F2 snapshots/results; F3 same-demand fleet/capacity/zoning/closure/depot comparisons |

Depot/sensor planners require explicit mathematical objectives and toy reference fixtures before UI claims. Use Recommended depot locations for heuristic results. Sensor placement estimates do not validate real circuitry, sensing accuracy or physical deployment.

### Preservation of U01–U18 and N01–N08

The [original audit](product-quality-audit.md) and [upgrade roadmap](upgrade-roadmap.md) remain intact. All IDs are retained below; mapping does not imply implementation completion.

| IDs | Core home | Advanced optional scope |
| --- | --- | --- |
| U01, U02 | F1 non-destructive edits/read-only modes; F2 revisions; F4 regression | None required |
| U03, U04, U05 | F1 custom/bulk authoring, camera/search/layers and municipal map modes | Additional gestures after usability evidence |
| U06 | F3 time-first/distance-first same-zone coordination | More complex optimization only if justified |
| U07 | F1 route composition; F3 actual legs/load/state/follow | None required |
| U08 | F3 workload/contiguity/round-trip diagnostics | Stronger repartitioning after verification |
| U09 | F3 pre-dispatch closures/traffic/exceptions | Mid-route breakdowns/closures/emergency reassignment |
| U10 | F2 immutable snapshots/results; F3 comparisons | Large experiment orchestration |
| U11 | F3 fair reference policies, costs and coverage gates | None required |
| U12 | F1 visual offsets/access-node clarity | Explicit service-offset cost if needed |
| U13 | F1 honest roster; F3 per-truck workloads/progress | None required |
| U14 | F3 seeded growth/pickup events/forecast quality | Forecast-aware optional pickups after baseline tests |
| U15 | F3 reconciled CSV/print reporting | Additional formats |
| U16 | F3 starting locations/head transit/unloading | Queues/shifts/complex horizons |
| U17 | F1 accessible recovery; F2 conflicts/migration; F4 audit | None required |
| U18 | F4 planning/render/memory measurement; baseline in F1 | Worker only if profiling warrants |
| N01 | F3 single-stream compatibility eligibility | Multi-compartment optimization |
| N02 | Explicit retained backlog: turn/access restrictions | Incoming-edge path state/vehicle rules, separate approval |
| N03 | F3 due/overdue commitments and reasons | Recurring windows/waiting |
| N04 | Explicit retained backlog: crew/handling feasibility | Equipment/crew constraints, no staffing-law claims |
| N05 | F3 bounded seeded uncertainty/reserve experiments | Large statistical campaigns |
| N06 | F3 editable modeled travel/idle/service emissions factors | Calibrated energy model only with evidence |
| N07 | F3 independent tiny path/order references and invariants; F4 regression | No large-city optimality claim |
| N08 | F3 structured actual dispatch reasons | No fabricated AI rationale |

## 10. Milestones, order and acceptance

Four substantial releases, not four quick cosmetic prompts. Usability/security/testing start immediately. Each future milestone needs actual evidence and a reviewed Git checkpoint; no deployment is implied.

### F1 — Professional Product Frontend

Order: operator-task compositions → shell/context/save states → Cities/eight fixtures → Dashboard/Studio → Dispatch/Simulation/Analytics → physical empty states → browser acceptance. Put current local persistence behind a narrow interface for F2; keep local saves clearly labeled. No fake primary actions.

Acceptance: beginner completes create/duplicate/edit/validate/save/reload/plan/simulate/results and capacity recovery; unrelated cities survive. Every screen has functional navigation, empty/error/dirty states and accessible actions. Actual desktop/mobile browser review covers irregular 40-bin and 100-bin cities, all map modes, keyboard and camera scales; retain screenshots/task outcomes. Existing tests/typecheck/build pass with read-only/edit-impact/reset regression coverage. No engine rewrite.

### F2 — Node.js + MongoDB Atlas

Depends on F1 state contracts. Order: application/API validation → protected real database vertical slice → City CRUD/revisions → conflicts/failure → migration → snapshots → verified terminal results. Prove browser → authenticated Node → dedicated database → fresh read. Mocks alone cannot pass F2.

Acceptance: persistent CRUD/restore survives API/browser restart and read-back confirms revision. Two-tab conflicts preserve drafts. Outages do not show Saved; retries do not duplicate records. Unauthorized/cross-workspace/CSRF/oversized/malformed requests fail safely; secrets absent from assets/logs. Migration handles corruption/retry without clearing originals. Historical snapshots/results survive city edits/deletion. Integration tests use isolated real database data.

### F3 — Advanced Municipal Intelligence

Depends on snapshot/result stability. Order: independent fixtures → multi-truck objectives/inspection/explanations → zone/depot/unload correctness → fair comparison/reporting → pre-dispatch closures/traffic → depot/sensor planners → seeded growth/compatibility/commitments → bounded uncertainty/emissions. Innovations 7–10 get functional workflows, not placeholder cards. Optional dynamics remain deferred if foundations fail.

Acceptance: identical-demand 1/2/3-truck experiments demonstrate balance and report extra distance/cost honestly. Cover heterogeneous/excess/unavailable trucks, oversized jobs and disconnected graphs. No illegal edge/return, duplicate pickup, overload or time reversal. Coverage, load conservation, pending reasons, distance, fleet elapsed time and summed vehicle time reconcile. Independent tiny path/order oracles check heuristics. Seeds reproduce results. Closures preserve original/history; traffic changes declared modeled time. Depot/sensor toy cases cover zero budget/demand, ties and unreachable candidates. Reports preserve zero/negative savings and safe CSV. Both forecast horizons handle stale/future/noisy/flat/insufficient history and explicit pickup. Compatibility/commitments/uncertainty/emissions expose assumptions, not invented certainty.

### F4 — Quality, Integration and Deployment Preparation

Order: action matrix → end-to-end/recovery → accessibility/mobile/cross-browser → performance/security → reproducible setup/schema versioning → future deployment/IoT contracts. No real hardware integration or production deployment.

Acceptance: trace primary actions across all seven screens; every innovation/recommendation has evidence or explicit deferred status. Run full tests/typecheck/build and real browser journeys, API restart/reload, conflicts/migration/outage recovery. Record exact actual results and unavailable platforms honestly. Measure repeated planning/frame/memory behavior at 10/20/50/100 bins on a named machine. Proposed starting targets are 100-bin planning p95 below one second and playback around 30 fps; these are unmeasured targets to validate/adjust after baseline. Audit auth, authorization, validation, secret exclusion, rate limits and safe recovery. Deliver local setup, future adapter/routing checklist, environment variable names and device contract without provisioning resources.

## 11. Dependencies, risks and deferred work

Separate Node initialization/listening from the future provider adapter. Vercel supports [Express backends](https://vercel.com/docs/frameworks/backend/express), but implementation must recheck then-current runtime/request limits. Exclude API paths from SPA fallback, use relative URLs and no filesystem persistence. Never run wall-clock playback/background timers inside a function request. Bound verification/experiments first; durable job infrastructure requires a demonstrated need and separate decision.

Main risks: UI scope without coherent journeys (review compositions first); draft/server/history confusion (explicit revisions/states); algorithm drift (version snapshots and engine); Atlas network dependence (local drafts/export/honest errors); unfair savings (coverage/assumption gates); excessive connections/payloads (bounded pools/history, measured tests); premature realism (deterministic load/state invariants before dynamic incidents).

Retain advanced backlog: mid-route failures/rerouting, unloading queues/shifts, turn/access restrictions, crew/equipment, complex windows, multi-compartment vehicles, calibrated ML, real GPS/traffic, paid maps, multi-tenant roles and durable large experiments. These are not silently discarded or prerequisites for the reliable core.

Physical follow-on requires separate authorization and genuine evidence: ESP32 → authenticated HTTPS → validated MongoDB reading → physical UI, with replay/freshness checks. Simulator pickups never establish physical collection. Hardware debugging remains paused; this plan approves no wiring/power/pin mapping. Production deployment is a separate task after local gates.

## 12. Decision and approval boundary

Recommend **F1 coherent product usability → F2 protected durable persistence → F3 verified intelligence → F4 measured quality/readiness**. The principal trade-off is a bounded single-operator API and embedded City aggregate now, with immutable historical collections, rather than a distributed rewrite. This supports a polished, technically defensible final-year platform while preserving extensible boundaries.

This task creates this document only. No source changes, dependency installation, credentials/database setup, Git commit, push, merge or deployment. Stop and await implementation authorization.
