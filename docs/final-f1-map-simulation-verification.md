# Final F1 map and simulation correction

Latest policy: see `default-operation-contract.md`. The default now isolates partitions for every city; the optional/legacy routing descriptions below are historical and superseded. Latest validation is 130 passing tests and five ready-city plus six retained-template browser journeys.

2026-11-06 · uncommitted, awaiting user acceptance.

## Reproduction and correction

The actual ChatGPT browser opened on the user's saved **Newhaven Metro**, with 100 bins, two available trucks, 21 eligible bins and **zero zones**. Both plan buttons were disabled. The previous successful template tests did not represent that saved starting state. No engine failure was reproduced with valid configured cities; this does not establish that every historical user failure had the same cause.

The Cities library now defaults to five simulation-ready cities, separate from the six retained Templates and My cities. Opening a ready city goes directly to Dispatch. The primary switcher lists ready cities and user saves instead of obsolete preset choices. Advanced Studio presets and the deliberate-exception guided scenario remain available; existing saved cities are not automatically changed or repaired.

Start collection now focuses the playback map so a user sees the actual moving vehicles instead of only controls above the fold. The routing/zoning/playback engines were not rewritten. Saved Newhaven remains intact and still needs explicit zone setup if used directly.

## New city results

All distances and times are modeled, not geographic measurements or real GPS. Nodes equal bin counts here because each authored service access point has one bin.

| City | Nodes | Directed roads | Bins | Zones / heads | Trucks | Eligible / completed | Pending | km | Fleet min |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Briar Market Borough | 24 | 64 | 24 | 2 / 2 | 2 | 15 / 15 | 0 | 18.268 | 53.402 |
| Rivergate Crossing | 40 | 128 | 40 | 2 / 2 | 2 | 25 / 25 | 0 | 17.682 | 78.090 |
| Juniper Sector City | 54 | 186 | 54 | 3 / 3 | 3 | 33 / 33 | 0 | 28.042 | 74.968 |
| Freightport Industrial | 70 | 186 | 70 | 3 / 3 | 6 | 44 / 44 | 0 | 39.802 | 49.478 |
| Westhaven Metropolitan | 100 | 300 | 100 | 4 / 4 | 8 | 62 / 62 | 0 | 39.914 | 49.156 |

Each passed actual Cities opening, map inspection, essential bin/junction/road CRUD and undo, export/import, save/reload, Dispatch planning, timed playback, pause/step, Finish and Analytics distance agreement. No unserved reasons exist for these baseline inputs because pending is zero. Captured JavaScript exceptions: none.

Timed checks compare rendered truck transforms across 1.4 seconds of running playback, rather than merely invoking an engine function or jumping straight to Finish. The visible ChatGPT browser independently demonstrated Briar movement and naturally completed 15 stops with zero unserved. Five added algorithm regressions check validity, directed round-trip reachability, capacities, unique assignment and exact completion. The saved-data format and user storage are preserved.

## Evidence and visual findings

`build/final-f1/city-{1..5}-desktop.png`, `-moving.png`, `-complete.png`, and `-analytics.png` are application-only captures, in city order above. All five desktop maps, Rivergate context, Westhaven active playback and final Analytics were visually inspected. Town has short staggered blocks and selective cross streets; Rivergate has two banks with exactly two bridge links; Juniper uses planned sectors; Freightport uses long restricted-access corridors and heavier demand; Westhaven uses offset district streets and eight trucks. These are stylized street plans, predominantly orthogonal, not geographic reconstructions. Land/zone extent is illustrative; roads and assignments remain authoritative.

Machine-readable evidence: `build/f1-a-e2e/results-ready-cities.json` and `ready-city-metrics.json`. Screenshots and JSON evidence are ignored build artifacts, not commit candidates. Responsive captures are separately recorded by the browser runner; desktop rendering evidence must not be interpreted as real-phone testing.

## Checks and acceptance

- 104 tests passed across 11 files.
- Production build passed, including TypeScript; 1,607 modules transformed.
- Standalone TypeScript and whitespace checks rerun after final changes.
- All six retained template browser journeys passed again (`results-retained-templates.json`), with no captured JavaScript exceptions.
- All five new cities passed separate 390px playback/completion/Analytics checks, without page horizontal overflow (`results-ready-mobile.json`). Mobile screenshots: `build/final-f1/city-{1..5}-mobile-moving.png` and `-mobile-analytics.png`. Westhaven mobile playback was visually inspected. These are emulated viewport checks, not physical phone tests.
- No backend/cloud/hardware work, dependency installation, commit, push, merge or deployment.

Review: Cities → Simulation-ready cities → View Briar Market Borough → Plan collection → Review simulation → Start collection. The map comes into view. Scroll up for Pause/Resume/Finish; after completion choose View collection analysis. Replay restores the original simulated input. My cities preserves existing browser saves, and Templates retains the six prior maps.

Final F1 acceptance and the single completion commit require user confirmation. No approval is inferred from automated test results.

## Zone responsibility correction

User inspection identified a missed workflow regression: Generate zones cleared every truck's assignment, allowing both Rivergate trucks to serve both zones. Zone regeneration now maps each assigned truck to the new zone with the same depot, including reordered head selections. Explicit Any zone trucks remain shared. Removing an assigned depot cancels generation with actionable feedback rather than silently changing responsibility. Existing saved Any zone assignments are not guessed or overwritten: reopen an original ready-city copy or explicitly assign each truck in Fleet settings, reset the old run and replan.

Five added regressions verify depot identity through reordered generation and check every planned trip against its truck's zone, bin membership and unloading head. Existing tests also check capacity, legal directed road legs, unique collection and completion. Full suite: 109 passing tests; TypeScript production build and Git diff checks passed. Zone polygon opacity increased from 7% to 14%, with restrained colored outlines; these are illustrative extents, not legal boundaries or routing constraints.

All five actual browser journeys passed again with an explicit Generate zones action before planning, timed truck movement, completion, Analytics and mobile captures. No captured JavaScript exceptions. Evidence: `build/f1-a-e2e/results-zone-regeneration.json`; visually reviewed Rivergate playback: `build/final-f1/rivergate-zones-fixed.png`.

## Strict partitions and full-round cost comparison

User clarified that trucks must not traverse other partitions, not merely avoid collecting their bins. Five ready cities now default to `settings.strictZoneRouting: true` (optional City JSON v1 field). Strict planning uses a separate induced road graph for each zone; outgoing, inter-pickup and return legs cannot use outside nodes. Automatically assigned trucks bind to one zone per dispatch. Missing internal round trips are reported unserved, never replaced with a citywide shortcut. Strict zoning uses head-distance assignment without the workload penalty that could produce disconnected pockets; validation also uses zone-internal roads. One selected head seeds each zone; K selected heads means K zones. Multiple trucks per zone remain supported.

Legacy JSON/saved cities retain their shared-road policy unless Strict zone routes is enabled in Fleet. Reset an old run, enable the policy, regenerate zones and replan; old run snapshots and saved inputs are not silently changed. This distinction is explicitly shown in Fleet. Previous statements that all zone assignments automatically restricted road transit were incorrect.

Simulation shows all truck route overlays simultaneously with matching truck colors (eight distinct colors) and a legend. Selecting a truck emphasizes it while retaining the others faintly. Shared actual road sections may overlap; routes are not displaced to invent different roads.

Analytics adds routine all-bin versus threshold-based collection using the same original fills, roads, rates and fleet. The routine plan visits every bin including empty bins, without falsifying fill quantities. Costs/savings are labeled policy estimates, not equal-service optimization gains; unserved demand suppresses the savings claim. Five tests verify full-round service, preserved input and capacity/completion. Boundary tests verify every strict trip node belongs to its zone, reject outside-only returns, and bind automatic trucks to one partition. Route rendering regression now requires every planned truck's route.

All five strict-city browser journeys passed after zone regeneration, including timed movement, completion, Analytics, CRUD/reload and mobile captures; no captured JavaScript exceptions. Evidence: `build/f1-a-e2e/results-strict-zones.json`; inspected Rivergate image: `build/final-f1/rivergate-strict-routes.png`. Test suite expanded to 116 passing tests. Existing video predates these final route/cost changes and should not be treated as current evidence of those controls.

## One-click demand seed

Dispatch and Studio now expose Demo demand with a typed seed + Apply seed & fills and Next seed · new demand. Seed and deterministic fills apply atomically; typing alone does not mutate the city. Next wraps after 2147483647. Existing roads, zones, truck assignments and identity remain unchanged; the old plan invalidates and the operator replans. Active runs lock demand editing with an explicit reset instruction. This controls demand, not authored map geometry; the separate city generator seed still controls generated layouts.

117 tests passed, TypeScript production build and diff checks passed. New DOM regression verifies preserved city structure. An isolated actual browser check opened Briar, planned, advanced seed, saved, verified unchanged roads/zones/fleet and changed fills, then replanned and completed playback. No captured runtime exceptions. Screenshot `build/f1-a-e2e/seed-controls.png` visually inspected. All work remains uncommitted.
