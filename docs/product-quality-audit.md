# CleanCity product quality audit and upgrade discovery

Audited 5 November 2026; branch `codex/municipal-platform`, checkpoint `f1a8d28`. Application source unchanged. This is a discovery report, not implementation approval or a municipal deployment certification.

## Executive assessment

CleanCity is a functioning educational scenario engine with useful directed-path, capacity and state-machine foundations. It is not yet an effective municipal planning product. Its strongest evidence is reproducible collection execution; its weakest areas are custom-city authoring, map navigation/legibility, edit semantics and decision-oriented fleet assignment. Adding more dashboard cards will not resolve these weaknesses.

The light palette improves presentation but the map remains a small node-link diagram embedded in a long page. “City”, “Engineering” and “Simulation” modes are not genuinely distinct workspaces. Most sections repeat the map, KPI cards, fleet and controls rather than presenting a task-specific workflow. Customization is possible but expensive in clicks and fragile after edits.

**No P0 data-corruption or directed-path failure was demonstrated.** This does not establish their absence. Two reproducible P1 defects are View-mode mutation and zone/fleet assignment loss after a label-only junction edit. Fleet packing is real, but its heuristic can waste available parallelism. The project should not claim municipal decision-support readiness until these are addressed.

## Evidence and boundaries

- Independently reran existing suite: **56 tests passed**; `npm run typecheck` and `npm run build` passed. Main JS 305.58 kB, 96.03 kB gzip. Tests do not prove every UI workflow or physical/cloud behavior.
- Launched unchanged production preview at localhost:4176. Visited Overview, City Studio, Zone & Fleet Operations, Collection Simulator, Analytics & What-If and Physical IoT Lab. Browser warning/error log was empty at the end.
- Built the custom city below using actual visible forms/buttons, not JSON import, localStorage injection or application-state mutation. Exported JSON only **after** UI creation for independent engine experiments.
- Temporary audit harness and scenario: `build/product-audit/fleet.test.ts`, `city.json`, `results.json` (ignored by Git). Command: `npm exec -- vitest run build/product-audit/fleet.test.ts --maxWorkers=1`. The single experiment test runs 14 cases and checks duplicate pickup exclusion, trip capacities and completed-stop counts. It is separate from the 56-test suite.
- Engine experiments are identified below; they are not 14 independently clicked browser scenarios. No memory profiling, repeated statistical benchmark, actual touchscreen test, assistive-technology audit or hardware/cloud verification was performed.
- This execution did not independently repeat every individual delete, invalid-file picker or pointer-drag permutation. Existing tests cover several of those behaviors; remaining verification is explicit rather than assumed.

## Independently authored irregular city

**CleanCity — Irregular Municipal Test City** was created from New city, renamed through Scenario settings, then populated through Node, Save changes, Connect road and Place bin controls.

| Item | Actual configuration |
| --- | --- |
| Geometry | 9 junctions at (120,160), (340,85), (580,150), (920,110), (1000,410), (780,600), (450,550), (190,640), (290,350) |
| Roads | 19 directed edges: irregular perimeter cycle, selected reverse edges, interior branches/chords Ward 9↔3 and Ward 3↔6; edge weights 0.3–0.85 km |
| Bins | 30, individually created/named W1-BIN-1 etc.; four bins at each first-three junctions and three at each remaining junction; fills 35%, 82%, 95%, 100% |
| Heads/zones | Explicitly selected Ward 1, Ward 4 and Ward 7; K=3; automatic zone sizes 11, 10, 9 |
| Fleet | Five trucks; capacities 2,3,4,3,5 units; speed grades 10,15,20,25,30 km/h; zone allocation **3/1/1** |
| Demand | Zone loads 7.31, 6.36, 6.54 units; 22 eligible pickups; 14 urgent |
| Plan | 8 trips, 9.60 km, 36.68 min fleet completion, zero pending |
| Browser execution | At virtual minute 5, all five trucks had real collecting/travelling/unloading states; completed run showed 22 collected, zero scheduled remaining, 9.60/9.60 km, 36.7 min |
| Persistence | Save and browser reload restored 30 bins and three zones. Saved pre-run snapshot exported to Downloads/CleanCity---Irregular-Municipal-Test-City.json and copied into ignored audit artifacts |

This is an irregular **topological test district**, not calibrated real-city geography. Thirty bins are supported, but the UI forces multiple bins onto just nine road nodes and offsets their icons in rows. It was practical to create 30 this way; placing every bin at a separate curb location would require substantially more junction creation and road connections. No separate parcel/curb placement, road interpolation or walk-to-road distance is modeled. Do not present this as 30 independent street access points.

The authoring workflow required repeated node selection → Place bin → edit fill/name → Save → reselect node. There is no bulk insertion, duplicate-bin control, draw-road gesture or setup wizard. There is no true city-boundary entity; the irregular outline comes from road geometry. These are substantive product gaps, not just visual polish.

## Screen-by-screen criticism

| Screen | Working evidence | Weakness preventing a professional workflow |
| --- | --- | --- |
| Overview | KPIs, head selection, plan entry, save/export work | Long mixed-purpose page; large introductory/KPI area pushes map down. Before zoning, unassigned warning looks like a failure rather than a setup step. No scenario readiness checklist or clear coverage decision |
| City Studio | Authored all 9 nodes, 19 edges, 30 bins; coordinate/type/weight editing works | Add node starts in the center; coordinate forms are the practical precision tool. Roads require selecting opaque IDs from dropdowns. No pan, fit, search, layers, box select, bulk edits or selected-road weight labels. Small canvas versus page height |
| Zone & Fleet | Three heads and explicit 3/1/1 restrictions configured; demand table agrees with plan | Zone selection opens an inspector far from fleet controls. No roster showing which trucks belong to each zone; no allocation drag/drop or balance suggestion. Configured K and surviving actual zones can diverge after manual deletion |
| Collection Simulator | Real trip segments, independent loads, service completion and unload phases | All trips appear simultaneously, colored by zone rather than truck; same-head markers overlap and each says T. No selected vehicle follow/route isolation, leg list or active-stop highlight. Dark truck body and dark T text have poor contrast. Movement jumps at coarse virtual-clock ticks, especially at high playback speed |
| Analytics & What-If | Both horizons, direct calculated comparisons and units present | “What-if” is largely edit assumptions and recalculate; no side-by-side scenario snapshots or runs. No ranking, sortable demand list or exportable report. Forecast table is a small horizontally scrolling card; all bins are listed without decision filters |
| Physical IoT | Four cards honestly show NO VERIFIED DATA/OFFLINE | Prepared interface only. No live connection evidence. Its presence must not inflate the simulator's readiness score |
| Navigation/forms/dialogs | Accessible nav names; confirmations and undo/redo exist; mobile width fit | Screens share most content; navigation does not establish a clear task progression. Form errors often become transient toasts rather than field messages. Tiny labels/controls and icon-only mobile nav hinder first-time use |

### Map-specific verdict

Not grid-only: small presets use rings, larger presets use grids, and UI supports irregular geometry. Nevertheless, all have the same graph-diagram aesthetic. No blocks, contextual areas, road classes, street-label hierarchy, independent bin positions or selected-route focus. Even the custom 30-bin map is sparse in its center and crowded near colocated bins. Convex zone hulls can overlap or enclose roads/nodes assigned elsewhere; they are illustrative, not authoritative geographic boundaries. At 100 bins, opposing arrows, route overlays and markers become a web of competing lines. Zoom is centered; absence of pan makes zoomed-offscreen features hard to inspect.

The View/Edit/Simulate buttons mainly navigate pages; they do not provide a semantic rendering/filtering contract. **View is not read-only.**

## Reproduced defects and engineering limitations

### D01 — label-only node edits destroy operational configuration (P1)

Steps: save a city with zones and truck restrictions → select Ward 9 in Studio → change only label to “Ward 9 renamed” → Save changes. Expected: same graph topology, zone membership and truck allocations, with new display label. Actual: **zone-card count becomes zero**. Inspector submits all node updates as graph edits; App.change clears zones and every truck.zoneId. Undo restored the prior city, but the user gets an expensive reconfiguration requirement for a harmless rename. Coordinates edited through the inspector also clear zones, while node dragging takes another code path and preserves them. Fix by classifying presentation, topology, demand and fleet changes independently, with tests for each invalidation rule.

### D02 — View mode permits editing (P1)

Steps: reset completed run → Overview/View map → select first bin with Enter → change fill 35→36 → Save changes. Actual map aria-label becomes **W1-BIN-1 36%**. Expected from the mode name: inspect-only, with an explicit transition to edit. This is not a server security problem; it is misleading editing affordance. Undo restored the test value.

### D03 — fleet packing ignores parallel completion when demand fits one truck (P1)

One zone, three available trucks, each capacity 100, same 22 eligible stops: one truck receives the entire 100.60-minute trip; two remain idle. Source: planCollection builds a full capacity-fitting trip before selecting the next earliest-available truck. Legitimate for a distance/dispatch-minimizing policy, poor for a silently assumed rapid-response policy. Expose objective and compare legal candidate allocations; do not label this a mathematically optimal fleet plan.

### D04 — weak assignment/region semantics (P1)

AutoZone assigns using underlying undirected graph distance plus a **fixed 0.035 km-per-assigned-bin penalty** and directed round-trip checks. It does not minimize workload variance, guarantee connected zone regions or adjust boundaries with a bounded improvement pass. Bin capacity and expected service demand do not drive the balance penalty. Manual bin reassignment changes binIds without updating zone nodeIds/hull. Routing responsibilities remain explicit, but the boundary can mislead. Report contiguity/load diagnostics and separate responsibility overlays from geographic areas.

### D05 — excessive and inconsistent state loss around editing (P1)

Any road edit clears all zones and zone restrictions, even changing a road's display name. This is safe against stale routes but unnecessarily destructive. Fill changes correctly invalidate collection plans while keeping zones. Edits during an active run are blocked, so there is no mid-run closure/breakdown rerouting. Distinguish safe editing from dispatch revisions; never silently route on obsolete roads.

### D06 — simulation/model limits (P1/P2 depending on claim)

No truck home-location configuration, shifts, max trip duration, partial-bin splitting, actual unloading sites, emergency demand, breakdown state or road closure. Initial truck placement is assumed at its first assigned head. “Capacity” is a dimensionless fill-derived planning unit, not calibrated mass/volume. Repeated trips allow aggregate demand to exceed fleet capacity; a bin larger than every allowed truck is pending, not split. A truck no longer needed is legitimately idle/completed; that does not prove a scheduler defect by itself.

### D07 — secondary source-backed issues needing focused regression (P1/P2)

- operationProgress uses AVAILABLE for trucks with no trips regardless of truck.available; this can misstate unavailable fleet readiness even though the planner excludes them. Reproduce with one unavailable vehicle and another dispatched vehicle.
- Dirty state tracks saves, but saving during playback persists partially collected fills without the active plan; reload loses job progress by design. Make “save initial scenario” versus “save current snapshot” explicit.
- Canvas selection stroke for a selected bin is white on a white fill/background. Trucks share identical dark T markers. Add selected halo and vehicle identifiers.
- Reset of a blank/custom city yields a new blank template, not a stored authoring baseline. Run reset restores dispatch snapshot; these two resets need clearer language.
- Forecasting resets after *any* decrease, including randomization/noise, not just a recorded pickup. Sparse bins already above threshold show “No estimate” despite currently requiring action. Separate current classification from future arrival estimate.
- localStorage library failure blocks all saving until manual recovery; no recovery/export-corrupt-library interface. Browser quota/eviction resilience is not demonstrated.

## Same-zone multi-truck investigation

Engine experiments use the **UI-exported custom city**. For the first three rows, heads were reduced to Ward 1, each truck capacity set to 3 and speed set uniformly to 20 km/h. Same pickup set, roads and service assumptions. These changes were made in the temporary engine test, not claimed as additional UI-created cities.

| Case | Active trucks | Trips | Stops served / pending | Distance km | Completion min |
| --- | ---: | ---: | --- | ---: | ---: |
| One zone, one truck | 1 | 8 | 22 / 0 | 25.05 | 159.15 |
| One zone, two trucks | 2 | 8 | 22 / 0 | 25.05 | 82.55 |
| One zone, three trucks | 3 | 8 | 22 / 0 | 25.05 | 60.00 |
| Three zones, 3/1/1, mixed capacities/speeds | 5 | 8 | 22 / 0 | 9.60 | 36.68 |
| Each eligible bin oversized for every truck | 0 | 0 | 0 / 22 | 0 | 0 |
| Five trucks, one eligible job | 1 | 1 | 1 / 0 | 0 | 7 |
| Remove all roads touching Ward 2, retaining responsibilities | 4 | 7 | 19 / 3 | 7.20 | 36.68 |
| No pickup demand | 0 | 0 | 0 / 0 | 0 | 0 |
| All trucks unavailable | 0 | 0 | 0 / 22 | 0 | 0 |
| One zone, three capacity-100 trucks, original mixed speeds | 1 | 1 | 22 / 0 | 8.60 | 100.60 |

The first three trips started at [0,0,0] in the three-truck case: concurrent dispatch is real. The harness asserted no duplicate bin assignments and every trip within its own truck's capacity. It advanced each plan through service completion and checked completed-stop counts. The browser showed simultaneous collection/travel/unload for all five custom-city vehicles, then 22/22 completion. Loads reset on unload, and multi-trip trucks execute subsequent trips sequentially.

Conclusion: **genuine multi-vehicle state execution, limited greedy allocation**. Multiple trucks can reduce elapsed time without reducing distance. No accidental duplicate pickups found in these cases. No fleet-wide optimality proof, fairness guarantee or congestion avoidance. Oversized indivisible bins are different from total demand exceeding the truck's capacity: the latter is handled through multiple unload trips.

## CRUD/customization inventory

C/R/U/D below describes source-backed capability; the custom-city exercise independently covered creation, reading and updates for nodes/roads/bins/fleet, generation/restriction of zones and save/reload. It did not independently execute every delete.

| Entity | C/R/U/D | Limitation |
| --- | --- | --- |
| Cities | Yes/Yes/Yes/Yes for saved scenarios | Delete lives in saved-library chip; no city manager; loaded unsaved city has no explicit delete action. Reset semantics ambiguous |
| Nodes | Yes/Yes/Yes/Yes with reference blocking | No multiselect, bulk import UI or guided reference resolution; rename clears operations |
| Roads | Yes/Yes/Yes/Yes | Direction reversal/add reverse works in code; endpoint dropdown authoring; duplicate parallel reverse roads allowed; no closure flag, geometry bends, class or on-map weights |
| Bins | Yes/Yes/Yes/Yes | Must attach to node; no independent curb coordinate or bulk edit; drag snaps responsibility away until reassigned |
| Zones | Generate/Yes/Yes/Yes | No manual empty-zone creation; max K=6; bin-only reassignment can disagree with hull; no split/merge/load target |
| Trucks | Yes/Yes/Yes/Yes | One zone restriction or any-zone; no home base, shifts or failures; trip/vehicle selection weak |
| Settings | Existing form read/update | Five speeds, thresholds, cost/service/unload/seed editable; no stale-window, forecast-window or zoning-balance controls |
| Scenarios | Save/load/duplicate/import/export | Explicit save only; no durable run snapshots, version history, compare/report export or operation journal |
| Forecasts | Derived read-only | Both horizons work; rule parameters hardcoded and predictions do not affect routing |

## Algorithms, analytics and scale

Directed Dijkstra respects edge weights and returns expanded road sequences; presets and regression tests cover competing paths, one-way reachability and unreachable nodes. Road weights remain authoritative, independent of canvas pixels. Zero/negative road weights are rejected by schema and shortest-path traversal. Return feasibility is checked before pickup assignment. Zone roads remain traversable across boundaries. Those are credible foundations.

Shortest paths use repeated sorting of an open-node set and per-node edge filtering rather than a heap/adjacency prepared once; route evaluation scans arrays frequently. In a **single local measured engine run** with overflow demand, planning took roughly 0.57/1.81/38.87/217.58 ms for 10/20/50/100-bin presets. All served every eligible bin with no pending work. These are observations, not browser responsiveness percentiles or benchmarks. Main-thread computation, repeated forecast/DOM rendering and many labels should be profiled before scaling beyond 100; no memory-leak conclusion is supported.

Both forecast horizons are parameterized by the configured pickup/urgent thresholds, using recent average positive growth. Sample identity is timestamp-based deduplication; every decrease discards earlier growth. Staleness is measured against virtual scenario time (3h), not wall time. That is reproducible, but demand has no independent growth process during playback. It forecasts static synthetic input histories rather than simulating waste generation. No physical accuracy or confidence calibration is established.

Distance/time/cost are computed from actual plan edges, truck/road speeds, service and unload durations. Labor time sums all vehicle activity and is charged per hour, including travel/unload. Baseline uses fixed lexical ID order under the same eligibility/capacity rules; heuristic prioritizes urgent then nearest feasible. This is a weak and ID-dependent benchmark, not a fair comparison with a strong municipal fixed route. Both plans recompute their own assignments; differing pending sets suppress savings, appropriately. Equal pickup sets still do not establish optimality or real savings. Add auditable cost components and keep initial-deployment assumptions explicit.

## Critical scores (0–10)

These are reviewer judgments about demonstrated scope, not certification; performance and broad robustness ratings are provisional.

| Dimension | Score | Evidence |
| --- | ---: | --- |
| Visual design | 6 | Consistent light surfaces and spacing; many tiny controls, repeated cards, weak map dominance |
| Map visual quality | 3.5 | Sparse graph-only city; no hierarchy/context/pan/fit; clustered bins and indistinguishable trucks |
| UX intuitiveness | 4 | 30-bin authoring worked but required repeated inspector switching; View edits; settings/zone controls scattered |
| Customization flexibility | 6 | Irregular topology, weights, five varied trucks and thresholds possible; no batch, geometry, shifts or operational restrictions |
| CRUD completeness | 6 | Core entities supported; regeneration instead of manual zone creation; difficult reference resolution; destructive edit semantics |
| Directed graph correctness | 8 | Existing tests rerun; real expanded paths and round-trip checks; not formally verified across arbitrary graphs |
| Zoning/routing | 6 | Feasible heads and pending work; fixed small balance penalty, no contiguity guarantee or route improvement |
| Multi-truck scheduling | 5.5 | Real 3-truck parallel execution; 159.15→60 min in equal-speed fixture; capacity-100 counterexample leaves two idle |
| Simulation realism | 5 | Service/load/unload/state consistency; no growth, shifts, traffic, failures or live replanning |
| Analytics/forecasting | 6 | Actual metrics, two horizons, transparent limits; synthetic history, weak baseline, no scenario comparison/report |
| Robustness/edge coverage | 6 provisional | 56 passing tests plus experiment; label rename loss and mode inconsistency remain; recovery/browser matrix incomplete |
| Scalability/performance | 6 provisional | 100-bin engine plan ~218 ms once; browser works, no measured frame/memory/latency budget |
| Overall final-year engineering quality | 6 | Substantial functional prototype; needs product workflow and stronger comparative experiments before an elite project claim |

## Ranked upgrade backlog / feature candidates

No P0 is asserted without a demonstrated severe failure. P1 denotes major usability/model weaknesses, P2 optional depth. Rows include purpose/engineering value, dependencies, acceptance and principal regression risk.

| ID / module | Problem and evidence | Proposed solution / value | Priority / size | Dependencies | Acceptance criteria | Regression risk |
| --- | --- | --- | --- | --- | --- | --- |
| U01 editor | D01: rename clears zones/restrictions | Typed edit-impact invalidation, preserving harmless metadata | P1 / Small | Existing change handler | Rename/coordinate-only edits preserve responsibility; topology edits revalidate; undo restores all | Accidentally retaining obsolete routes |
| U02 modes | D02: View mutates fills | Explicit inspect/edit/simulate contracts and visible mode banner | P1 / Small | U01 | View form read-only; edit transition retains selection; sim locks scenario with explanation | Breaking zone/fleet editors |
| U03 authoring | Thirty bins require repeated forms | Setup wizard, draw-to-connect, batch bins, multi-select editing; makes real custom scenarios practical | P1 / Medium | U01/U02 | Create irregular 30-bin/3-head city without per-bin context switching; one undo per batch | Broken references, huge undo snapshots |
| U04 map navigation | Only centered zoom; no pan/fit/search/layers | Camera state, fit-to-city, search/select and visibility toggles | P1 / Medium | Stable SVG canvas | Every node reachable at zoom; focus search; fit includes displaced bins; mobile controls | Screen/world coordinate mismatch |
| U05 map layers | Diagram aesthetics/clutter | City/Engineering/Simulation render layers, road hierarchy and non-routing context polygons | P1 / Medium | U04 | At 100 bins selected vehicle and roads remain identifiable; no decorative routable edges | Visual graph/topology disagreement |
| U06 fleet objective | D03: full-trip greedy packing | Time-first balanced assignment option, candidate finish-time scoring; retain distance-first option | P1 / Medium | Existing directed cache | 1/2/3-truck equal-demand comparison; no dup/overload; demonstrate idle-truck counterexample improvement | Higher distance/cost, urgent starvation |
| U07 route inspection | Same-head truck overlap; no leg list | Unique colored/numbered vehicles, selected route/stop panel, follow-truck; supports diagnosis | P1 / Medium | U04/U05 | Select truck and inspect each road ID/km/time/load; distinguish colocated fleet | Incorrect highlight vs actual segments |
| U08 zone validity | D04: fixed penalty and illustrative hull | Workload-target growth plus contiguity/round-trip diagnostics; bin/hull responsibility legend | P1 / Medium | U01/U03 | Report unassigned/fragmented zones and measured imbalance; stable on fill-only changes | Over-promising geographic continuity |
| U09 incident scenarios | No closures/breakdowns or rerouting | Road availability + truck failure events; pause, preserve completed jobs, replan remaining demand | P1 / Large | U01/U06/U07 | Closing active leg cannot teleport truck; no recollection; pending reasons persist | Lost loads and already-served jobs |
| U10 scenario snapshots | Save is city state only | Named immutable input/result snapshots and same-demand comparisons | P1 / Medium | Edit revisions, persistence schema migration | Reload restores run inputs/result; compare demands/assumptions before savings | Quota, backward compatibility |
| U11 baseline/cost audit | Fixed lexical ID ordering is weak | Operator-defined reference route plus cost components and experiment panel | P1 / Medium | U07/U10 | Rename IDs doesn't change reference route; equal service coverage checked; report negative savings | Apples-to-oranges comparisons |
| U12 bin access geometry | All bins colocated with junctions | Separate visual/curb position with explicit access-node association; optional service offset | P1 / Medium | U03/U05 | Bin can move visually while routing access stays explicit; no pixel-derived road distance | Ambiguous snapping or invented costs |
| U13 fleet roster | Source-backed unavailable status mismatch and opaque allocation | Zone roster, availability truth, planned/active/completed separation and capacity warnings | P1 / Small | U06 optional | Unavailable never displays AVAILABLE; per-zone trucks/load visible; excess trucks shown idle | Status regressions across playback |
| U14 growth/forecast | Static histories, any-drop reset | Seeded virtual demand process; explicit pickup events; configurable windows; forecast-aware optional pickup | P2 / Medium | U10; keep current routing default | Reproducible time steps; reset exact; noise and pickup treated separately; no trained-AI claim | Oscillating demand and noncomparable runs |
| U15 reports | No exportable operational evidence | CSV/print report with input seed, algorithm, assumptions, per-truck/zone legs and unserved reasons | P2 / Small | U07/U10 | Report reconciles distance/load/time and excludes physical claims | Rounding/escaping and stale reports |
| U16 planning realism | No shifts or unloading constraints | Optional shift/horizon, head/unload service constraints and explicit initial fleet locations | P2 / Medium | U06/U09 | Demand beyond shift becomes pending; transit cost included from actual start | Enlarged infeasible search surface |
| U17 recovery/accessibility | Transient errors, manual corruption recovery; small targets | Field errors, accessible object list, recovery/export library, keyboard shortcuts | P1 / Medium | U03/U04 | Keyboard edits all entities; invalid imports preserve city; quota errors offer export | Accidental destructive recovery |
| U18 performance discipline | No frame/memory budget | Profile 100-bin planning/rendering; memoize stable layers; worker only if measurements justify | P2 / Small initially | U05/U07 | Record repeated latency/frame/memory observations and regressions, not just bundle size | Premature complexity |

## Achievable map architecture (no routing rewrite)

Keep City nodes/roads/bins and the pure directed algorithms authoritative. Extract the existing SVG into composable layers: camera transform → non-routing context → responsibility outlines → road casing/centerlines → direction/engineering weights → selected route → bins/heads → vehicles → labels/interaction handles. Share a selection model and explicit layer flags. Draw paths from the actual road endpoints or later stored polyline geometry; intersections require explicit graph nodes. Curves must not silently create connectivity. City context (parks/blocks) is editable visual metadata and never part of route feasibility.

City View suppresses low-level junction handles and most arrows, favors road names/major streets and clusters markers with counts. Engineering View reveals every direction/weight/ID, connectivity warnings and editing handles. Simulation View emphasizes selected active leg, next stop and distinguishable vehicles, hiding unrelated route traces. A camera fit/pan model and UI object search are more valuable than switching rendering libraries. SVG remains adequate for current scale unless profiling disproves it; no Google Maps, paid tiles, real geographic-data dependency or wholesale engine rewrite is needed.

Use an actual irregular reference scenario as a maintained fixture, not a cosmetic grid redesign. Context/road styling cannot compensate for the 30-bin authoring workflow or assignment loss. Fix those first.

## Recommended execution sequence

**Upgrade A — Product and map UX.** First U01/U02/U13 correctness, with regression reproduction. Then U03/U04/U17 together: selection, editing gestures, camera and object list. Follow with U05/U12: three true render modes, road hierarchy, bin access positions and contextual metadata. Acceptance: a new operator can author, inspect and recover an irregular city without ID hunting or loss of zones; 100-bin map remains legible. Keep styling and camera work independent of algorithm changes.

**Upgrade B — Advanced simulation.** U06/U07 together: selectable planning objective, balanced assignment and auditable vehicle legs. Use the same exported city and equal-speed matrix before/after; distinguish lower makespan from lower distance. Add U08 diagnostics next, then U09 only after job/vehicle state transitions have durable revision semantics. Do not bundle incidents with a visual-only map release.

**Upgrade C — Analytics/customization.** U10/U11 establish comparable input/result snapshots and a defensible baseline; U15 reports consume those snapshots. U14/U16 are optional second-stage realism, guarded by seeded regression cases and clear assumptions. U18 measures each upgrade. Do not add authentication or a cloud dependency to the offline simulator as part of these upgrades.

Recommended strongest manageable set: **U01–U08, U10–U13 and U17**, sequenced over the three upgrades rather than one huge patch. Defer incident rerouting, demand growth and shifts until these foundations are reliable. No new feature is authorized by this report.

## Decisions for the owner before implementation

1. Recommend **time-first balanced fleet assignment** as the default municipal objective, with distance-first retained for comparison. Confirm that trade-off before changing scheduler behavior.
2. Recommend SVG layers and camera controls rather than a map-library rewrite. Keep synthetic city context clearly separate from routable roads.
3. Approve Upgrade A first plus the focused U06/U07 fleet experiment, or choose the full recommended sequence above. Physical work, real cloud configuration, deployment, push and merge remain excluded unless separately authorized.

## Preservation

The application checkpoint is unchanged and no commit was created. Only this report is new outside ignored temporary audit artifacts and browser-local/downloaded scenario data. Existing custom-city data is saved in the audit origin's browser library. No original user scenario was overwritten.
