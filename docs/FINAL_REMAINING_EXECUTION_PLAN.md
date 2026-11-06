# CleanCity — Final Remaining Execution Plan

Planning date: 6 November 2026. This document authorizes no implementation, circuit activity, COM access, account configuration or deployment.

## 1. Authority, checkpoint and evidence

Current branch: `codex/municipal-platform`. Exact application checkpoint: **`5eac6205e94f4267d7b4aa1a06d11a050ccef779`**, preserving F1 and the working local four-sensor prototype. Git status was clean at the start of this planning task.

Authority, newest first: the final remaining-execution brief and ten-bin showcase decisions; the approved local USB/Node/SQLite demonstration; [full-stack blueprint](fullstack-product-rebuild-blueprint.md); [26-recommendation roadmap](upgrade-roadmap.md) and [original audit](product-quality-audit.md). The blueprint's F1–F4 product sequence remains authoritative. Historical AWS-first, Supabase production and M0-only software descriptions are not instructions to revert architecture. Electrical safety and evidence rules remain applicable.

The blueprint's original eight-fixture proposal was superseded: preserve **six curated templates plus five simulation-ready cities**. The new ten-bin showcase is an additional dedicated city, not their replacement.

| Status | What is established | Evidence boundary |
| --- | --- | --- |
| Completed/recorded | Seven F1 screens; browser-local Cities/Studio workflows; directed graph, zoning, fleet planning, playback, costs and two forecast horizons | Checkpoint source and prior F1 verification reports; full advanced scope is not implied |
| Completed/recorded | Real four-channel USB COM8 → Node → SQLite → Physical IoT Lab display; retained history and receiver restart observed | Prior user-connected live session; electrical protection was user-reported, not independently verified |
| Completed/recorded | 140 tests in 13 files, TypeScript and production build passed | Last checkpoint validation; **not rerun for this planning-only task** |
| Newly checked | Branch/HEAD/clean starting status; blueprint/audit mappings; municipal schema/storage, local receiver contracts and deployment configuration | Read-only repository inspection in this task |
| Pending | Purchased/mounted four-bin showcase, per-channel calibration and controlled physical acceptance | No final physical-demo completion claim |
| Pending | Ten-bin city and provenance-preserving telemetry snapshot bridge; F2, remaining F3, F4 and deployment | Existing local receiver is not the municipal MongoDB backend |
| Deferred | Advanced dynamic incidents and other optional extensions listed below | Retained explicitly, not required for reliable core acceptance |
| Blocked by prerequisites | Final calibrated live evidence and final integrated recording | Actual bins/mounting, Vishal's verification and software bridge must exist first |

Current receiver status is recorded as intentionally stopped. This task does not reopen it or inspect live measurements. Local SQLite history remains in ignored `.local/` storage. See [checkpoint verification](milestone-checkpoint-verification.md) and [local setup/evidence guide](local-iot-demo.md).

## 2. Two delivery tracks and priority order

**Professor demonstration track:** lock a feasible physical/digital map → approve and procure four bins → mount/calibrate/test hardware; in parallel implement the ten-bin city and explicit snapshot bridge → rehearse using existing Dispatch/Simulation/Analytics → capture final genuine evidence. This track can run locally before Atlas or deployment. It must be described as a local hybrid demonstration with modeled collection, not a finished cloud platform.

**Full-product track:** F2 protected persistence and migration → remaining F3 verified intelligence → F4 integrated engineering acceptance → separately authorized deployment. Continue this in parallel with procurement and physical assembly. None of the ten innovations or 26 recommendations is dropped to shorten the showcase path.

Priorities: **P0** reliable local showcase and preservation; **P1** full-product core requirements; **P2** final engineering/release/presentation after stable behavior; **D** explicitly deferred extensions. Work can overlap, but completion claims follow evidence gates rather than dates.

## 3. Team responsibility matrix

| Owner | Accountable deliverables | Required handoff / limit |
| --- | --- | --- |
| Suryansh + Codex | All software; ten-bin city; physical/virtual provenance; local Lab integration; F2/F3/F4; Git and deployment preparation; technical report and video coordination | Request implementation authorization separately; no remote physical approval or flashing |
| Vishal | Electronics/protection review; mounting support; independent measurement tests; four-channel calibration; final circuit verification | Record actual board/power/protection checks and measured results; physical operation belongs to the team |
| Suryakant | Matching physical map; roads, boundaries, heads and bin positions; printable layout; digital/physical coordination; noncoding QA | Deliver the numbered map package below before final layout lock |
| Raj | Purchase four suitable dustbins after compatibility approval; materials, mounts and physical assembly | Procurement follows dimensions/fit approval from Vishal and map coordination with Suryakant |
| Two seniors | PPT and presentation preparation | Use approved report figures and measured evidence; coordinate narrative with Suryansh |

Report contribution highlights should focus on Suryansh, Vishal and Suryakant as requested, with accurate credit to Raj and the seniors. Label proposed work as planned until delivered; do not invent contribution percentages or completed tasks.

## 4. Exact task inventory — physical model (P0)

| ID | Remaining task / output | Owner | Dependencies and acceptance |
| --- | --- | --- | --- |
| H01 | Select bin dimensions, mouth/lid shape, usable depth, sensor clearance, mounting/material requirements | Raj + Vishal; Suryakant checks layout fit | Approve compatibility before buying four. Sensor blind range, target geometry and service access must fit; no untested dimension guarantee |
| H02 | Procure four suitable bins and model/mounting materials | Raj | H01 approval; record actual dimensions and label bins consistently |
| H03 | Deliver printable physical map and digital layout specification | Suryakant + Suryansh | Road/junction IDs and directions, modeled road lengths, scale/print size, boundary, four real/six virtual bin sites, two proposed heads/zones and two truck homes; digital feasibility review before irreversible assembly |
| H04 | Dry-fit bins, sensors, removable mounts and cable paths | Raj + Vishal | H02/H03; stable orientation, unobstructed target cone, accessible power/USB, strain relief and safe handling |
| H05 | Review actual board/revision/labels, power path, Echo protection and existing circuit | Vishal + experienced helper as needed | Unpowered review and meter/technician check before any changed circuit is energized; never direct 5V Echo to ESP32 GPIO; no software-side wiring approval |
| H06 | Assemble map, roads, heads, zone labels, bins and wiring management | Raj + Suryakant; Vishal checks electronics | H03–H05; physical road intersections and digital graph junctions agree. Clearly mark six virtual sites, not six invented sensors |
| H07 | Measure each mounted channel against ruler/flat targets; calibrate empty distance and usable depth | Vishal | Stable reviewed mounts/circuit; record channel, mounting, date, dimensions, valid distance range and reference positions. Do not copy one channel's dimensions blindly |
| H08 | Test empty/partial/near-full readings repeatedly, then independent target changes on all four channels | Vishal; Suryansh observes Lab | H07; document raw distance, expected position, computed fill, variation and chosen tolerance. Agree tolerance before acceptance; report height fill, not mass/volume |
| H09 | Controlled no-echo/invalid, quiet/stale, USB loss/reconnect and receiver restart/persistence checks | Vishal performs physical actions; Suryansh records software | H05/H08; stale data never becomes a fresh successful reading; recover explicitly without losing retained data or swapping identities |
| H10 | Integrated physical acceptance and demonstration rehearsal | Entire team; Suryakant noncoding QA | H06–H09 + software D01–D08 below; no final completion until four independently calibrated channels pass |

If mounting/wiring changes, repeat the relevant protection and measurement checks. Existing working firmware is preserved; there is no automatic reason to reflash it. Before the final circuit is reconnected, Vishal must review any changed power/wiring. Purchasing bins alone does not pass calibration.

## 5. Ten-bin showcase requirements and integration tasks (P0)

**Layout lock package required from Suryakant:** one annotated drawing with printable dimensions, explicit junction/road connections, arrows for one-way roads, nonconnected crossings marked, four physical bin positions, six virtual positions, proposed two heads/two responsibility areas, two truck home depots and matching labels. Suryansh verifies directed internal round trips before final printing/assembly. If infeasible, revise explicit roads/heads or assignments together; do not permit hidden cross-zone transit to force success.

| ID | Remaining software task | Acceptance / dependency |
| --- | --- | --- |
| D01 | Add one versioned dedicated showcase city without changing the existing eleven cities | Exactly ten planning bins; four mapped real channels and six visibly virtual bins with low initial modeled fill. Digital roads match approved physical connections; modeled km are declared assumptions, not print-pixel measurements |
| D02 | Store explicit one-to-one mapping from BIN-001…004/channel identity to four showcase bin IDs | No duplicate/missing mapping, no automatic assignment by array order, no other city modified; labels on hardware, Lab and municipal inspector agree |
| D03 | Design backward-compatible snapshot/provenance metadata | Current `Bin.source` accepts only `SIMULATED`; do not simply relabel City JSON as live. Preserve City v1 imports/saved cities using a versioned scenario envelope/sidecar or explicitly reviewed compatible extension, with round-trip/migration tests |
| D04 | Add explicit validated-reading preview → operator-confirmed planning snapshot | Show selected city/mapping, distance, calibration identity/parameters, receipt time, age/status, captured time and physical-derived fill alongside six modeled fills. Require fresh VALID calibrated readings for all four in the final live showcase; list failures and block final-live capture rather than silently substituting last-good or zero |
| D05 | Freeze snapshot inputs for planning/playback | Existing route engine consumes numeric fills without becoming a telemetry engine. New readings cannot mutate an active plan; refreshing creates a new snapshot. Record immutable source references; keep physical receipt time separate from virtual simulation time |
| D06 | Validate proposed two zones/two trucks | Two selected collection heads seed two feasible partitions; one appropriately sized truck assigned to each. Every pickup and return uses only actual directed roads inside its partition. Oversized/unreachable work stays pending with reasons; no duplicate pickups or overload |
| D07 | Integrate Dashboard → Dispatch → Simulation → Analytics | Display MIXED-SOURCE PLANNING SNAPSHOT with per-bin PHYSICAL-DERIVED or VIRTUAL labels. Playback pickups do not clear live telemetry, alter calibration or assert a real collection. Virtual bins remain low unless explicitly changed as a separate modeled scenario |
| D08 | Offline fixtures, recovery and regression checks | Labeled TEST fixtures cover unknown/stale/invalid/no-echo/uncalibrated/missing channel, mapping error, snapshot refresh, save/reload and original-city preservation. Test complete workflow before bins exist; fixtures never appear as genuine live evidence |
| D09 | Save/export snapshot provenance and results appropriately | Before F2, explicitly local/versioned artifact with honest persistence limits; after F2, immutable scenario/run records. City-only JSON export must not be mistaken for a full provenance archive. No raw telemetry dump or device credentials in Git |

Snapshot bridge boundaries: physical Lab remains authoritative for observed local telemetry; copied fill is an **input observation** for a modeled planning run. Never project synthetic history backwards to pretend the four sensors supplied a forecast series. Forecasts for physical-derived bins require enough genuine retained history under a defined time basis, otherwise show unavailable. Simulated completion is not evidence of a physical pickup.

Demonstration steps: identify four real/six virtual sites → change targets and inspect four fresh calibrated Lab readings → preview/capture snapshot → inspect provenance and eligible bins → AutoZone/validate two heads → review two assigned trucks and actual routes → plan and animate → inspect completion, costs, coverage and assumptions. If no real bin exceeds threshold, zero pickups is correct; the human must change actual target conditions to demonstrate eligible physical demand, or explicitly switch to a separate simulated example.

## 6. F2 — protected Node/Express/MongoDB backend (P1)

SQLite remains the dedicated local physical store. Atlas is the planned municipal persistence layer; do not copy SQLite files into serverless storage or rebuild the proven USB parser. Reuse telemetry validation, calibration, freshness and snapshot contracts behind repository/service boundaries. Historical Supabase adapters are not MongoDB implementation evidence and must not be accidentally enabled as a second authoritative backend.

| ID | Remaining vertical slice | Completion gate |
| --- | --- | --- |
| B01 | Separate Express application/services/repositories from local listener and provider adapter; shared pure engine boundary | Local health and sanitized DB readiness differ; bounded configuration, validation and error contracts; no cloud provisioning inferred |
| B02 | Dedicated development Mongo database, scoped indexes and bounded client pool | Separately authorized account/network/secrets setup; real protected browser → Node → DB → fresh read succeeds. No mock-only F2 pass |
| B03 | Minimal single-operator workspace authentication and secure API | Server-held bootstrap secret, hashed expiring session token, HttpOnly cookie, Origin/CSRF enforcement, scoped queries, login/write throttling, body limits and redacted errors/logs; no credential in assets or localStorage |
| B04 | City list/create/read/update/duplicate/soft-delete/restore | Preserve City aggregate/JSON; server IDs/revisions outside export; compare-and-set updates, explicit missing/stale revision errors; restart/read-back proves persistence |
| B05 | Safe localStorage migration | Backup → per-city validation/preview → selected idempotent import → normalized read-back. Preserve originals on corruption, outage or retry; never clear browser library automatically |
| B06 | Immutable scenarios, verified terminal runs and history | Capture full inputs/hash/seed/assumptions/engine version and provenance; recompute/verify untrusted results; idempotent run saves. No per-frame database writes; source edits/deletion do not erase history |
| B07 | Conflict, outage and recovery UX/integration tests | Two-tab stale save preserves draft; save-as-copy/export/retry work; unauthorized/cross-workspace/malformed/oversized requests fail; no false Saved state or duplicate imports/runs |

F2 gate: all B01–B07 with isolated real-database integration evidence, restart durability, secret exclusion and successful browser workflow. A local demo does not require this gate; a protected full-stack deployment does. Optional local Mongo supports offline development; it does not make Atlas available without internet.

## 7. F3 — all ten approved innovations (P1)

Implement bounded vertical slices after snapshot/result contracts stabilize. Tiny reference fixtures and pure domain tests can begin while F2/hardware work proceeds. Do not add new major features or claim heuristic global optimality.

| Innovation | Preserved foundation | Remaining core / acceptance |
| --- | --- | --- |
| I01 AutoZone | Head-seeded disjoint internally reachable responsibility | Workload/imbalance diagnostics and controlled adjustment; retain strict internal round trips, unassigned reasons and stable harmless edits. Measure trade-offs rather than promising equal work |
| I02 Cost-aware routes | Directed weighted paths and evaluated modeled costs | Explicit time-first/distance-first objectives, visible component costs and reproducible trade-offs; road weights remain authoritative |
| I03 Smart scheduling | Threshold/urgent eligibility and multi-trip packing | Same-zone candidate finish-time balancing, deterministic ties and actual dispatch explanations; improve audited idle-truck fixture; compare 1/2/3 trucks on identical demand |
| I04 Capacity management | Loads, service, unload and depot return | Heterogeneous/excess/unavailable/oversized fleets and explicit initial positions; preserve load conservation and feasible return, no cross-partition transfer |
| I05 Savings analysis | Modeled costs and coverage-gated comparisons | Strong operator-defined/reference policy independent of arbitrary IDs. Separate equal-demand route-efficiency comparison from all-bins-full-round versus threshold service-policy comparison; expose coverage and zero/negative savings |
| I06 Overflow forecasting | Two recent-history horizons | Seeded virtual growth, explicit pickup resets, configurable windows and synthetic backtests; stale/future/noisy/flat/insufficient histories handled; retain quality/units and no trained-AI claim |
| I07 Closures/traffic | Graph and pending-reason foundations | Pre-dispatch road disablement and declared speed multipliers on copied scenarios; legal directed routes, changed time and unreachable work verified; original/history unchanged |
| I08 Depot placement | Editable heads | Candidate-node demand-weighted directed round-trip k-site objective, unreachable penalty and bounded heuristic; tiny exact enumeration; recommendations do not silently move locked physical depots |
| I09 Sensor deployment planning | Real monitoring is separate | Budgeted risk/criticality/coverage objective with greedy marginal gain, tiny exact checks and sensitivity; zero budget/demand, ties and unreachable candidates. This does not buy/install sensors or prove sensing accuracy |
| I10 What-if comparisons | Editable settings and city copies | Immutable same-demand scenarios/results; 1/2/3 trucks, capacity, zoning, closure/depot changes; list changed assumptions, coverage and comparability before savings |

Supporting F3 core: single-stream bin/truck compatibility, simple due/overdue commitments, explainable eligibility/selection, safe CSV/print reporting, bounded seeded uncertainty trials and illustrative emissions accounting. These are the approved recommendations below, not extra innovations.

F3 gate: functional workflows for all ten innovations and supporting core; no placeholder cards. Check legal edges, zone containment, exact-once service, time monotonicity, capacity/load conservation, service/unload locations, pending coverage and reconciled totals. Independent tiny path/stop-order references test heuristics. Repeated seeds reproduce experiments. Report extra distance/cost when faster balanced dispatch causes it. Uncertainty frequencies and emissions are model outputs, not measured probabilities or environmental benefit.

## 8. All 26 recommendations — preserved disposition

“Foundation” means implemented portions remain preserved; it does not close an entire original recommendation. Final F4 traceability must attach evidence to each core requirement and retain every deferral.

| ID | Current disposition and remaining home | Optional/deferred part |
| --- | --- | --- |
| U01 | Edit-impact preservation foundation; F2 revisions, F4 regression | None |
| U02 | Read-only/edit/simulation mode foundation; F4 acceptance | None |
| U03 | Guided CRUD/bulk authoring foundation; F4 beginner workflow | Additional gestures only with demonstrated need |
| U04 | Pan/zoom/fit/search/layers foundation; F4 camera/mobile coverage | None |
| U05 | Three modes/road/context layers foundation; F4 legibility and graph truth | None |
| U06 | Greedy fleet foundation; F3 objective and same-zone balancing | More elaborate optimizer |
| U07 | Colored truck/routes/leg inspection foundation; F3 state/load/follow workflow verification | None |
| U08 | Strict partition validity foundation; F3 workload and fragmentation diagnostics | Stronger automatic repartitioning after proof |
| U09 | F3 pre-dispatch closures/traffic and explicit exceptions pending | Mid-route breakdowns/closures/emergency reassignment |
| U10 | City saves exist; F2 immutable scenarios/runs, F3 comparisons pending | Large experiment orchestration |
| U11 | Basic cost/coverage and full-round policy comparisons exist; F3 fair operator reference pending | None |
| U12 | Visual bin/access-node separation foundation; F4 preserve associations | Additional service-offset costs |
| U13 | Roster/availability/progress foundation; F3 workload coordination and F4 truth checks | None |
| U14 | Two-horizon forecast foundation; F3 seeded growth/event-aware history pending | Forecast-driven optional pickups after baseline reliability |
| U15 | F3 reconciling CSV/print operations reports pending | Additional export formats |
| U16 | Depot start/return/unloading foundation; F3 explicit initial-state verification | Queues, shifts and complex horizons |
| U17 | Draft/import/accessibility foundations; F2 migration/conflicts and F4 full recovery/a11y | None |
| U18 | 100-bin exercised; F4 repeated latency/frame/memory measurements pending | Worker only if profiling requires |
| N01 | F3 single-stream compatibility pending | Multi-compartment optimization |
| N02 | Retained deferred recommendation | Turn restrictions/access classes requiring incoming-edge path state |
| N03 | F3 simple due/overdue commitments pending | Recurring windows, waiting/lateness scheduling |
| N04 | Retained deferred recommendation | Crew/equipment/handling constraints; no staffing-law claim |
| N05 | F3 bounded seeded uncertainty/reserve trials pending | Large statistical campaigns |
| N06 | F3 editable travel/service/idle emissions factors pending | Calibrated energy models without evidence |
| N07 | Existing invariants; F3 independent tiny path/order oracle, F4 regression | No large-city optimality proof |
| N08 | Pending reasons exist; F3 structured real decisions/tie-break explanations pending | No fabricated AI rationale |

Also outside the required core: real GPS/traffic feeds, calibrated ML, paid map APIs, elaborate multi-tenancy and distributed background-job infrastructure. Promotion of any deferred item requires a separate decision; defer it visibly rather than silently deleting it.

## 9. F4 — engineering and integration quality (P2, continuous checks earlier)

| ID | Remaining task | Gate |
| --- | --- | --- |
| Q01 | Complete action/evidence matrix across seven screens, ten innovations, 26 recommendations and ten-bin integration | Each core action works or has explicit actionable failure; each optional item marked deferred |
| Q02 | Full automated + actual browser/API/DB end-to-end acceptance | Tests/typecheck/build; 40-/100-bin, all map modes, showcase, desktop/mobile; multiple browser engines where available, honest unavailable-platform limits |
| Q03 | Persistence/recovery/security acceptance | API/DB restarts, migration/conflicts/outages, backup/restore, malformed data, auth/session expiry, authorization/CSRF/rate/body limits and secret/log review |
| Q04 | Accessibility and usability | Keyboard navigation/focus/dialogs/object editing, labels/contrast, non-color status, touch targets and no horizontal mobile overflow; beginner completes complete workflow |
| Q05 | Repeated performance profiling at 10/20/50/100 bins | Record runtime/machine, sample counts, planning latency distributions, playback frame/memory behavior. Blueprint targets (100-bin p95 <1s, ~30fps) are proposed targets, not current measured guarantees |
| Q06 | Reproducible local/release setup and compatibility | Supported Node version, clean install/start, schema/engine versions, environment variable names, isolated test data, rollback and preserved City v1 import/export |
| Q07 | Integrated live dress rehearsal | H10 + D01–D09, honest offline fallback, correct maps/identities/routes/results, genuine evidence and no hidden stale values |

F4 gate includes both full-product integration and explicit physical evidence status. Hardware delay need not block municipal software testing, but prevents calling the final integrated physical demo complete. Resolve recorded Vite/Vitest/mocker advisories through a separately tested toolchain update before public release; do not use blind forced upgrades or equate development-tool advisories with a proven production exploit.

## 10. Deployment blockers, prerequisites and limits

**Pending target:** Vercel-compatible Vite/Node application plus MongoDB Atlas, under separate deployment authorization. This plan makes no current provider quota, price, runtime-support or account-eligibility claim. Recheck official documentation and account settings at implementation/release time; confirm any paid resources before use.

Current `vercel.json` describes Vite build/dist and SPA fallback; it is not proof of Express packaging, protected APIs or database connectivity. Current local SQLite/serial background process must stay local and cannot become serverless durable storage.

Release tasks, in order:

1. Pass F2 protected durable CRUD/history/migration and F3 required core workflows; pass F4 quality/security gates. A limited municipal preview must explicitly disclose omitted functionality rather than claim full-product completion.
2. Implement/test provider-compatible Node entry point, relative API routes and non-API SPA fallback. API failures must return JSON/status, never HTML. No long-lived serial receiver, playback timer or unbounded experiment in request handlers.
3. Separately authorize Atlas/project setup, scoped DB user, appropriate network access, bounded pools, indexes, retention/backups and distinct dev/test/production data. No casually unrestricted database access.
4. Configure server-only Mongo/session/bootstrap/origin secrets; exclude credentials from bundles/Git/logs. Verify HTTPS cookie/CSRF policy and public read-only demo versus protected writes.
5. Validate clean production build and preview browser → authenticated API → real database → read-back, CRUD/history, outage/conflict/session-expiry and restart behavior; inspect redacted logs and connection behavior.
6. Prepare rollback/recovery, backup/restore evidence and bounded usage/cost monitoring. Obtain explicit final deployment authorization, deploy, then record public smoke evidence and known limitations. Push/merge permissions remain separate.

**USB separation:** a deployed municipal website cannot directly access the laptop's ESP32 through the existing local loopback receiver. Local Vite proxying is not an internet bridge. The reliable showcase uses local frontend + local receiver/SQLite. Remote physical monitoring would need a separately designed, authorized authenticated outbound bridge with replay/freshness controls and durable cloud ingestion; it is **not a prerequisite** for municipal-only deployment and is not authorized by this plan. Never expose the local calibration API through an unprotected tunnel.

Hard deployment blockers: missing protected municipal backend, missing real durable history/migration/conflict recovery, incomplete required F3 workflows, security/secret failures, broken provider routing/storage assumptions, failed production checks or absent release authorization. Buying bins does not resolve these. Conversely, hardware is not a blocker to a clearly scoped municipal-only release.

## 11. Dependency-aware parallel execution schedule

These are work waves, not unsupported calendar promises. Implementation begins only after its corresponding authorization; no agents or cloud resources are launched by this document.

| Wave | Suryansh + Codex | Raj / Suryakant | Vishal / seniors | Exit / next dependency |
| --- | --- | --- | --- | --- |
| 0 — immediately prepare | Preserve checkpoint; define snapshot/provenance and map contract; draft test matrix and F2 API slices | Raj obtains candidate dimensions; Suryakant delivers annotated map | Vishal approves physical compatibility; seniors outline PPT using current facts | H01/H03 preliminary sign-off; no need to wait for bins to design/test software |
| 1 — procurement parallel | After authorization, implement D01–D08 with clearly labeled fixtures; begin B01–B04 and independent F3 tiny tests | Raj buys approved bins/materials; Suryakant coordinates graph feasibility/print layout | Vishal reviews mounting/protection; seniors develop architecture/problem slides | Two-zone city proven digitally; protected DB vertical slice when separately configured |
| 2 — integration foundations | Complete B05–B07, provenance persistence, same-zone objectives and fair comparison foundations | Assemble approved physical map/mounts; lock matching IDs and topology | Vishal performs H05/H07–H09 when ready | Stable snapshots/history; actual calibrated channel evidence gates live capture |
| 3 — live local showcase | Connect only with user authorization; capture validated snapshot; rehearse D07/H10; continue remaining F3 slices | Finish labeling/layout; Suryakant performs beginner/map QA | Vishal leads independent channel/repeatability acceptance | Reliable professor-demo path can pass here without pretending full product is finished |
| 4 — full-product finish | Complete all required F3 and Q01–Q06, release packaging and recovery | Verify digital/physical changes remain synchronized | Seniors refine PPT; team reviews report evidence | F2/F3/F4 core acceptance; optional backlog remains explicit |
| 5 — final evidence/release | Freeze tested version; authorized deployment/smoke; final recording/report assembly | Prepare final physical display | Vishal demonstrates calibrated hardware; seniors finalize presentation | Final artifacts accurately state local/online/physical scope |

What can be tested **before calibrated bins exist**: all municipal regression scenarios, ten-bin graph/zone/fleet feasibility, mapping validation, snapshot preview/freeze/rejection with TEST fixtures, API/DB/migration/security, offline handling, desktop/mobile usability, F3 deterministic fixtures and report/export calculations.

What **must wait**: actual mounted empty/full dimensions, physical channel isolation/cross-talk, calibration accuracy/repeatability, controlled real no-echo/disconnect behavior, fresh calibrated snapshot evidence and final integrated physical footage. Do not let simulated fixture success pass these gates.

## 12. Presentation deliverables and evidence order

| Deliverable | Owner | Required content / readiness |
| --- | --- | --- |
| Complete project-use walkthrough video | Suryansh + Codex coordination, team hardware participation | Final captioned end-to-end version, target under ten minutes as previously requested; readable detailed captions and slower transitions. Cover city selection/create/edit/save/import/export, zones/fleet, legal routes/playback, costs/baselines/forecasts, implemented advanced workflows and real Lab → snapshot → collection. If scope cannot fit legibly, agree chapter timing before recording; do not omit required features silently |
| Detailed highly visual 20–30-page PDF report | Suryansh technical lead, Vishal/Suryakant supply physical/map evidence | Final architecture, source separation, algorithms/objectives/limits, screenshots, calibrated evidence, API/DB/security, tests/performance, contributions and remaining/deferred work. Proposed allocation: 2 pages introduction/problem; 3 requirements/roles; 4 architecture/data; 4 algorithms; 4 workflows/UI; 3 hardware/calibration; 3 verification/results; 2 deployment/limits/conclusion = 25 pages. Adjust only to actual completed evidence |
| PPT | Two seniors with team review | Problem, objectives, architecture, map/algorithms, real hardware, demo sequence, measured results, contributions and limitations; figures/numbers match report and checkpoint |
| Final demonstration/runbook | Entire team | Named software version, startup/port-selection instructions, safe physical setup, calibration record, identity/map sheet, evidence checklist, offline/receiver/DB failure recovery and fallback disclosure |

Existing tutorial files are unfinished/local artifacts, not automatically the final video. Do not publish raw telemetry/session data, credentials, private paths or personal browser content. Preserve a sanitized evidence index referring to final screenshots/results and versions; keep sensitive raw measurements local. Final evidence comes **after** feature acceptance, calibration and rehearsal. Draft outlines/diagrams can start sooner with PENDING labels. This planning task creates neither the full technical context nor the PDF/video/PPT.

## 13. Final acceptance checklist

- [ ] Existing six templates, five ready cities, saved-city JSON and checkpoint history preserved.
- [ ] Dedicated ten-bin map approved physically/digitally; four real and six virtual identities obvious everywhere relevant.
- [ ] Four compatible bins mounted; reviewed electronics and protection; calibrated per channel with measured reference records.
- [ ] Fresh independent readings, empty/partial/full repeatability, invalid/no-echo/stale/disconnect/restart behavior demonstrated by the team.
- [ ] Explicit preview/capture rejects unusable physical inputs; snapshot provenance survives export/persistence; no live-to-active-run mutation.
- [ ] Two heads/two internally reachable zones/two assigned trucks pass actual edge, load, return and unique-pickup checks.
- [ ] Plan → animated Simulation → Analytics reconciles; modeled pickup never changes physical readings or proves physical collection.
- [ ] F2 real protected persistence, migration, immutable history, revisions, conflicts and outage recovery pass.
- [ ] All ten innovations have functioning accepted workflows; every U01–U18/N01–N08 item has evidence or explicit deferred disposition.
- [ ] Fair baselines/service-policy comparison, forecast quality, uncertainty and emissions limits are visible; no manufactured savings.
- [ ] F4 automated/browser/API/DB/security/a11y/recovery/performance gates pass with exact evidence and limitations.
- [ ] Deployment separately authorized and smoke-tested if promised; remote USB connectivity is not claimed.
- [ ] Final captioned walkthrough, reviewed 20–30-page PDF, PPT, contribution record and integrated runbook agree with the frozen version.

Professor-demo readiness requires the physical/showcase rows and relevant local quality checks; full-product completion additionally requires F2/F3/F4 and any promised deployment. Do not collapse these two acceptance levels into one Done label.

## 14. Risks and minimal resolutions

| Risk | Minimal resolution |
| --- | --- |
| Unsuitable bins or changed sensor mounting | Approve dimensions before purchase; measure after mounting; repeat affected calibration |
| Conflicting map/head/zone layout | Shared numbered map first; prove directed internal round trips before final assembly; make paired physical/digital revisions |
| Stale/uncalibrated values presented as live demand | Block final-live snapshot; show age/status/parameters; never substitute synthetic or last-good values silently |
| City v1 only permits SIMULATED bins | Explicit compatible provenance envelope/extension decision and tests before implementation; no source-label shortcut |
| Collection animation mistaken for real actuation | Label snapshot-derived modeled operation; no write-back to Lab or claim of physical pickup |
| Procurement delays stall software | Use labeled TEST fixtures for development; continue F2/F3/Q work; keep physical gate pending |
| More trucks fail to improve time or worsen distance | Reproduce idle-truck case, deterministic candidate scoring and same-demand comparisons; report trade-offs |
| Retained one-way template is infeasible under strict partitions | Keep explicit pending reasons; preserve template; do not weaken default containment or promise all arbitrary cities feasible |
| SQLite data loss or accidental publication | Preserve ignored local store/sidecars; controlled backup before maintenance; no migration/deletion in this planning task |
| Atlas/network outage or data conflict | Local drafts/export, idempotent retries, revision checks and honest save states; tested restore |
| Cloud frontend confused with local USB monitoring | Separate local showcase from municipal deployment; defer remote bridge until explicitly scoped |
| Scope grows into unreliable dynamic operations | Complete frozen core first; retain optional incidents/queues/turn/crew complexity in deferred backlog |
| Report/video overclaims before final acceptance | Versioned evidence ledger, planned/completed labels, genuine calibrated recordings and team review |

## 15. Next authorized-execution recommendation

First authorize a bounded **ten-bin showcase + provenance snapshot integration** slice with offline tests, while Raj/Vishal/Suryakant complete compatibility and layout handoffs. In parallel authorize the staged **F2 protected persistence** work and independently testable F3 foundations. Resume live hardware only when the user and Vishal are ready; finish F3/F4 and separately approved deployment afterward. This preserves the shortest defensible local demonstration and the complete approved product scope.

This document is planning only. No application code, tests, dependencies, circuits, COM ports, database contents or deployment settings were changed; no commit, push or deployment was performed.
